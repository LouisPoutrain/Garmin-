"""Detailed activity analysis engine for Garmin Connect.

Fetches and formats deep metrics:
- Lap-by-lap splits (pace, avg HR, cadence, elevation change per km)
- Heart rate zones distribution (Z1 to Z5 duration & percentage)
- Biomechanics (cadence, stride length)
- Elevation profile & training effects
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional, List

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
ACTIVITIES_CACHE_DIR = DATA_DIR / "activities_cache"


def format_seconds(seconds: float) -> str:
    """Formats seconds into MM:SS or HH:MM:SS."""
    if seconds is None or seconds <= 0:
        return "00:00"
    total_sec = int(round(seconds))
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    sec = total_sec % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{sec:02d}"
    return f"{minutes:02d}:{sec:02d}"


def pace_from_speed_mps(speed_mps: float) -> str:
    """Converts speed in m/s to running pace min/km."""
    if not speed_mps or speed_mps <= 0.1:
        return "N/D"
    pace_sec = 1000.0 / speed_mps
    return f"{format_seconds(pace_sec)} min/km"


def get_detailed_activity(client, activity_id: int | str, force_refresh: bool = False) -> Dict[str, Any]:
    """Fetches full granular activity data including splits and HR zones."""
    ACTIVITIES_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = ACTIVITIES_CACHE_DIR / f"{activity_id}.json"

    if not force_refresh and cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    # 1. Fetch raw activity data from Garmin Connect
    try:
        raw_act = client.get_activity(activity_id) or {}
    except Exception as e:
        raw_act = {}

    summary = raw_act.get("summaryDTO", {})
    type_dto = raw_act.get("activityTypeDTO", {})
    sport_key = type_dto.get("typeKey", "running")

    # 2. Fetch splits
    raw_splits = {}
    try:
        raw_splits = client.get_activity_splits(activity_id) or {}
    except Exception:
        pass

    lap_dtos = raw_splits.get("lapDTOs", [])
    laps_formatted = []
    total_lap_distance = 0.0

    for idx, lap in enumerate(lap_dtos):
        lap_dist_m = lap.get("distance", 0.0)
        total_lap_distance += lap_dist_m
        lap_dur_sec = lap.get("duration", 0.0)
        lap_speed = lap.get("averageMovingSpeed") or lap.get("averageSpeed", 0.0)
        
        pace_str = pace_from_speed_mps(lap_speed)
        speed_kmh = round(lap_speed * 3.6, 1) if lap_speed > 0 else 0.0

        cadence = lap.get("averageRunCadence") or lap.get("averageCadence")
        hr_avg = lap.get("averageHR")
        hr_max = lap.get("maxHR")
        elev_gain = round(lap.get("elevationGain", 0.0), 1)
        elev_loss = round(lap.get("elevationLoss", 0.0), 1)

        laps_formatted.append({
            "lap_number": lap.get("lapNumber", idx + 1),
            "distance_m": round(lap_dist_m, 1),
            "distance_km": round(lap_dist_m / 1000.0, 2),
            "cumul_km": round(total_lap_distance / 1000.0, 2),
            "duration_sec": round(lap_dur_sec, 1),
            "duration_formatted": format_seconds(lap_dur_sec),
            "pace": pace_str,
            "speed_kmh": speed_kmh,
            "avg_hr": round(hr_avg) if hr_avg else None,
            "max_hr": round(hr_max) if hr_max else None,
            "avg_cadence": round(cadence) if cadence else None,
            "elevation_gain_m": elev_gain,
            "elevation_loss_m": elev_loss,
            "calories": round(lap.get("calories", 0.0)),
        })

    # 3. Fetch HR in timezones
    hr_zones_formatted = []
    try:
        raw_zones = client.get_activity_hr_in_timezones(activity_id) or []
        total_zone_sec = sum(z.get("secsInZone", 0.0) for z in raw_zones)
        zone_names = {
            1: "Zone 1 (Récupération)",
            2: "Zone 2 (Endurance)",
            3: "Zone 3 (Tempo)",
            4: "Zone 4 (Seuil)",
            5: "Zone 5 (VO2 Max / Sprint)",
        }
        for z in raw_zones:
            z_num = z.get("zoneNumber", 0)
            secs = z.get("secsInZone", 0.0)
            pct = round((secs / total_zone_sec) * 100, 1) if total_zone_sec > 0 else 0.0
            hr_zones_formatted.append({
                "zone_number": z_num,
                "zone_name": zone_names.get(z_num, f"Zone {z_num}"),
                "low_boundary_bpm": z.get("zoneLowBoundary"),
                "duration_sec": round(secs, 1),
                "duration_formatted": format_seconds(secs),
                "percent": pct,
            })
    except Exception:
        pass

    # 4. Fetch Weather
    weather_formatted = {}
    try:
        raw_weather = client.get_activity_weather(activity_id) or {}
        if raw_weather:
            weather_formatted = {
                "temperature_c": raw_weather.get("temp"),
                "feels_like_c": raw_weather.get("apparentTemp"),
                "relative_humidity": raw_weather.get("relativeHumidity"),
                "wind_speed_kmh": round(raw_weather.get("windSpeed", 0) * 3.6, 1) if raw_weather.get("windSpeed") else None,
                "condition": raw_weather.get("weatherTypeDTO", {}).get("weatherTypeKey"),
            }
    except Exception:
        pass

    # 5. Assemble high-level metrics
    dur_sec = summary.get("duration", 0.0)
    moving_sec = summary.get("movingDuration", dur_sec)
    dist_m = summary.get("distance", 0.0)
    dist_km = round(dist_m / 1000.0, 2)
    avg_speed_mps = summary.get("averageMovingSpeed") or summary.get("averageSpeed", 0.0)

    avg_cadence = summary.get("averageRunCadence") or summary.get("averageCadence")
    max_cadence = summary.get("maxRunCadence") or summary.get("maxCadence")
    stride_len_cm = summary.get("strideLength")

    detailed_data = {
        "id": activity_id,
        "name": raw_act.get("activityName", "Activité Garmin"),
        "sport": sport_key,
        "start_time_local": summary.get("startTimeLocal", ""),
        "date": summary.get("startTimeLocal", "")[:10],
        "time": summary.get("startTimeLocal", "")[11:16],
        "distance_km": dist_km,
        "duration_sec": round(dur_sec, 1),
        "duration_formatted": format_seconds(dur_sec),
        "moving_duration_formatted": format_seconds(moving_sec),
        "avg_speed_kmh": round(avg_speed_mps * 3.6, 1) if avg_speed_mps > 0 else 0.0,
        "avg_pace": pace_from_speed_mps(avg_speed_mps),
        "max_speed_kmh": round(summary.get("maxSpeed", 0.0) * 3.6, 1) if summary.get("maxSpeed") else None,
        "avg_hr": round(summary.get("averageHR")) if summary.get("averageHR") else None,
        "max_hr": round(summary.get("maxHR")) if summary.get("maxHR") else None,
        "calories": round(summary.get("calories", 0.0)),
        "elevation": {
            "gain_m": round(summary.get("elevationGain", 0.0), 1),
            "loss_m": round(summary.get("elevationLoss", 0.0), 1),
            "max_m": round(summary.get("maxElevation", 0.0), 1),
            "min_m": round(summary.get("minElevation", 0.0), 1),
        },
        "biomechanics": {
            "avg_cadence_spm": round(avg_cadence) if avg_cadence else None,
            "max_cadence_spm": round(max_cadence) if max_cadence else None,
            "stride_length_cm": round(stride_len_cm, 1) if stride_len_cm else None,
            "total_steps": summary.get("steps"),
        },
        "training_effect": {
            "aerobic": summary.get("aerobicTrainingEffect"),
            "anaerobic": summary.get("anaerobicTrainingEffect"),
            "label": summary.get("trainingEffectLabel"),
        },
        "intensity_minutes": {
            "moderate": summary.get("moderateIntensityMinutes", 0),
            "vigorous": summary.get("vigorousIntensityMinutes", 0),
        },
        "laps": laps_formatted,
        "hr_zones": hr_zones_formatted,
        "weather": weather_formatted,
    }

    # Save cache
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(detailed_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: could not write activity cache {activity_id}: {e}")

    return detailed_data
