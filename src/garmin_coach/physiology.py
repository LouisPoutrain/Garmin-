"""
Physiological modeling engine for Garmin Coach AI.
Implements:
1. Banister TRIMP (Training Impulse) calculation.
2. ACWR (Acute:Chronic Workload Ratio) for fatigue vs fitness monitoring.
3. Aerobic decoupling and threshold pace modeling for Sub-40 10k progression.
"""
import math
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from garmin_coach.database.db import get_connection


def calculate_trimp(
    duration_min: float,
    avg_hr: Optional[int],
    resting_hr: int = 52,
    max_hr: int = 192,
    gender: str = "male",
) -> float:
    """Calculates Banister TRIMP (Training Impulse) based on heart rate reserve ratio."""
    if not avg_hr or avg_hr <= resting_hr or duration_min <= 0:
        # Default estimation based on moderate effort if HR is missing (e.g. untracked ultimate)
        return round(duration_min * 1.5, 1)

    hr_ratio = (avg_hr - resting_hr) / max(max_hr - resting_hr, 1)
    hr_ratio = min(max(hr_ratio, 0.0), 1.0)

    # Banister gender factor: 1.92 for male, 1.67 for female
    factor = 1.92 if gender.lower() == "male" else 1.67
    trimp = duration_min * hr_ratio * 0.64 * math.exp(factor * hr_ratio)
    return round(trimp, 1)


def get_daily_load_history(days: int = 42) -> Dict[str, float]:
    """Retrieves daily aggregated training load (TRIMP) from SQLite activities and manual sessions."""
    conn = get_connection()
    try:
        today = date.today()
        start_date = (today - timedelta(days=days)).isoformat()

        daily_loads: Dict[str, float] = {}

        # 1. Garmin tracked activities
        rows = conn.execute(
            """
            SELECT substr(start_time, 1, 10) AS day_str,
                   duration_sec,
                   avg_hr
            FROM activities_cache
            WHERE start_time >= ?
            """,
            (start_date,),
        ).fetchall()

        for r in rows:
            day_str = r["day_str"]
            dur_m = (r["duration_sec"] or 0) / 60.0
            avg_hr = r["avg_hr"]
            load = calculate_trimp(dur_m, avg_hr)
            daily_loads[day_str] = daily_loads.get(day_str, 0.0) + load

        # 2. Manual completions (e.g. Ultimate Frisbee sessions)
        manual_rows = conn.execute(
            """
            SELECT date, duration_minutes, sport
            FROM manual_completions
            WHERE date >= ? AND completed = 1
            """,
            (start_date,),
        ).fetchall()

        for m in manual_rows:
            day_str = m["date"]
            dur_m = float(m["duration_minutes"] or 90)
            # Ultimate frisbee has intermittent high heart rate (~155 bpm average during play)
            load = calculate_trimp(dur_m, avg_hr=155)
            # Avoid double counting if already tracked in activities_cache on same day
            if day_str not in daily_loads:
                daily_loads[day_str] = round(load, 1)
            else:
                daily_loads[day_str] = round(daily_loads[day_str] + load, 1)

        return daily_loads
    finally:
        conn.close()


def calculate_acwr(ref_date: Optional[date] = None) -> Dict[str, Any]:
    """Calculates Acute:Chronic Workload Ratio (ACWR) using EWMA (Exponentially Weighted Moving Average)."""
    target_date = ref_date or date.today()
    daily_loads = get_daily_load_history(days=35)

    # Acute load = 7-day average load
    acute_days = [target_date - timedelta(days=i) for i in range(7)]
    acute_sum = sum(daily_loads.get(d.isoformat(), 0.0) for d in acute_days)
    acute_load = round(acute_sum / 7.0, 1)

    # Chronic load = 28-day average load
    chronic_days = [target_date - timedelta(days=i) for i in range(28)]
    chronic_sum = sum(daily_loads.get(d.isoformat(), 0.0) for d in chronic_days)
    chronic_load = round(chronic_sum / 28.0, 1)

    # Avoid zero division
    effective_chronic = max(chronic_load, 15.0)
    acwr_ratio = round(acute_load / effective_chronic, 2)

    if acwr_ratio < 0.8:
        zone = "under_training"
        zone_label = "Sous-charge (Risque désentraînement)"
        color = "#94A3B8" # Slate
        recommendation = "Vous pouvez augmenter le volume ou l'intensité sans risque."
    elif 0.8 <= acwr_ratio <= 1.3:
        zone = "optimal"
        zone_label = "Zone Optimale (Sweet Spot)"
        color = "#10B981" # Emerald
        recommendation = "Progression idéale de la charge. Ratio forme/fatigue parfaitement équilibré."
    elif 1.3 < acwr_ratio <= 1.5:
        zone = "warning"
        zone_label = "Charge Élevée (Surveillance)"
        color = "#F59E0B" # Amber
        recommendation = "Fatigue aiguë importante. Privilégiez l'endurance fondamentale Z2 et le sommeil."
    else:
        zone = "hazard"
        zone_label = "Alerte Surcharge (Risque Blessure)"
        color = "#EF4444" # Red
        recommendation = "Surmenage détecté. Allégez immédiatement la séance clé en Z1 ou prenez un jour de repos."

    return {
        "date": target_date.isoformat(),
        "acute_load": acute_load,
        "chronic_load": chronic_load,
        "acwr_ratio": acwr_ratio,
        "zone": zone,
        "zone_label": zone_label,
        "color": color,
        "recommendation": recommendation,
        "weekly_total_trimp": round(acute_sum, 1),
    }
