"""Fast, modern web server for the Garmin Adaptive Coach UI."""

import os
import json
import re
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Dict, Any

from starlette.applications import Starlette
from starlette.responses import JSONResponse, FileResponse
from starlette.routing import Route, Mount
from starlette.staticfiles import StaticFiles
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware

from garmin_mcp import token_utils
from garminconnect import Garmin
from garmin_coach.profile import AthleteProfile
from garmin_coach.analyzer import CoachAnalyzer
from garmin_coach.planner import CoachPlanner
from garmin_coach.memory import CoachMemory
from garmin_coach.history_analyzer import analyze_long_term_history
from garmin_coach.temporal import get_temporal_context, format_relative_date_fr, parse_iso_or_local_date
from garmin_coach.web.web_search import search_sports_science
from garmin_coach.web.llm_client import CoachLLMClient
from garmin_coach.physiology import get_complete_physiological_state, get_daniels_paces
from garmin_coach.memory import get_active_memories, record_feedback, log_duo_session
from garmin_coach.rag.store import query_doctrine, get_doctrine_store
from garmin_coach.database.repository import DuoSynergyRepository, AthleteMemoryRepository
from garmin_coach.database.db import init_db

STATIC_DIR = Path(__file__).parent / "static"

# Cache client instance in memory
_garmin_clients: Dict[str, Garmin] = {}


def get_garmin(athlete_id: str = "louis") -> Garmin:
    """Returns an authenticated Garmin client for the specified athlete ('louis' or 'clara')."""
    global _garmin_clients
    clean_id = (athlete_id or "louis").strip().lower()
    if clean_id not in _garmin_clients:
        token_path = token_utils.get_athlete_token_path(clean_id)
        if not token_utils.token_exists(token_path):
            raise FileNotFoundError(f"Tokens Garmin introuvables pour {clean_id} dans {token_path}")
        client = Garmin()
        client.login(token_path)
        _garmin_clients[clean_id] = client
    return _garmin_clients[clean_id]


async def index(request):
    """Serve main single-page application."""
    index_file = STATIC_DIR / "index.html"
    return FileResponse(index_file)


async def api_status(request):
    """Returns general connection status and athlete profile (Louis, Clara, or Duo)."""
    try:
        athlete = request.query_params.get("athlete", "louis").strip().lower()
        if athlete == "duo":
            prof_louis = AthleteProfile.load("louis")
            prof_clara = AthleteProfile.load("clara")
            has_tokens_louis = token_utils.token_exists(token_utils.get_athlete_token_path("louis"))
            has_tokens_clara = token_utils.token_exists(token_utils.get_athlete_token_path("clara"))
            return JSONResponse({
                "status": "online",
                "athlete": "duo",
                "garmin_connected": has_tokens_louis,
                "both_connected": has_tokens_louis and has_tokens_clara,
                "athlete_name": "Louis & Clara",
                "primary_goal": "Préparation 10 km en Duo (Louis < 40' & Clara < 50')",
                "sports": ["running", "ultimate", "cycling"],
                "date": date.today().isoformat(),
                "louis": {
                    "name": prof_louis.name,
                    "goal": prof_louis.primary_goal,
                    "connected": has_tokens_louis,
                },
                "clara": {
                    "name": prof_clara.name,
                    "goal": prof_clara.primary_goal,
                    "connected": has_tokens_clara,
                },
            })

        profile = AthleteProfile.load(athlete)
        token_dir = token_utils.get_athlete_token_path(athlete)
        has_tokens = token_utils.token_exists(token_dir)
        return JSONResponse({
            "status": "online",
            "athlete": athlete,
            "garmin_connected": has_tokens,
            "athlete_name": profile.name,
            "primary_goal": profile.primary_goal,
            "sports": profile.primary_sports,
            "date": date.today().isoformat(),
        })
    except Exception as e:
        return JSONResponse({"status": "error", "error": str(e)}, status_code=500)


