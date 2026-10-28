"""Deep long-term historical analysis engine for Garmin Connect data."""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from collections import defaultdict
from garmin_coach.temporal import format_relative_date_fr, parse_iso_or_local_date

CACHE_FILE = Path(__file__).resolve().parents[2] / "data" / "historical_profile.json"


def analyze_long_term_history(garmin_client, max_activities: int = 100, force_refresh: bool = False) -> Dict[str, Any]:
    """Analyzes the athlete's complete activity history to extract physiological baselines."""
    
    if not force_refresh and CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    raw_activities = garmin_client.get_activities(0, max_activities) or []
    if not raw_activities:
        return {}

    sports_stats = defaultdict(lambda: {
        "count": 0,
        "total_km": 0.0,
        "total_duration_hours": 0.0,
        "hr_readings": [],
        "longest_km": 0.0,
        "longest_activity_name": "",
        "longest_date": "",
    })

    running_paces_sec_km = []

    # Track most recent session per sport
    most_recent_per_sport = {}

    for a in raw_activities:
        sport = a.get("activityType", {}).get("typeKey", "other")
        dist_km = (a.get("distance") or 0.0) / 1000.0
        dur_sec = a.get("duration") or 0.0
        dur_hours = dur_sec / 3600.0
        dur_min = dur_sec / 60.0
        hr = a.get("averageHR")
        name = a.get("activityName", "Activité")
        date_str = a.get("startTimeLocal", "")[:10]

        entry = sports_stats[sport]
        entry["count"] += 1
        entry["total_km"] += round(dist_km, 2)
        entry["total_duration_hours"] += round(dur_hours, 2)
        if hr:
            entry["hr_readings"].append(hr)

        # Track first encounter as most recent (activities are sorted newest first)
        if sport not in most_recent_per_sport:
            pace_str = ""
            if sport == "running" and dist_km > 0:
                p_sec = dur_sec / dist_km
                pace_str = f"Allure: {int(p_sec // 60)}:{int(p_sec % 60):02d} min/km"
            elif sport == "cycling" and dur_hours > 0:
                speed_kmh = round(dist_km / dur_hours, 1)
                pace_str = f"Vitesse: {speed_kmh} km/h"
            
            d_obj = parse_iso_or_local_date(date_str)
            date_display = format_relative_date_fr(d_obj) if d_obj else date_str
            most_recent_per_sport[sport] = {
                "date": date_display,
                "raw_date": date_str,
                "name": name,
                "distance_km": round(dist_km, 2),
                "duration_min": round(dur_min, 1),
                "pace_or_speed": pace_str,
                "avg_hr": hr,
            }

        # Track longest session with actual pace and duration
        if dist_km > entry["longest_km"]:
            entry["longest_km"] = round(dist_km, 2)
            entry["longest_activity_name"] = name
            entry["longest_date"] = date_str
            entry["longest_dur_min"] = round(dur_min, 1)
            p_sec = (dur_sec / dist_km) if dist_km > 0 else 0
            entry["longest_pace"] = f"{int(p_sec // 60)}:{int(p_sec % 60):02d} min/km" if p_sec > 0 else ""
            entry["longest_hr"] = hr

        # Running pace calculation for normal runs
        if sport == "running" and dist_km >= 1.0 and dur_sec > 0:
            pace_sec = dur_sec / dist_km
            running_paces_sec_km.append(pace_sec)

    # Fetch Official Personal Records from Garmin
    personal_records = {}
    personal_records_detailed = {}
    pr_10k_detailed = None
    try:
        raw_prs = garmin_client.get_personal_record() or []
        for pr in raw_prs:
            tid = pr.get("typeId")
            val = pr.get("value")
            act_id = pr.get("activityId") or pr.get("activity_id")
            act_date = (pr.get("actStartDateTimeInGMTFormatted") or pr.get("date") or "")[:10]
            act_name = pr.get("activityName") or "Séance"
            
            pr_entry = {
                "activity_id": act_id,
                "activity_name": act_name,
                "date": act_date,
                "raw_value": val,
            }

            if tid == 1 and val:  # 1k
                m, s = int(val // 60), int(val % 60)
                personal_records["1k"] = f"{m}:{s:02d} ({act_name} le {act_date})"
                pr_entry["time_formatted"] = f"{m}:{s:02d}"
                personal_records_detailed["1k"] = pr_entry
            elif tid == 2 and val:  # 1 mile
                m, s = int(val // 60), int(val % 60)
                personal_records["1_mile"] = f"{m}:{s:02d} ({act_name} le {act_date})"
                pr_entry["time_formatted"] = f"{m}:{s:02d}"
                personal_records_detailed["1_mile"] = pr_entry
            elif tid == 3 and val:  # 5k
                m, s = int(val // 60), int(val % 60)
                personal_records["5k"] = f"{m}:{s:02d} ({act_name} le {act_date})"
                pr_entry["time_formatted"] = f"{m}:{s:02d}"
                personal_records_detailed["5k"] = pr_entry
            elif tid == 4 and val:  # 10k
                m, s = int(val // 60), int(val % 60)
                personal_records["10k"] = f"{m}:{s:02d} ({act_name} le {act_date})"
                pr_entry["time_formatted"] = f"{m}:{s:02d}"
                personal_records_detailed["10k"] = pr_entry
                if act_id:
                    try:
                        from garmin_coach.activity_details import get_detailed_activity
                        pr_10k_detailed = get_detailed_activity(garmin_client, act_id)
                    except Exception as err:
                        print(f"Warning: could not fetch detailed 10k PR: {err}")
            elif tid == 7 and val:  # Longest run
                dist_km = round(val / 1000, 2)
                personal_records["longest_run"] = f"{dist_km} km ({act_name} le {act_date})"
                pr_entry["distance_km"] = dist_km
                personal_records_detailed["longest_run"] = pr_entry
            elif tid == 8 and val:  # Longest ride
                dist_km = round(val / 1000, 2)
                personal_records["longest_ride"] = f"{dist_km} km ({act_name} le {act_date})"
                pr_entry["distance_km"] = dist_km
                personal_records_detailed["longest_ride"] = pr_entry
    except Exception as e:
        print(f"Warning: could not fetch PRs: {e}")

    # Format sports breakdown
    formatted_sports = {}
    for sport, data in sports_stats.items():
        avg_hr = round(sum(data["hr_readings"]) / len(data["hr_readings"])) if data["hr_readings"] else None
        longest_info = f"{data['longest_activity_name']} ({data['longest_km']} km en {data.get('longest_dur_min', 0)} min, allure {data.get('longest_pace', '')}, le {data['longest_date']})"
        formatted_sports[sport] = {
            "sessions_count": data["count"],
            "total_km": round(data["total_km"], 1),
            "total_hours": round(data["total_duration_hours"], 1),
            "avg_hr": avg_hr,
            "longest_distance_km": data["longest_km"],
            "longest_activity": longest_info,
            "most_recent_session": most_recent_per_sport.get(sport, {}),
        }

    # Running pace formatted
    avg_run_pace_str = "N/D"
    if running_paces_sec_km:
        avg_sec = sum(running_paces_sec_km) / len(running_paces_sec_km)
        m = int(avg_sec // 60)
        s = int(avg_sec % 60)
        avg_run_pace_str = f"{m}:{s:02d} min/km"

    # Total volume
    total_km = sum(s["total_km"] for s in formatted_sports.values())
    total_hours = sum(s["total_hours"] for s in formatted_sports.values())
    total_sessions = len(raw_activities)

    profile = {
        "athlete_name": "Louis Poutrain",
        "total_activities_analyzed": total_sessions,
        "lifetime_volume_km": round(total_km, 1),
        "lifetime_volume_hours": round(total_hours, 1),
        "personal_records": personal_records,
        "personal_records_detailed": personal_records_detailed,
        "oldest_activity_date": raw_activities[-1].get("startTimeLocal", "")[:10] if raw_activities else "",
        "newest_activity_date": raw_activities[0].get("startTimeLocal", "")[:10] if raw_activities else "",
        "running_profile": {
            "sessions": formatted_sports.get("running", {}).get("sessions_count", 0),
            "total_km": formatted_sports.get("running", {}).get("total_km", 0),
            "average_pace": avg_run_pace_str,
            "average_hr": formatted_sports.get("running", {}).get("avg_hr"),
            "longest_run": formatted_sports.get("running", {}).get("longest_activity"),
            "most_recent_run": most_recent_per_sport.get("running", {}),
            "official_10k_pr": personal_records.get("10k", "43:34"),
            "official_5k_pr": personal_records.get("5k", "21:23"),
            "official_1k_pr": personal_records.get("1k", "3:51"),
            "pr_10k_detailed": pr_10k_detailed,
        },
        "cycling_profile": {
            "sessions": formatted_sports.get("cycling", {}).get("sessions_count", 0),
            "total_km": formatted_sports.get("cycling", {}).get("total_km", 0),
            "average_hr": formatted_sports.get("cycling", {}).get("avg_hr"),
            "longest_ride": formatted_sports.get("cycling", {}).get("longest_activity"),
            "most_recent_ride": most_recent_per_sport.get("cycling", {}),
        },
        "team_sports_profile": {
            "sport": "ultimate_disc",
            "sessions": formatted_sports.get("ultimate_disc", {}).get("sessions_count", 0),
            "total_hours": formatted_sports.get("ultimate_disc", {}).get("total_hours", 0),
            "note": "Activité intermittente haute intensité avec sprints répétés et sollicitation anaérobie.",
        },
        "sports_summary": formatted_sports,
    }

    # Save cache
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)

    return profile
