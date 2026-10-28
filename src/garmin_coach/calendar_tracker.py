"""Dynamic Weekly Planning and Execution Tracking Engine.

Connects planned training sessions with:
- Exact calendar dates (Monday to Sunday)
- Real Garmin Connect recorded activities (matching actual vs. planned)
- Garmin Connect scheduled workouts (calendar sync)
- Manual completion tracking for sports not tracked via watch (Ultimate Frisbee)
"""

import json
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from garmin_coach.temporal import (
    JOURS_FR,
    MOIS_FR,
    format_full_date_fr,
    parse_iso_or_local_date,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
MANUAL_COMPLETIONS_FILE = DATA_DIR / "manual_completions.json"
CUSTOM_PLAN_FILE = DATA_DIR / "custom_training_plan.json"

_ACTIVITIES_CACHE: Dict[str, Tuple[float, List[Any]]] = {}
CACHE_TTL_SECONDS = 90.0


def load_manual_completions(athlete_id: str = "louis") -> Dict[str, Any]:
    """Loads manually checked-off sessions from SQLite with JSON fallback."""
    clean_id = (athlete_id or "louis").strip().lower()
    try:
        from garmin_coach.database import ManualCompletionRepository
        records = ManualCompletionRepository.get_all(clean_id)
        if records:
            return records
    except Exception as e:
        print(f"Warning: could not load manual completions from SQLite for {clean_id}: {e}")
    if clean_id == "louis" and MANUAL_COMPLETIONS_FILE.exists():
        try:
            with open(MANUAL_COMPLETIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_manual_completions(data: Dict[str, Any], athlete_id: str = "louis") -> None:
    """Saves manually checked-off sessions to SQLite and backup JSON."""
    clean_id = (athlete_id or "louis").strip().lower()
    try:
        from garmin_coach.database import ManualCompletionRepository
        for date_iso, record in data.items():
            ManualCompletionRepository.save(date_iso, record, clean_id)
    except Exception as e:
        print(f"Warning: could not save manual completions to SQLite for {clean_id}: {e}")
    if clean_id == "louis":
        try:
            MANUAL_COMPLETIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(MANUAL_COMPLETIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass


def load_custom_plan(athlete_id: str = "louis") -> Dict[str, Any]:
    """Loads specific custom training sessions planned for specific dates from SQLite with JSON fallback."""
    clean_id = (athlete_id or "louis").strip().lower()
    try:
        from garmin_coach.database import WorkoutRepository
        workouts = WorkoutRepository.get_all(clean_id)
        if workouts:
            return workouts
    except Exception as e:
        print(f"Warning: could not load custom plan from SQLite for {clean_id}: {e}")
    if clean_id == "louis" and CUSTOM_PLAN_FILE.exists():
        try:
            with open(CUSTOM_PLAN_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_custom_plan(plan: Dict[str, Any], athlete_id: str = "louis") -> None:
    """Saves custom multi-week training plan to SQLite and backup JSON."""
    clean_id = (athlete_id or "louis").strip().lower()
    try:
        from garmin_coach.database import WorkoutRepository
        WorkoutRepository.save_plan(plan, clean_id)
    except Exception as e:
        print(f"Warning: could not save custom plan to SQLite for {clean_id}: {e}")
    if clean_id == "louis":
        try:
            CUSTOM_PLAN_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(CUSTOM_PLAN_FILE, "w", encoding="utf-8") as f:
                json.dump(plan, f, indent=2, ensure_ascii=False)
        except Exception:
            pass


def generate_progressive_3week_plan(ref_date: Optional[date] = None) -> Dict[str, Any]:
    """Generates a tailored 3-week progressive cycle towards Sub-40 10km."""
    today = ref_date or date.today()
    monday = today - timedelta(days=today.weekday())

    plan: Dict[str, Any] = {}

    w1_dates = [monday + timedelta(days=i) for i in range(7)]
    w2_dates = [monday + timedelta(days=7 + i) for i in range(7)]
    w3_dates = [monday + timedelta(days=14 + i) for i in range(7)]

    # === Semaine 1 (Semaine 43) : Réadaptation tendineuse & Zone 2 ===
    plan[w1_dates[0].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Anaérobie / Sprints",
        "focus": "Filière lactique, changements de direction et vitesse de réaction", "is_key": False
    }
    plan[w1_dates[1].isoformat()] = {
        "sport": "running", "sport_icon": "🏃‍♂️", "type": "Reprise Running Z2 (35 min)",
        "duration": "35 min", "intensity": "Zone 2 stricte (126-145 bpm)",
        "focus": "Habituation tendineuse et articulaire, foulée économique et souple", "is_key": True,
        "workout_structure": {
            "type": "continuous", "workout_name": "Reprise Running Z2 35min", "duration_minutes": 35,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 126, "hr_max": 145
        }
    }
    plan[w1_dates[2].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Jeu & Vitesse",
        "focus": "Sprints courts et puissance intermittente", "is_key": False
    }
    plan[w1_dates[3].isoformat()] = {
        "sport": "cycling", "sport_icon": "🚴", "type": "Décrassage vélo doux Z1",
        "duration": "35 min", "intensity": "Zone 1 (< 125 bpm)",
        "focus": "Drainage musculaire sans choc mécanique, faire tourner les jambes", "is_key": False
    }
    plan[w1_dates[4].isoformat()] = {
        "sport": "running", "sport_icon": "🏃‍♂️", "type": "Footing Z2 (35 min) + Lignes droites",
        "duration": "35 min", "intensity": "Zone 2 (126-145 bpm)",
        "focus": "30 min Z2 + 4 accélérations progressives 80m pour la posture", "is_key": True,
        "workout_structure": {
            "type": "continuous", "workout_name": "Footing Z2 35min & Lignes droites", "duration_minutes": 35,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 126, "hr_max": 145
        }
    }
    plan[w1_dates[5].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Match / Club)",
        "duration": "90 min", "intensity": "Haute intensité",
        "focus": "Opposition tactique et endurance de match", "is_key": False
    }
    plan[w1_dates[6].isoformat()] = {
        "sport": "recovery", "sport_icon": "🧘", "type": "Repos complet & Régénération",
        "duration": "Journée off", "intensity": "Repos total",
        "focus": "Sommeil, hydratation, régénération nerveuse", "is_key": False
    }

    # === Semaine 2 (Semaine 44) : Développement aérobie & Premières intensités ===
    plan[w2_dates[0].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Anaérobie / Sprints",
        "focus": "Filière lactique et replacements défensifs", "is_key": False
    }
    plan[w2_dates[1].isoformat()] = {
        "sport": "running", "sport_icon": "🏃‍♂️", "type": "Footing Z2 (45 min) + 5 accélérations",
        "duration": "45 min", "intensity": "Zone 2 (126-145 bpm)",
        "focus": "Augmentation de la durée aérobie, relâchement des épaules et foulée dynamique", "is_key": True,
        "workout_structure": {
            "type": "continuous", "workout_name": "Footing Z2 45min", "duration_minutes": 45,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 126, "hr_max": 145
        }
    }
    plan[w2_dates[2].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Jeu & Intensité",
        "focus": "Efforts intermittents et travail de handlers", "is_key": False
    }
    plan[w2_dates[3].isoformat()] = {
        "sport": "cycling", "sport_icon": "🚴", "type": "Sortie Vélo aérobie Z2",
        "duration": "45 min", "intensity": "Zone 2 (120-135 bpm)",
        "focus": "Endurance cardiovasculaire sans impact au sol", "is_key": False
    }
    plan[w2_dates[4].isoformat()] = {
        "sport": "running", "sport_icon": "⚡", "type": "Fractionné Court VMA : 8 x 1 min (allure 4:00)",
        "duration": "45 min", "intensity": "Zone 4-5 (165-178 bpm)",
        "focus": "Échauffement 15 min + 8 x [1 min rapide / 1 min trot récup] + 10 min retour au calme", "is_key": True,
        "workout_structure": {
            "type": "intervals", "workout_name": "Fractionné Court 8x1min (Allure 4:00)", "repeats": 8,
            "rep_seconds": 60, "recovery_seconds": 60, "warmup_min": 15, "cooldown_min": 10,
            "hr_zone": "Z4", "hr_min": 165, "hr_max": 178
        }
    }
    plan[w2_dates[5].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Match & Tactique",
        "focus": "Jeu collectif et puissance", "is_key": False
    }
    plan[w2_dates[6].isoformat()] = {
        "sport": "recovery", "sport_icon": "🧘", "type": "Repos complet & Récupération",
        "duration": "Journée off", "intensity": "Repos total",
        "focus": "Régénération musculaire", "is_key": False
    }

    # === Semaine 3 (Semaine 45) : Spécifique Seuil Sub-40 & Volume ===
    plan[w3_dates[0].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Anaérobie / Sprints",
        "focus": "Filière lactique et réactivité", "is_key": False
    }
    plan[w3_dates[1].isoformat()] = {
        "sport": "running", "sport_icon": "⚡", "type": "Séance Clé Seuil : 4 x 1000m à 4:00/km",
        "duration": "55 min", "intensity": "Zone 4 (168-180 bpm)",
        "focus": "Échauffement 15 min + 4 x [1000m à 4:00 min/km (r=1'45 trot)] + 10 min retour au calme", "is_key": True,
        "workout_structure": {
            "type": "intervals", "workout_name": "Seuil Sub-40 4x1000m (4:00/km)", "repeats": 4,
            "rep_seconds": 240, "recovery_seconds": 105, "warmup_min": 15, "cooldown_min": 10,
            "hr_zone": "Z4", "hr_min": 168, "hr_max": 180
        }
    }
    plan[w3_dates[2].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Club)",
        "duration": "90 min", "intensity": "Jeu & Intensité",
        "focus": "Sprints courts et changements de direction", "is_key": False
    }
    plan[w3_dates[3].isoformat()] = {
        "sport": "cycling", "sport_icon": "🚴", "type": "Décrassage Vélo Z1",
        "duration": "40 min", "intensity": "Zone 1 (< 125 bpm)",
        "focus": "Drainage après le seuil de mardi", "is_key": False
    }
    plan[w3_dates[4].isoformat()] = {
        "sport": "running", "sport_icon": "🏃‍♂️", "type": "Sortie Fondamentale Z2 (50 min)",
        "duration": "50 min", "intensity": "Zone 2 (126-145 bpm)",
        "focus": "Endurance pure, allure aisée 5:15-5:30/km", "is_key": True,
        "workout_structure": {
            "type": "continuous", "workout_name": "Sortie Fondamentale Z2 50min", "duration_minutes": 50,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 126, "hr_max": 145
        }
    }
    plan[w3_dates[5].isoformat()] = {
        "sport": "ultimate", "sport_icon": "🥏", "type": "Ultimate Frisbee (Match)",
        "duration": "90-120 min", "intensity": "Haute intensité",
        "focus": "Compétition de club", "is_key": False
    }
    plan[w3_dates[6].isoformat()] = {
        "sport": "recovery", "sport_icon": "🧘", "type": "Repos complet & Bilan de cycle",
        "duration": "Journée off", "intensity": "Repos total",
        "focus": "Bilan des 3 semaines et assimilation de la charge", "is_key": False
    }

    save_custom_plan(plan)
    return plan


def toggle_session_completion(
    date_iso: str,
    sport: str = "ultimate",
    completed: bool = True,
    duration_minutes: int = 90,
    activity_name: str = "",
    description: str = "",
    start_time: str = "19:30",
    push_to_garmin: bool = True,
    garmin_client=None,
    note: str = "",
    athlete_id: str = "louis",
) -> Dict[str, Any]:
    """Toggles completion state for a session, and optionally syncs it as a real manual activity to Garmin Connect."""
    clean_id = (athlete_id or "louis").strip().lower()
    records = load_manual_completions(clean_id)

    garmin_activity_id = None
    garmin_synced = False
    error_message = None

    if completed:
        final_desc = description.strip() or note.strip()
        final_name = activity_name.strip() or ("Entraînement Ultimate Frisbee (Club)" if "ultimate" in sport.lower() else "Activité sportive")
        dur_min = int(duration_minutes) if duration_minutes else 90

        if push_to_garmin and garmin_client:
            try:
                # Map sport to official Garmin typeKey (ultimate_disc is Garmin's official key)
                type_key = "ultimate_disc" if "ultimate" in sport.lower() else ("running" if "run" in sport.lower() else ("cycling" if "cycl" in sport.lower() or "velo" in sport.lower() else "other"))
                start_dt = f"{date_iso}T{start_time or '19:30'}:00.000"

                res = garmin_client.create_manual_activity(
                    start_datetime=start_dt,
                    time_zone="Europe/Paris",
                    type_key=type_key,
                    distance_km=0.0,
                    duration_min=dur_min,
                    activity_name=final_name,
                )

                if isinstance(res, dict):
                    garmin_activity_id = res.get("activityId") or (res.get("activity") or {}).get("activityId")

                if garmin_activity_id and final_desc:
                    try:
                        url = f"{garmin_client.garmin_connect_activity}/{garmin_activity_id}"
                        garmin_client.client.put("connectapi", url, json={"activityId": int(garmin_activity_id), "description": final_desc}, api=True)
                    except Exception as e_desc:
                        print(f"Warning: could not set activity description on Garmin: {e_desc}")

                garmin_synced = bool(garmin_activity_id)
                _ACTIVITIES_CACHE.clear()
            except Exception as e_garmin:
                print(f"Warning: could not push manual activity to Garmin: {e_garmin}")
                error_message = str(e_garmin)

        records[date_iso] = {
            "completed": True,
            "sport": sport,
            "duration_minutes": dur_min,
            "activity_name": final_name,
            "note": final_desc or "Séance validée par l'athlète",
            "completed_at": datetime.now().isoformat(),
            "garmin_activity_id": garmin_activity_id,
            "garmin_synced": garmin_synced,
        }
    else:
        existing = records.get(date_iso, {})
        existing_act_id = existing.get("garmin_activity_id")
        if existing_act_id and garmin_client:
            try:
                garmin_client.delete_activity(existing_act_id)
                _ACTIVITIES_CACHE.clear()
            except Exception as e_del:
                print(f"Warning: could not delete activity from Garmin: {e_del}")
        records.pop(date_iso, None)
        try:
            from garmin_coach.database import ManualCompletionRepository
            ManualCompletionRepository.delete(date_iso, clean_id)
        except Exception:
            pass

    save_manual_completions(records, clean_id)
    return {
        "status": "success",
        "date": date_iso,
        "athlete_id": clean_id,
        "completed": completed,
        "garmin_synced": garmin_synced,
        "garmin_activity_id": garmin_activity_id,
        "error_message": error_message,
    }


def get_week_bounds(ref_date: Optional[date] = None, offset_weeks: int = 0) -> tuple[date, date]:
    """Returns (monday_date, sunday_date) for the given reference date and week offset."""
    today = ref_date or date.today()
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=offset_weeks)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def get_real_weekly_calendar(
    garmin_client=None,
    ref_date: Optional[date] = None,
    offset_weeks: int = 0,
    memory=None,
    athlete_id: str = "louis",
) -> Dict[str, Any]:
    """Builds a fully synchronized weekly plan matching planned workouts with actual Garmin activities."""
    clean_id = (athlete_id or "louis").strip().lower()
    today = ref_date or date.today()
    monday, sunday = get_week_bounds(today, offset_weeks)

    # 1. Load planned template from CoachPlanner
    try:
        from garmin_coach.profile import AthleteProfile
        from garmin_coach.planner import CoachPlanner
        from garmin_coach.memory import CoachMemory
        prof = AthleteProfile.load(clean_id)
        mem = memory or CoachMemory()
        planner = CoachPlanner(prof)
        template = planner.generate_weekly_template(memory=mem)
    except Exception:
        prof = None
        template = []

    # 2. Fetch recorded activities for this week from Garmin Connect
    recorded_by_date = {}
    if garmin_client:
        try:
            cache_key = f"{clean_id}_{monday.isoformat()}_{sunday.isoformat()}"
            now = time.time()
            if cache_key in _ACTIVITIES_CACHE and (now - _ACTIVITIES_CACHE[cache_key][0]) < CACHE_TTL_SECONDS:
                acts = _ACTIVITIES_CACHE[cache_key][1]
            else:
                acts = garmin_client.get_activities_by_date(monday.isoformat(), sunday.isoformat()) or []
                _ACTIVITIES_CACHE[cache_key] = (now, acts)

            for a in acts:
                raw_date = (a.get("startTimeLocal") or "")[:10]
                if raw_date:
                    dur_sec = a.get("duration", 0)
                    dist_m = a.get("distance", 0)
                    type_key = a.get("activityType", {}).get("typeKey", "workout")
                    speed_kmh = round((dist_m / dur_sec) * 3.6, 1) if dur_sec > 0 else 0
                    pace_str = ""
                    if "run" in type_key and dist_m > 100:
                        pace_sec = dur_sec / (dist_m / 1000.0)
                        pace_str = f"{int(pace_sec // 60)}:{int(pace_sec % 60):02d} min/km"

                    recorded_by_date[raw_date] = {
                        "id": a.get("activityId"),
                        "name": a.get("activityName", "Activité"),
                        "sport": type_key,
                        "distance_km": round(dist_m / 1000.0, 2),
                        "duration_min": round(dur_sec / 60.0, 1),
                        "avg_hr": a.get("averageHR"),
                        "speed_kmh": speed_kmh,
                        "pace": pace_str,
                        "aerobic_te": a.get("aerobicTrainingEffect"),
                        "anaerobic_te": a.get("anaerobicTrainingEffect"),
                    }
        except Exception as e:
            print(f"Warning: could not fetch activities by date for {clean_id}: {e}")

    # 3. Fetch scheduled workouts on Garmin Connect calendar
    scheduled_by_date = {}
    if garmin_client:
        try:
            query = {
                "query": f'query{{workoutScheduleSummariesScalar(startDate:"{monday.isoformat()}", endDate:"{sunday.isoformat()}")}}'
            }
            res = garmin_client.query_garmin_graphql(query)
            items = (res.get("data") or {}).get("workoutScheduleSummariesScalar") or []
            for item in items:
                sched_date = item.get("calendarDate") or item.get("date")
                if sched_date:
                    scheduled_by_date[sched_date] = {
                        "workout_id": item.get("workoutId"),
                        "workout_name": item.get("workoutName") or item.get("title"),
                    }
        except Exception as e:
            print(f"Warning: could not fetch scheduled workouts for {clean_id}: {e}")

    # 4. Load manual completions (e.g. untracked Ultimate sessions)
    manual_records = load_manual_completions(clean_id)

    # 5. Build detailed daily items
    days = []
    completed_sessions_count = 0
    total_planned_sessions = 0
    actual_volume_km = 0.0

    for i in range(7):
        current_day = monday + timedelta(days=i)
        iso_str = current_day.isoformat()
        day_name = JOURS_FR[current_day.weekday()]
        is_today = (current_day == today)
        is_past = (current_day < today)
        is_future = (current_day > today)

        # Load custom plan or generate initial 3-week progressive cycle
        custom_plan = load_custom_plan(clean_id)
        if not custom_plan and clean_id == "louis":
            custom_plan = generate_progressive_3week_plan(ref_date=today)

        custom_item = custom_plan.get(iso_str)
        if custom_item:
            sport = custom_item.get("sport", "rest")
            plan_type = custom_item.get("type", "Entraînement")
            plan_duration = custom_item.get("duration", "45 min")
            plan_intensity = custom_item.get("intensity", "Zone 2")
            plan_focus = custom_item.get("focus", "")
            is_key = custom_item.get("is_key", False)
            is_shared = custom_item.get("is_shared", False)
            shared_notes = custom_item.get("shared_notes", "")
            sport_icon = custom_item.get("sport_icon") or ("🥏" if sport == "ultimate" else ("🏃‍♂️" if (sport == "running" and clean_id == "louis") else ("🏃‍♀️" if (sport == "running" and clean_id == "clara") else ("🚴" if sport == "cycling" else "🧘"))))
            workout_structure = custom_item.get("workout_structure")
        else:
            plan_item = next((t for t in template if t.get("day", "").lower() == day_name.lower()), {})
            sport = plan_item.get("sport", "rest")
            plan_type = plan_item.get("type", "Entraînement")
            plan_duration = plan_item.get("duration", "45 min")
            plan_intensity = plan_item.get("intensity", "Zone 2")
            plan_focus = plan_item.get("focus", "")
            is_key = plan_item.get("is_key", False)
            is_shared = False
            shared_notes = ""
            sport_icon = plan_item.get("sport_icon", "🏃‍♂️" if clean_id == "louis" else "🏃‍♀️")
            workout_structure = None

        is_rest = "repos" in plan_type.lower() or sport == "recovery"

        if not is_rest:
            total_planned_sessions += 1

        # Check execution status
        garmin_act = recorded_by_date.get(iso_str)
        manual_entry = manual_records.get(iso_str)
        scheduled_entry = scheduled_by_date.get(iso_str)

        actual_info = None
        status = "planned"
        status_label = "Prévu"
        status_color = "slate"

        if garmin_act:
            status = "completed"
            act_sport = (garmin_act.get("sport") or "").lower()
            if "ultimate" in act_sport or "disc" in act_sport:
                status_label = "Réalisé (Ultimate sur Garmin)"
                status_color = "emerald"
            else:
                status_label = "Réalisé (Montre Garmin)"
                status_color = "emerald"
            actual_info = garmin_act
            completed_sessions_count += 1
            actual_volume_km += garmin_act.get("distance_km", 0.0)
        elif manual_entry:
            is_synced = manual_entry.get("garmin_synced", False)
            status = "completed_manual"
            status_label = "Synchronisé sur Garmin (Montre)" if is_synced else "Effectué (Hors montre)"
            status_color = "emerald" if is_synced else "cyan"
            actual_info = {
                "name": manual_entry.get("activity_name") or f"{plan_type} (Validé)",
                "duration_min": manual_entry.get("duration_minutes", 90),
                "note": manual_entry.get("note", "Effectué"),
                "completed_at": manual_entry.get("completed_at"),
                "garmin_activity_id": manual_entry.get("garmin_activity_id"),
                "garmin_synced": is_synced,
                "sport": "ultimate_disc" if "ultimate" in sport.lower() else sport,
            }
            completed_sessions_count += 1
        elif is_rest and is_past:
            status = "rest_completed"
            status_label = "Repos respecté"
            status_color = "purple"
        elif is_past:
            status = "missed"
            status_label = "Non enregistré"
            status_color = "amber"
        elif is_today:
            status = "today_pending"
            status_label = "À faire aujourd'hui"
            status_color = "sunset"
        else:
            status = "planned"
            status_label = "À venir"
            status_color = "slate"

        can_schedule = sport in ["running", "cycling"] and is_future or (is_today and status == "today_pending")

        day_obj = {
            "athlete_id": clean_id,
            "day_index": i,
            "day_name": day_name,
            "date_iso": iso_str,
            "date_short": f"{current_day.day:02d}/{current_day.month:02d}",
            "date_formatted": f"{current_day.day} {MOIS_FR[current_day.month - 1][:4]}.",
            "full_date_fr": format_full_date_fr(current_day),
            "is_today": is_today,
            "is_past": is_past,
            "is_future": is_future,
            "sport": sport,
            "sport_icon": sport_icon,
            "type": plan_type,
            "duration": plan_duration,
            "intensity": plan_intensity,
            "focus": plan_focus,
            "is_key": is_key,
            "is_shared": is_shared,
            "shared_notes": shared_notes,
            "workout_structure": workout_structure,
            "status": status,
            "status_label": status_label,
            "status_color": status_color,
            "actual_activity": actual_info,
            "garmin_scheduled": scheduled_entry,
            "can_schedule_garmin": can_schedule,
            "can_manual_toggle": sport == "ultimate" or not is_rest,
        }
        days.append(day_obj)

    completion_rate_percent = round((completed_sessions_count / max(total_planned_sessions, 1)) * 100)

    # Format human title for the week
    week_num = monday.isocalendar()[1]
    week_title = f"Semaine {week_num} : du {monday.day} {MOIS_FR[monday.month - 1]} au {sunday.day} {MOIS_FR[sunday.month - 1]} {sunday.year}"

    athlete_name = prof.name if prof else ("Clara" if clean_id == "clara" else "Louis Poutrain")

    return {
        "athlete": athlete_name,
        "athlete_id": clean_id,
        "week_title": week_title,
        "week_number": week_num,
        "year": monday.year,
        "start_date": monday.isoformat(),
        "end_date": sunday.isoformat(),
        "is_current_week": (offset_weeks == 0),
        "offset_weeks": offset_weeks,
        "today_iso": today.isoformat(),
        "today_full_fr": format_full_date_fr(today),
        "scorecard": {
            "completed_sessions": completed_sessions_count,
            "total_planned_sessions": total_planned_sessions,
            "completion_rate_percent": completion_rate_percent,
            "actual_volume_km": round(actual_volume_km, 1),
            "methodology": "80/20 Polarisé & Hybride Ultimate/Running" if clean_id == "louis" else "80/20 Polarisé Prépa 10 km Sub-50",
            "phase": "Reprise progressive & consolidation aérobie" if clean_id == "louis" else "Développement aérobie & Allure 10 km",
        },
        "days": days,
    }


def get_duo_weekly_calendar(
    louis_client=None,
    clara_client=None,
    ref_date: Optional[date] = None,
    offset_weeks: int = 0,
    memory_louis=None,
    memory_clara=None,
) -> Dict[str, Any]:
    """Builds a synchronized duo weekly plan combining Louis's and Clara's schedules."""
    louis_cal = get_real_weekly_calendar(
        garmin_client=louis_client,
        ref_date=ref_date,
        offset_weeks=offset_weeks,
        memory=memory_louis,
        athlete_id="louis",
    )
    clara_cal = get_real_weekly_calendar(
        garmin_client=clara_client,
        ref_date=ref_date,
        offset_weeks=offset_weeks,
        memory=memory_clara,
        athlete_id="clara",
    )

    duo_days = []
    louis_days = louis_cal.get("days", [])
    clara_days = clara_cal.get("days", [])

    for i in range(7):
        d_l = louis_days[i] if i < len(louis_days) else {}
        d_c = clara_days[i] if i < len(clara_days) else {}
        is_shared = bool(d_l.get("is_shared") or d_c.get("is_shared"))
        shared_notes = d_c.get("shared_notes") or d_l.get("shared_notes") or ""

        duo_days.append({
            "day_index": i,
            "day_name": d_l.get("day_name") or d_c.get("day_name"),
            "date_iso": d_l.get("date_iso") or d_c.get("date_iso"),
            "date_short": d_l.get("date_short") or d_c.get("date_short"),
            "date_formatted": d_l.get("date_formatted") or d_c.get("date_formatted"),
            "full_date_fr": d_l.get("full_date_fr") or d_c.get("full_date_fr"),
            "is_today": d_l.get("is_today", False),
            "is_past": d_l.get("is_past", False),
            "is_future": d_l.get("is_future", False),
            "is_shared": is_shared,
            "shared_notes": shared_notes,
            "louis": d_l,
            "clara": d_c,
        })

    return {
        "athlete": "Duo (Louis & Clara)",
        "athlete_id": "duo",
        "week_title": louis_cal.get("week_title"),
        "week_number": louis_cal.get("week_number"),
        "year": louis_cal.get("year"),
        "start_date": louis_cal.get("start_date"),
        "end_date": louis_cal.get("end_date"),
        "is_current_week": louis_cal.get("is_current_week"),
        "offset_weeks": offset_weeks,
        "today_iso": louis_cal.get("today_iso"),
        "today_full_fr": louis_cal.get("today_full_fr"),
        "louis_scorecard": louis_cal.get("scorecard"),
        "clara_scorecard": clara_cal.get("scorecard"),
        "scorecard": louis_cal.get("scorecard"),
        "coordination_notes": "Le vendredi et le dimanche sont vos créneaux clés en duo ! Louis accompagne Clara à son allure foncière (~5:45 - 6:00/km) : cela discipline parfaitement son cœur en Zone 2 tout en soutenant Clara dans sa progression vers les 50 min.",
        "days": duo_days,
        "louis_days": louis_days,
        "clara_days": clara_days,
    }


def schedule_workout_to_garmin(
    garmin_client,
    date_iso: str,
    workout_name: str = "Reprise Running Z2",
    duration_minutes: int = 35,
    hr_min: Optional[int] = None,
    hr_max: Optional[int] = None,
    workout_structure: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Builds, uploads, and schedules an exact structured workout (intervals or continuous) onto Garmin Connect."""
    if not garmin_client:
        return {"status": "error", "message": "Client Garmin non connecté"}

    # Attempt to load workout_structure from stored custom plan if not provided
    if not workout_structure:
        plan = load_custom_plan()
        day_info = plan.get(date_iso, {})
        workout_structure = day_info.get("workout_structure")

    is_intervals = False
    if workout_structure and workout_structure.get("type") == "intervals":
        is_intervals = True
    elif any(k in workout_name.lower() for k in ["fractionné", "seuil", "vma", "x 1000", "x 400", "x 1 min", "4x1000", "6x400", "8x1"]):
        is_intervals = True

    try:
        if is_intervals:
            from garmin_mcp.workout_builders import build_run_interval_json
            repeats = (workout_structure or {}).get("repeats") or (4 if "1000" in workout_name else (8 if "8x" in workout_name or "8 x" in workout_name else 6))
            rep_sec = (workout_structure or {}).get("rep_seconds") or (240 if "1000" in workout_name else (60 if "1 min" in workout_name else 90))
            rec_sec = (workout_structure or {}).get("recovery_seconds") or (105 if "1000" in workout_name else 60)
            warmup = (workout_structure or {}).get("warmup_min", 15)
            cooldown = (workout_structure or {}).get("cooldown_min", 10)
            zone = (workout_structure or {}).get("hr_zone", "Z4")
            w_min = (workout_structure or {}).get("hr_min") or hr_min
            w_max = (workout_structure or {}).get("hr_max") or hr_max

            workout_json = build_run_interval_json(
                name=f"Garmin Coach - {workout_name}",
                repeats=repeats,
                rep_seconds=rep_sec,
                recovery_seconds=rec_sec,
                warmup_min=warmup,
                cooldown_min=cooldown,
                hr_zone=zone,
                hr_min=w_min,
                hr_max=w_max,
            )
        else:
            from garmin_mcp.workout_builders import build_run_json
            dur = duration_minutes
            if workout_structure and workout_structure.get("duration_minutes"):
                dur = workout_structure["duration_minutes"]
            warmup = (workout_structure or {}).get("warmup_min", 5)
            cooldown = (workout_structure or {}).get("cooldown_min", 5)
            zone = (workout_structure or {}).get("hr_zone", "Z2")
            w_min = (workout_structure or {}).get("hr_min") or hr_min or 126
            w_max = (workout_structure or {}).get("hr_max") or hr_max or 145
            run_sec = max((dur - warmup - cooldown) * 60, 600)

            workout_json = build_run_json(
                name=f"Garmin Coach - {workout_name}",
                run_seconds=run_sec,
                warmup_min=warmup,
                cooldown_min=cooldown,
                hr_zone=zone,
                hr_min=w_min,
                hr_max=w_max,
            )

        res = garmin_client.upload_workout(workout_json)
        workout_id = res.get("workoutId") if isinstance(res, dict) else None
        if not workout_id:
            return {"status": "error", "message": "Échec de l'upload de l'entraînement sur Garmin Connect"}

        url = f"workout-service/schedule/{workout_id}"
        resp = garmin_client.client.post("connectapi", url, json={"date": date_iso})
        if resp.status_code == 200:
            return {
                "status": "success",
                "workout_id": workout_id,
                "workout_name": workout_name,
                "scheduled_date": date_iso,
                "is_intervals": is_intervals,
                "message": f"Séance spécifique '{workout_name}' programmée avec succès sur votre montre Garmin pour le {date_iso} !",
            }
        else:
            return {"status": "error", "message": f"Échec de programmation calendrier (HTTP {resp.status_code})"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