def _fetch_athlete_biometrics_raw(athlete_id: str, today: str) -> Dict[str, Any]:
    """Helper to fetch single-athlete biometrics safely without raising exceptions."""
    clean_id = (athlete_id or "louis").strip().lower()
    token_dir = token_utils.get_athlete_token_path(clean_id)
    if not token_utils.token_exists(token_dir):
        return {
            "athlete_id": clean_id,
            "date": today,
            "synced_today": False,
            "garmin_connected": False,
            "readiness_score": None,
            "readiness_level": "pending",
            "body_battery": None,
            "resting_hr": None,
            "avg_stress": None,
            "sleep_hours": None,
            "sleep_score": None,
            "summary_message": f"Compte Garmin de {clean_id.capitalize()} non connecté. Exécutez 'uv run garmin-coach --auth-{clean_id}' pour connecter sa montre.",
            "advice": [f"Authentifiez le compte Garmin de {clean_id.capitalize()} pour activer le suivi en direct."],
        }

    try:
        client = get_garmin(clean_id)
        summary = client.get_user_summary(today) or {}
        raw_readiness = client.get_training_readiness(today)
        readiness_score = None
        if isinstance(raw_readiness, list) and raw_readiness:
            readiness_score = raw_readiness[0].get("score")

        has_wellness = summary.get("includesWellnessData", False)
        bb_recent = summary.get("bodyBatteryMostRecentValue")
        bb_wake = summary.get("bodyBatteryAtWakeTime")
        rhr = summary.get("restingHeartRate")
        sleep_sec = summary.get("sleepingSeconds")
        stress_avg = summary.get("averageStressLevel")
        last_sync = summary.get("lastSyncTimestampGMT")

        synced_today = bool(has_wellness and (bb_recent is not None or bb_wake is not None or rhr is not None or sleep_sec is not None))

        if not synced_today:
            return {
                "athlete_id": clean_id,
                "date": today,
                "synced_today": False,
                "garmin_connected": True,
                "last_sync_gmt": last_sync,
                "readiness_score": None,
                "readiness_level": "pending",
                "body_battery": None,
                "resting_hr": None,
                "avg_stress": None,
                "sleep_hours": None,
                "sleep_score": None,
                "summary_message": f"En attente de synchronisation ce matin pour {clean_id.capitalize()}. Ouvrez Garmin Connect sur smartphone.",
                "advice": ["Synchronisez la montre pour charger le sommeil et la Body Battery réels."],
            }

        body_battery = bb_recent if bb_recent is not None else (bb_wake if bb_wake is not None else 50)
        resting_hr = rhr if rhr is not None else 58
        avg_stress = stress_avg if stress_avg is not None else 25
        sleeping_seconds = sleep_sec or 0
        sleep_hours = round(sleeping_seconds / 3600, 1) if sleeping_seconds > 0 else None

        if readiness_score is None:
            base = 65
            if body_battery >= 75: base += 15
            elif body_battery >= 60: base += 10
            elif body_battery < 50: base -= 5

            if avg_stress <= 25: base += 10
            elif avg_stress >= 35: base -= 5

            if sleep_hours is not None:
                if sleep_hours >= 7.5: base += 5
                elif sleep_hours < 6.0: base -= 10
            readiness_score = max(25, min(base, 95))

        level = "green" if readiness_score >= 65 else ("yellow" if readiness_score >= 45 else "red")
        profile = AthleteProfile.load(clean_id)
        analyzer = CoachAnalyzer(profile)
        assessment = analyzer.evaluate_readiness(readiness_data={"score": readiness_score})

        return {
            "athlete_id": clean_id,
            "date": today,
            "synced_today": True,
            "garmin_connected": True,
            "last_sync_gmt": last_sync,
            "readiness_score": readiness_score,
            "readiness_level": level,
            "body_battery": body_battery,
            "resting_hr": resting_hr,
            "avg_stress": avg_stress,
            "sleep_hours": sleep_hours,
            "sleep_score": 82 if sleep_hours and sleep_hours >= 7.0 else 65,
            "summary_message": assessment.summary_message,
            "advice": assessment.advice,
        }
    except Exception as e:
        return {
            "athlete_id": clean_id,
            "date": today,
            "synced_today": False,
            "garmin_connected": False,
            "readiness_score": None,
            "readiness_level": "pending",
            "body_battery": None,
            "resting_hr": None,
            "avg_stress": None,
            "sleep_hours": None,
            "sleep_score": None,
            "summary_message": f"Synchronisation Garmin {clean_id.capitalize()} en attente : {e}",
            "advice": ["Ouvrez l'application Garmin Connect pour synchroniser."],
        }


async def api_biometrics(request):
    """Fetches real-time biometric indicators from Garmin Connect (Louis, Clara, or Duo)."""
    today = date.today().isoformat()
    athlete = request.query_params.get("athlete", "louis").strip().lower()

    if athlete == "duo":
        bio_louis = _fetch_athlete_biometrics_raw("louis", today)
        bio_clara = _fetch_athlete_biometrics_raw("clara", today)
        return JSONResponse({
            "athlete": "duo",
            "date": today,
            "louis": bio_louis,
            "clara": bio_clara,
            "readiness_score": bio_louis.get("readiness_score"),
            "readiness_level": bio_louis.get("readiness_level", "pending"),
            "body_battery": bio_louis.get("body_battery"),
            "resting_hr": bio_louis.get("resting_hr"),
            "avg_stress": bio_louis.get("avg_stress"),
            "sleep_hours": bio_louis.get("sleep_hours"),
            "sleep_score": bio_louis.get("sleep_score"),
            "summary_message": f"Duo Louis & Clara : Louis ({bio_louis.get('summary_message', '')}) | Clara ({bio_clara.get('summary_message', '')})",
            "advice": (bio_louis.get("advice", []) + bio_clara.get("advice", []))[:3],
        })

    bio = _fetch_athlete_biometrics_raw(athlete, today)
    return JSONResponse(bio)


async def api_activities(request):
    """Fetches the most recent activities for the selected athlete (or combined for Duo)."""
    athlete = request.query_params.get("athlete", "duo").strip().lower()
    
    def _fetch_for_athlete(ath_id: str, limit: int = 5):
        clean_id = ath_id.strip().lower()
        token_dir = token_utils.get_athlete_token_path(clean_id)
        if not token_utils.token_exists(token_dir):
            return []
        try:
            client = get_garmin(clean_id)
            raw_acts = client.get_activities(0, limit) or []
            acts = []
            ath_label = "Louis" if clean_id == "louis" else "Clara"
            for a in raw_acts:
                duration_sec = a.get("duration", 0)
                dist_m = a.get("distance", 0)
                type_key = a.get("activityType", {}).get("typeKey", "workout")
                speed_kmh = round((dist_m / duration_sec) * 3.6, 1) if duration_sec > 0 else 0
                acts.append({
                    "id": a.get("activityId"),
                    "athlete_id": clean_id,
                    "athlete_name": ath_label,
                    "name": a.get("activityName", "Activité"),
                    "sport": type_key,
                    "date": a.get("startTimeLocal", "")[:10],
                    "time": a.get("startTimeLocal", "")[11:16],
                    "start_time_iso": a.get("startTimeLocal", ""),
                    "duration_minutes": round(duration_sec / 60, 1),
                    "distance_km": round(dist_m / 1000, 2),
                    "elevation_gain_m": round(a.get("elevationGain", 0)),
                    "avg_hr": a.get("averageHR"),
                    "speed_kmh": speed_kmh,
                    "aerobic_te": a.get("aerobicTrainingEffect"),
                    "anaerobic_te": a.get("anaerobicTrainingEffect"),
                })
            return acts
        except Exception:
            return []

    if athlete == "duo":
        acts_louis = _fetch_for_athlete("louis", 4)
        acts_clara = _fetch_for_athlete("clara", 4)
        combined = sorted(acts_louis + acts_clara, key=lambda x: x.get("start_time_iso", ""), reverse=True)
        return JSONResponse({"activities": combined[:6]})

    acts = _fetch_for_athlete(athlete, 6)
    return JSONResponse({"activities": acts})



async def api_weekly_plan(request):
    """Returns the weekly polarized schedule and goal progression (Louis, Clara, or Duo)."""
    athlete = request.query_params.get("athlete", "louis").strip().lower()
    offset_param = request.query_params.get("offset", "0")
    try:
        offset_weeks = int(offset_param)
    except ValueError:
        offset_weeks = 0

    client_louis = None
    client_clara = None
    try:
        client_louis = get_garmin("louis")
    except Exception:
        pass
    try:
        client_clara = get_garmin("clara")
    except Exception:
        pass

    # ACWR physiological fatigue
    acwr_data = {}
    try:
        from garmin_coach.physiology import calculate_acwr
        acwr_data = calculate_acwr()
    except Exception:
        pass

    if athlete == "duo":
        from garmin_coach.calendar_tracker import get_duo_weekly_calendar
        calendar_data = get_duo_weekly_calendar(
            louis_client=client_louis,
            clara_client=client_clara,
            offset_weeks=offset_weeks,
        )
        progression = {
            "goal_title": "Préparation 10 km en Duo (Louis < 40' & Clara < 50')",
            "target_deadline": "6 mois (18 Avril 2027)",
            "target_time": "Louis 39:59 | Clara 49:59",
            "target_pace": "Louis 3:59/km | Clara 4:59/km",
            "current_pr": "Louis 43:34 (Chinon) | Clara Première prépa 10k",
            "current_pace": "Louis 4:21/km | Clara 5:45/km Z2",
            "delta_seconds": 215,
            "delta_text": "Objectifs synchronisés",
            "progress_percent": 80,
            "weekly_hybrid": "Louis : 3 Ultimate + 2 Running | Clara : 4 Running (2 Duo)",
            "next_milestone": "Séance commune vendredi & Sortie longue dimanche",
        }
        return JSONResponse({
            "athlete": "Duo (Louis & Clara)",
            "athlete_id": "duo",
            "methodology": "Polarisé 80/20 & Entraînement en Couple",
            "coordination_notes": calendar_data.get("coordination_notes"),
            "progression": progression,
            "calendar": calendar_data,
            "days": calendar_data.get("days", []),
            "louis_days": calendar_data.get("louis_days", []),
            "clara_days": calendar_data.get("clara_days", []),
            "scorecard": calendar_data.get("scorecard", {}),
            "louis_scorecard": calendar_data.get("louis_scorecard", {}),
            "clara_scorecard": calendar_data.get("clara_scorecard", {}),
            "acwr": acwr_data,
            "week_title": calendar_data.get("week_title", ""),
            "is_current_week": calendar_data.get("is_current_week", True),
            "offset_weeks": offset_weeks,
            "today_iso": calendar_data.get("today_iso", ""),
        })

    # Single athlete (Louis or Clara)
    profile = AthleteProfile.load(athlete)
    client = client_clara if athlete == "clara" else client_louis
    from garmin_coach.calendar_tracker import get_real_weekly_calendar
    calendar_data = get_real_weekly_calendar(
        garmin_client=client,
        offset_weeks=offset_weeks,
        athlete_id=athlete,
    )

    if athlete == "clara":
        progression = {
            "goal_title": "Passer sous les 50 min au 10 km",
            "target_deadline": "6 mois (18 Avril 2027)",
            "target_time": "49:59",
            "target_pace": "4:59 min/km (12.0 km/h)",
            "current_pr": "Préparation premier 10 km officiel",
            "current_pace": "Allure Z2 cible : ~5:45-6:00 min/km",
            "delta_seconds": 0,
            "delta_text": "Cible Sub-50 min",
            "progress_percent": 75,
            "weekly_hybrid": "4 séances Running : 1 Clé VMA/Seuil + 2 Footings Z2 + 1 Sortie Longue",
            "next_milestone": "Palier 1 : Régularité 5:45/km sur 8 km",
        }
        methodology = "Polarisé 80/20 & Allure Spécifique 10k"
    else:
        try:
            long_term = analyze_long_term_history(client) if client else {}
            prs = long_term.get("personal_records", {})
        except Exception:
            prs = {"10k": "43:34"}

        progression = {
            "goal_title": "Passer sous les 40 min au 10 km",
            "target_deadline": "6 mois (Avril 2027)",
            "target_time": "39:59",
            "target_pace": "3:59 min/km (15.0 km/h)",
            "current_pr": prs.get("10k", "43:34 (12/04/2026 à Chinon)"),
            "current_pace": "4:21 min/km (13.8 km/h)",
            "delta_seconds": 215,
            "delta_text": "-3 min 35 s (-21 s / km)",
            "progress_percent": 80,
            "weekly_hybrid": "3 séances Ultimate + 2 séances Running clés",
            "next_milestone": "Palier 1 : 41:59 (4:12 min/km)",
        }
        methodology = "Polarisé 80/20 & Hybride Ultimate/Running"

    return JSONResponse({
        "athlete": profile.name,
        "athlete_id": athlete,
        "methodology": methodology,
        "progression": progression,
        "calendar": calendar_data,
        "days": calendar_data.get("days", []),
        "scorecard": calendar_data.get("scorecard", {}),
        "acwr": acwr_data,
        "week_title": calendar_data.get("week_title", ""),
        "is_current_week": calendar_data.get("is_current_week", True),
        "offset_weeks": offset_weeks,
        "today_iso": calendar_data.get("today_iso", ""),
    })


async def api_schedule_workout(request):
    """Schedules a workout directly onto Garmin Connect calendar for Louis or Clara."""
    try:
        body = await request.json()
        date_iso = body.get("date_iso")
        athlete_id = body.get("athlete_id", "louis").strip().lower()
        workout_name = body.get("workout_name", "Reprise Running Z2")
        duration = body.get("duration_minutes", 35)
        hr_min = body.get("hr_min")
        hr_max = body.get("hr_max")
        workout_structure = body.get("workout_structure")

        if not date_iso:
            return JSONResponse({"error": "Date manquante"}, status_code=400)

        client = get_garmin(athlete_id)
        from garmin_coach.calendar_tracker import schedule_workout_to_garmin
        res = schedule_workout_to_garmin(
            garmin_client=client,
            date_iso=date_iso,
            workout_name=workout_name,
            duration_minutes=duration,
            hr_min=hr_min,
            hr_max=hr_max,
            workout_structure=workout_structure,
        )
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_generate_plan(request):
    """Generates and stores the tailored 3-week progressive training plan."""
    try:
        from garmin_coach.calendar_tracker import generate_progressive_3week_plan
        plan = generate_progressive_3week_plan()
        return JSONResponse({"status": "success", "sessions_count": len(plan)})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_toggle_manual_completion(request):
    """Toggles manual completion for a session and optionally syncs it to Garmin Connect."""
    try:
        body = await request.json()
        date_iso = body.get("date_iso")
        athlete_id = body.get("athlete_id", "louis").strip().lower()
        sport = body.get("sport", "ultimate")
        completed = body.get("completed", True)
        note = body.get("note", "")
        duration_minutes = body.get("duration_minutes", 90)
        activity_name = body.get("activity_name", "")
        description = body.get("description", "")
        start_time = body.get("start_time", "19:30")
        push_to_garmin = body.get("push_to_garmin", True)

        if not date_iso:
            return JSONResponse({"error": "Date manquante"}, status_code=400)

        client = None
        try:
            client = get_garmin(athlete_id)
        except Exception:
            pass

        from garmin_coach.calendar_tracker import toggle_session_completion
        res = toggle_session_completion(
            date_iso=date_iso,
            sport=sport,
            completed=completed,
            duration_minutes=duration_minutes,
            activity_name=activity_name,
            description=description,
            start_time=start_time,
            push_to_garmin=push_to_garmin,
            garmin_client=client,
            note=note,
            athlete_id=athlete_id,
        )
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_chat(request):
    """Handles conversational interaction with the Coach with optional web search."""
    try:
        body = await request.json()
        message = body.get("message", "").strip()
        use_search = body.get("use_search", True)
        history = body.get("history", [])
        custom_model = body.get("model")
        athlete_context = body.get("athlete_context", "louis").strip().lower()

        if not message:
            return JSONResponse({"error": "Message vide"}, status_code=400)

        # 1. Initialize Memory and learn from incoming message
        memory = CoachMemory()
        learned_facts = memory.auto_learn_from_message(message, athlete_context=athlete_context)
        memory_summary = memory.get_memory_summary_for_prompt(athlete_context=athlete_context)

        # 1b. Check if user requests 3-week planning or cycle generation
        msg_lower = message.lower()
        plan_triggered = False
        if any(k in msg_lower for k in [
            "3 semaine", "trois semaine", "3 prochaines semaines", "trois prochaines semaines",
            "programme mes séance", "programme mes séances", "planifie mes séance", "planifie mes séances",
            "programme mes entraînement", "programme mes entraînements", "programme mes entrainement",
            "cycle 3", "prochaines semaines"
        ]):
            try:
                from garmin_coach.calendar_tracker import generate_progressive_3week_plan
                generate_progressive_3week_plan()
                plan_triggered = True
            except Exception as e_gen:
                print(f"Warning: could not auto-generate 3-week plan: {e_gen}")

        # 2. Fetch current biometrics context, recent activities and long-term history
        today = date.today().isoformat()
        profile = AthleteProfile.load("clara" if athlete_context == "clara" else "louis")
        activities_summary = []
        long_term_history = {}
        most_recent_activity_detailed = None
        most_recent_running_detailed = None

        try:
            target_athlete = "louis" if athlete_context in ("louis", "duo") else "clara"
            client = None
            try:
                client = get_garmin(target_athlete)
            except Exception:
                client = None

            summary = client.get_user_summary(today) or {} if client else {}
            raw_readiness = client.get_training_readiness(today) if client else None
            readiness_score = None
            if isinstance(raw_readiness, list) and raw_readiness:
                readiness_score = raw_readiness[0].get("score")
            
            has_wellness = summary.get("includesWellnessData", False)
            bb_recent = summary.get("bodyBatteryMostRecentValue")
            bb_wake = summary.get("bodyBatteryAtWakeTime")
            rhr = summary.get("restingHeartRate")
            sleep_sec = summary.get("sleepingSeconds")
            stress_avg = summary.get("averageStressLevel")
            last_sync_gmt = summary.get("lastSyncTimestampGMT")

            synced_today = bool(has_wellness and (bb_recent is not None or bb_wake is not None or rhr is not None or sleep_sec is not None))

            if synced_today:
                body_battery = bb_recent if bb_recent is not None else (bb_wake if bb_wake is not None else 50)
                resting_hr = rhr if rhr is not None else 58
                avg_stress = stress_avg if stress_avg is not None else 25
                sleeping_seconds = sleep_sec or 0
                sleep_hours = round(sleeping_seconds / 3600, 1) if sleeping_seconds > 0 else None

                if readiness_score is None:
                    base = 65
                    if body_battery >= 75: base += 15
                    elif body_battery >= 60: base += 10
                    elif body_battery < 50: base -= 5

                    if avg_stress <= 25: base += 10
                    elif avg_stress >= 35: base -= 5

                    if sleep_hours is not None:
                        if sleep_hours >= 7.5: base += 5
                        elif sleep_hours < 6.0: base -= 10
                    readiness_score = max(25, min(base, 95))

                level_str = "Optimal (Feu Vert)" if readiness_score >= 65 else ("Partielle (Feu Jaune)" if readiness_score >= 45 else "Alerte Repos (Feu Rouge)")
            else:
                body_battery = None
                resting_hr = None
                avg_stress = None
                sleep_hours = None
                readiness_score = None
                level_str = "Non synchronisé ce matin"

            if athlete_context == "duo":
                from garmin_coach.calendar_tracker import get_duo_weekly_calendar
                client_clara = None
                try:
                    client_clara = get_garmin("clara")
                except Exception:
                    pass
                calendar_data = get_duo_weekly_calendar(louis_client=client, clara_client=client_clara, offset_weeks=0)
            else:
                from garmin_coach.calendar_tracker import get_real_weekly_calendar
                calendar_data = get_real_weekly_calendar(garmin_client=client, offset_weeks=0, memory=memory, athlete_id=athlete_context)

            weekly_plan = calendar_data.get("days", [])
            temporal_ctx = get_temporal_context(weekly_template=weekly_plan)

            if client:
                raw_acts = client.get_activities(0, 6) or []
                for a in raw_acts:
                    dur_m = round(a.get("duration", 0) / 60, 1)
                    dist_k = round(a.get("distance", 0) / 1000, 2)
                    raw_date = a.get("startTimeLocal", "")[:10]
                    d_obj = parse_iso_or_local_date(raw_date)
                    date_display = format_relative_date_fr(d_obj) if d_obj else raw_date
                    activities_summary.append({
                        "id": a.get("activityId"),
                        "date": date_display,
                        "raw_date": raw_date,
                        "name": a.get("activityName"),
                        "sport": a.get("activityType", {}).get("typeKey"),
                        "duration_min": dur_m,
                        "distance_km": dist_k,
                        "avg_hr": a.get("averageHR"),
                        "max_hr": a.get("maxHR"),
                    })
                
                # Fetch lifetime analyzed profile
                long_term_history = analyze_long_term_history(client)
                pr_10k_detailed = long_term_history.get("running_profile", {}).get("pr_10k_detailed")
                
                # Fetch both absolute most recent activity AND most recent running activity
                from garmin_coach.activity_details import get_detailed_activity
                if raw_acts and raw_acts[0].get("activityId"):
                    try:
                        most_recent_activity_detailed = get_detailed_activity(client, raw_acts[0]["activityId"])
                    except Exception as e_act:
                        print(f"Warning: could not fetch most recent activity detail: {e_act}")

                latest_run = next((a for a in raw_acts if a.get("activityType", {}).get("typeKey") == "running"), None)
                if latest_run and latest_run.get("activityId"):
                    if most_recent_activity_detailed and str(most_recent_activity_detailed.get("id")) == str(latest_run["activityId"]):
                        most_recent_running_detailed = most_recent_activity_detailed
                    else:
                        try:
                            most_recent_running_detailed = get_detailed_activity(client, latest_run["activityId"])
                        except Exception as e_run:
                            print(f"Warning: could not fetch latest run detail: {e_run}")
            else:
                pr_10k_detailed = None

            biometric_context = {
                "athlete_context": athlete_context,
                "synced_today": synced_today,
                "last_sync_gmt": last_sync_gmt,
                "readiness_score": readiness_score,
                "readiness_level": level_str,
                "sleep_score": 82 if sleep_hours and sleep_hours >= 7.0 else (65 if sleep_hours else None),
                "sleep_duration_hours": sleep_hours,
                "body_battery": body_battery,
                "resting_hr": resting_hr,
                "avg_stress": avg_stress,
                "primary_goal": profile.primary_goal,
                "recent_activities": activities_summary,
                "memory_summary": memory_summary,
                "long_term_history": long_term_history,
                "pr_10k_detailed": pr_10k_detailed,
                "most_recent_activity_detailed": most_recent_activity_detailed,
                "most_recent_running_detailed": most_recent_running_detailed,
                "calendar_data": calendar_data,
                "weekly_plan": weekly_plan,
                "temporal_context": temporal_ctx,
            }
        except Exception as e:
            print(f"Warning building chat biometric context: {e}")
            from garmin_coach.calendar_tracker import get_real_weekly_calendar
            calendar_data = get_real_weekly_calendar(garmin_client=None, offset_weeks=0, memory=memory)
            weekly_plan = calendar_data.get("days", [])
            temporal_ctx = get_temporal_context(weekly_template=weekly_plan)
            try:
                from garmin_coach.activity_details import get_detailed_activity
                pr_10k_detailed = get_detailed_activity(None, 22496284245)
            except Exception:
                pr_10k_detailed = None

            biometric_context = {
                "synced_today": False,
                "last_sync_gmt": None,
                "readiness_score": None,
                "readiness_level": "En attente de synchronisation",
                "sleep_score": None,
                "sleep_duration_hours": None,
                "body_battery": None,
                "resting_hr": None,
                "avg_stress": None,
                "primary_goal": profile.primary_goal,
                "recent_activities": activities_summary,
                "memory_summary": memory_summary,
                "long_term_history": long_term_history,
                "pr_10k_detailed": pr_10k_detailed,
                "most_recent_activity_detailed": most_recent_activity_detailed,
                "most_recent_running_detailed": most_recent_running_detailed,
                "calendar_data": calendar_data,
                "weekly_plan": weekly_plan,
                "temporal_context": temporal_ctx,
            }

        biometric_context["three_week_plan_generated"] = plan_triggered

        # === ÉTAPE 1 : Calcul Physiologique Déterministe (Python pur) ===
        target_ath_id = "clara" if athlete_context == "clara" else "louis"
        try:
            physio_state = get_complete_physiological_state(target_ath_id)
            biometric_context["physiological_state"] = physio_state.model_dump()
        except Exception as e_phys:
            print(f"Warning computing deterministic physiological state: {e_phys}")
            biometric_context["physiological_state"] = {}

        # === ÉTAPE 2 : Contexte Mémoire Épisodique (SQLite) ===
        try:
            active_mems = get_active_memories(target_ath_id)
            biometric_context["active_memories"] = active_mems
        except Exception as e_mem:
            print(f"Warning fetching active memories: {e_mem}")
            biometric_context["active_memories"] = []

        # === ÉTAPE 3 : Doctrine RAG Ciblée (ChromaDB local) ===
        try:
            msg_low = message.lower()
            phys_data = biometric_context.get("physiological_state", {})
            hrv_data = phys_data.get("hrv_baseline", {})
            load_data = phys_data.get("load_metrics", {})
            
            queries = []
            if hrv_data.get("suppress_intensity") or any(w in msg_low for w in ["vfc", "hrv", "baisse", "fatigue", "tsb"]):
                queries.append(("protocole baisse VFC récupération suppression intensité seuil Stephen Seiler", "hrv"))
            if athlete_context == "duo" or any(w in msg_low for w in ["duo", "couple", "clara", "louis", "partag"]):
                queries.append(("synchronisation allures seuil et footing couple croisement allures duo", "duo"))
            if any(w in msg_low for w in ["seiler", "80/20", "polarisation", "zone 2"]):
                queries.append(("modèle polarisé 80/20 Stephen Seiler zone 2 et intensité", "polarization"))
            if load_data.get("acwr", 1.0) >= 1.4 or any(w in msg_low for w in ["volume", "daniels", "acwr", "charge", "seuil"]):
                queries.append(("répartition volume entraînement Jack Daniels seuil et fractionné", "volume"))

            collected_rules = []
            seen_titles = set()
            if queries:
                for q_text, q_topic in queries:
                    res = query_doctrine(q_text, topic=q_topic, n_results=2)
                    for d in res:
                        t = d.get("title")
                        if t and t not in seen_titles:
                            seen_titles.add(t)
                            collected_rules.append({"title": t, "topic": d.get("topic"), "content": d.get("content")})
            else:
                res = query_doctrine(message, n_results=2)
                for d in res:
                    collected_rules.append({"title": d.get("title"), "topic": d.get("topic"), "content": d.get("content")})

            biometric_context["doctrine_rules"] = collected_rules[:4]
        except Exception as e_rag:
            print(f"Warning querying doctrine RAG: {e_rag}")
            biometric_context["doctrine_rules"] = []

        # 3. Web search if question requires science or user enabled it
        search_results = []
        if use_search:
            search_results = search_sports_science(message, max_results=3)

        # 4. Call LLM Client (LiteLLM / vLLM / Fallback)
        llm = CoachLLMClient(model=custom_model)
        result = llm.generate_coach_response(
            user_message=message,
            biometric_context=biometric_context,
            web_search_results=search_results,
            chat_history=history,
        )

        # 4b. Extract and process LLM-driven MEMORY_UPDATE tags
        llm_content = result.get("content", "")
        if "<!-- MEMORY_UPDATE:" in llm_content:
            try:
                mem_match = re.search(r'<!--\s*MEMORY_UPDATE:\s*(\[.*?\])\s*-->', llm_content, re.DOTALL)
                if mem_match:
                    updates = json.loads(mem_match.group(1))
                    for upd in updates:
                        action = upd.get("action", "add")
                        cat = upd.get("category", "preferences")
                        fact_text = upd.get("fact", "").strip()
                        athlete_target = upd.get("athlete", athlete_context)
                        if action == "clear_injuries":
                            memory.clear_category("injuries_and_sensitivities")
                            record_feedback(athlete_target, "plus mal, guérison déclarée")
                            learned_facts.append(f"🩺 Douleurs retirées de la mémoire active ({athlete_target}).")
                        elif action == "add" and fact_text:
                            athlete_prefix = f"[{athlete_target.capitalize()}] " if not fact_text.startswith("[") else ""
                            final_fact = f"{athlete_prefix}{fact_text}"
                            memory.add_fact(cat, final_fact, athlete=athlete_target)
                            record_feedback(athlete_target, fact_text)
                            learned_facts.append(f"🧠 Mémorisé par le coach ({cat}) : {final_fact}")
                    # Clean the tag from the final response content so the user does not see internal tags
                    result["content"] = re.sub(r'<!--\s*MEMORY_UPDATE:\s*\[.*?\]\s*-->', '', llm_content, flags=re.DOTALL).strip()
            except Exception as e_mem:
                print(f"Memory update extraction note: {e_mem}")

        result["learned_facts"] = learned_facts

        # 5. Persistent Chat Logging for debugging and athlete history
        try:
            log_entry = {
                "timestamp": date.today().isoformat(),
                "user_message": message,
                "learned_facts": learned_facts,
                "coach_source": result.get("source"),
                "coach_model": result.get("model"),
                "coach_response": result.get("content"),
            }
            log_file = Path(__file__).resolve().parents[3] / "data" / "chat_logs.jsonl"
            log_file.parent.mkdir(parents=True, exist_ok=True)
            with open(log_file, "a", encoding="utf-8") as lf:
                lf.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            print(f"\n💬 CHAT USER: {message}\n🤖 COACH ({result.get('model')}): {result.get('content')[:120]}...\n")
        except Exception as log_err:
            print(f"Log save warning: {log_err}")

        return JSONResponse(result)

    except Exception as e:
        print(f"Chat error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_memory(request):
    """Returns persistent athlete memory."""
    memory = CoachMemory()
    return JSONResponse(memory.data)


async def api_history_profile(request):
    """Returns long-term historical statistics."""
    try:
        client = get_garmin()
        profile = analyze_long_term_history(client)
        return JSONResponse(profile)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_add_fact(request):
    """Manually adds a fact to athlete memory."""
    try:
        body = await request.json()
        category = body.get("category", "preferences")
        fact = body.get("fact", "").strip()
        if not fact:
            return JSONResponse({"error": "Fait vide"}, status_code=400)
        memory = CoachMemory()
        memory.add_fact(category, fact)
        return JSONResponse({"status": "success", "memory": memory.data})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_remove_fact(request):
    """Removes a fact from athlete memory."""
    try:
        body = await request.json()
        category = body.get("category", "")
        fact = body.get("fact", "").strip()
        memory = CoachMemory()
        removed = memory.remove_fact(category, fact)
        return JSONResponse({"status": "success", "removed": removed, "memory": memory.data})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_reset_memory(request):
    """Completely resets athlete memory to a neutral baseline."""
    try:
        memory = CoachMemory()
        memory.reset()
        return JSONResponse({
            "status": "success",
            "message": "Mémoire réinitialisée avec succès à l'état neutre.",
            "memory": memory.data,
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_activity_detail(request):
    """Fetches full granular activity data including splits, HR zones, and biomechanics."""
    try:
        activity_id = request.path_params.get("activity_id")
        if not activity_id:
            return JSONResponse({"error": "ID d'activité manquant"}, status_code=400)
        client = get_garmin()
        from garmin_coach.activity_details import get_detailed_activity
        data = get_detailed_activity(client, activity_id)
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_physiology_acwr(request):
    """Returns Banister ACWR workload ratio, HRV drift baseline, and deterministic state."""
    try:
        athlete_id = request.query_params.get("athlete", "louis").strip().lower()
        state = get_complete_physiological_state(athlete_id)
        return JSONResponse(state.model_dump())
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_physiology_vdot(request):
    """Returns Jack Daniels VDOT scores and calibrated training paces."""
    try:
        louis_paces = get_daniels_paces("louis")
        clara_paces = get_daniels_paces("clara")
        return JSONResponse({
            "louis": louis_paces.model_dump(),
            "clara": clara_paces.model_dump(),
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_episodic_memories(request):
    """GET active non-expired memories or POST to record new feedback."""
    try:
        if request.method == "POST":
            body = await request.json()
            ath_id = body.get("athlete_id", "louis")
            raw_text = body.get("raw_text", "")
            if not raw_text:
                return JSONResponse({"error": "raw_text requis"}, status_code=400)
            res = record_feedback(ath_id, raw_text)
            return JSONResponse(res)
        else:
            athlete_id = request.query_params.get("athlete", "louis").strip().lower()
            mems = get_active_memories(athlete_id)
            return JSONResponse({"athlete_id": athlete_id, "memories": mems})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_duo_synergy(request):
    """GET recent duo synergy logs or POST to log a shared workout debrief."""
    try:
        if request.method == "POST":
            body = await request.json()
            new_id = log_duo_session(body)
            return JSONResponse({"status": "success", "id": new_id})
        else:
            limit = int(request.query_params.get("limit", 10))
            logs = DuoSynergyRepository.get_recent(limit)
            return JSONResponse({"logs": logs})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_coaching_adaptations(request):
    """Returns today's proposed coaching adaptations if fatigue is high."""
    try:
        from datetime import date
        today_iso = date.today().isoformat()
        from garmin_coach.adaptation import evaluate_daily_adaptation
        from garmin_coach.database.repository import WorkoutRepository
        
        athlete_id = request.query_params.get("athlete", "louis").strip().lower()
        state = get_complete_physiological_state(athlete_id)
        plan = WorkoutRepository.get_all(athlete_id)
        today_session = plan.get(today_iso)

        readiness = 70
        body_battery = 70
        try:
            client = get_garmin(athlete_id)
            summary = client.get_user_summary(today_iso) or {}
            raw_readiness = client.get_training_readiness(today_iso)
            readiness = raw_readiness[0].get("score", 70) if isinstance(raw_readiness, list) and raw_readiness else 70
            body_battery = summary.get("bodyBatteryMostRecentValue") or summary.get("bodyBatteryAtWakeTime") or 70
        except Exception:
            pass

        proposal = evaluate_daily_adaptation(
            today_iso=today_iso,
            readiness_score=readiness,
            body_battery=body_battery,
            acwr_data=state.load_metrics.model_dump(),
            planned_session=today_session,
            hrv_analysis=state.hrv_baseline.model_dump(),
            athlete_id=athlete_id,
        )
        return JSONResponse({"adaptation": proposal})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_apply_adaptation(request):
    """Applies an adaptation to the schedule and Garmin watch."""
    try:
        body = await request.json()
        adaptation_id = body.get("adaptation_id")
        if not adaptation_id:
            return JSONResponse({"error": "ID d'adaptation manquant"}, status_code=400)
        client = None
        try:
            client = get_garmin()
        except Exception:
            pass
        from garmin_coach.adaptation import apply_adaptation
        res = apply_adaptation(adaptation_id, garmin_client=client)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_dismiss_adaptation(request):
    """Dismisses an adaptation proposal."""
    try:
        body = await request.json()
        adaptation_id = body.get("adaptation_id")
        if not adaptation_id:
            return JSONResponse({"error": "ID d'adaptation manquant"}, status_code=400)
        from garmin_coach.adaptation import dismiss_adaptation
        res = dismiss_adaptation(adaptation_id)
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


async def api_test_briefing(request):
    """Generates and previews or sends the morning briefing."""
    try:
        from garmin_coach.notifications.briefing import send_telegram_briefing
        res = send_telegram_briefing()
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


routes = [
    Route("/", endpoint=index, methods=["GET"]),
    Route("/api/status", endpoint=api_status, methods=["GET"]),
    Route("/api/biometrics", endpoint=api_biometrics, methods=["GET"]),
    Route("/api/activities", endpoint=api_activities, methods=["GET"]),
    Route("/api/activity/{activity_id}", endpoint=api_activity_detail, methods=["GET"]),
    Route("/api/weekly-plan", endpoint=api_weekly_plan, methods=["GET"]),
    Route("/api/physiology/acwr", endpoint=api_physiology_acwr, methods=["GET"]),
    Route("/api/physiology/vdot", endpoint=api_physiology_vdot, methods=["GET"]),
    Route("/api/memories/active", endpoint=api_episodic_memories, methods=["GET", "POST"]),
    Route("/api/duo/synergy", endpoint=api_duo_synergy, methods=["GET", "POST"]),
    Route("/api/coaching/adaptations", endpoint=api_coaching_adaptations, methods=["GET"]),
    Route("/api/coaching/adaptations/apply", endpoint=api_apply_adaptation, methods=["POST"]),
    Route("/api/coaching/adaptations/dismiss", endpoint=api_dismiss_adaptation, methods=["POST"]),
    Route("/api/notifications/test-briefing", endpoint=api_test_briefing, methods=["POST"]),
    Route("/api/calendar/schedule", endpoint=api_schedule_workout, methods=["POST"]),
    Route("/api/calendar/generate-plan", endpoint=api_generate_plan, methods=["POST"]),
    Route("/api/calendar/manual-toggle", endpoint=api_toggle_manual_completion, methods=["POST"]),
    Route("/api/chat", endpoint=api_chat, methods=["POST"]),
    Route("/api/memory", endpoint=api_memory, methods=["GET"]),
    Route("/api/memory/fact", endpoint=api_add_fact, methods=["POST"]),
    Route("/api/memory/fact/remove", endpoint=api_remove_fact, methods=["POST"]),
    Route("/api/memory/reset", endpoint=api_reset_memory, methods=["POST"]),
    Route("/api/history", endpoint=api_history_profile, methods=["GET"]),
    Mount("/static", app=StaticFiles(directory=STATIC_DIR), name="static"),
]

middleware = [
    Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]),
]


@asynccontextmanager
async def lifespan(app: Starlette):
    """Initializes SQLite schema, performs migrations, and indexes RAG doctrine on startup."""
    print("\n📦 Initialisation du système Garmin Coach au démarrage...")
    init_db()
    store = get_doctrine_store()
    print(f"📚 RAG Doctrine opérationnel : {store.collection.count()} fiches expertes prêtes dans ChromaDB.\n")
    yield


app = Starlette(routes=routes, middleware=middleware, lifespan=lifespan)


def run_web(host: str = "127.0.0.1", port: int = 5050):
    import uvicorn
    print(f"\n🚀 Lancement de l'interface Garmin Coach sur http://{host}:{port}\n")
    uvicorn.run("garmin_coach.web.app:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    run_web()
