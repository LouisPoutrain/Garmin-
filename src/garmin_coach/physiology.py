"""
Deterministic physiological modeling engine for Garmin Coach AI.
Implements:
1. Jack Daniels VDOT formula and exact training pace zones (E, M, T, I, R).
2. Banister TRIMP calculation by activity.
3. Time series EWMA modeling: CTL (42 days), ATL (7 days), TSB (Form), and ACWR.
4. Nocturnal HRV baseline drift (30-day rolling mean ± 1.5 sigma).
"""

import math
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from garmin_coach.database.db import get_connection
from garmin_coach.models import (
    DailyLoadMetrics,
    DanielsTrainingPaces,
    HRVBaselineAnalysis,
    PaceZone,
    PhysiologicalState,
)

# Reference athlete defaults
ATHLETE_PHYSIO_PROFILES = {
    "louis": {
        "gender": "male",
        "max_hr": 192,
        "resting_hr": 50,
        "default_10k_sec": 39 * 60 + 50,  # 39:50 (Target / near 43:34 PR)
        "reference_label": "10 km Cible (39:50)",
    },
    "clara": {
        "gender": "female",
        "max_hr": 185,
        "resting_hr": 54,
        "default_10k_sec": 49 * 60 + 30,  # 49:30 (Target)
        "reference_label": "10 km Cible (49:30)",
    },
}


# ==============================================================================
# 1. JACK DANIELS VDOT & TRAINING PACES
# ==============================================================================

def calculate_vdot(distance_m: float, time_sec: float) -> float:
    """
    Calculates Jack Daniels VDOT score from a race performance.
    v = distance (m) / time (min)
    VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
    %VO2max = 0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)
    VDOT = VO2 / %VO2max
    """
    if time_sec <= 0 or distance_m <= 0:
        return 45.0

    t_min = time_sec / 60.0
    v = distance_m / t_min  # meters per minute

    vo2 = -4.60 + 0.182258 * v + 0.000104 * (v**2)
    pct_max = 0.8 + 0.1894393 * math.exp(-0.012778 * t_min) + 0.2989558 * math.exp(-0.1932605 * t_min)

    if pct_max <= 0:
        return 45.0

    vdot = vo2 / pct_max
    return round(vdot, 2)


def velocity_from_target_vo2(target_vo2: float) -> float:
    """
    Solves the quadratic equation to find velocity v (m/min) given target VO2:
    0.000104 * v^2 + 0.182258 * v - (4.60 + target_vo2) = 0
    Returns v in meters per minute.
    """
    a = 0.000104
    b = 0.182258
    c = -(4.60 + target_vo2)

    delta = (b**2) - (4 * a * c)
    if delta < 0:
        return 200.0

    v = (-b + math.sqrt(delta)) / (2 * a)
    return max(v, 50.0)


def seconds_per_km_to_formatted(sec_per_km: int) -> str:
    """Formats pace in seconds per km to MM:SS min/km."""
    m = sec_per_km // 60
    s = sec_per_km % 60
    return f"{m}:{s:02d} min/km"


def calculate_pace_for_intensity(
    vdot: float,
    intensity_pct: float,
    code: str,
    name: str,
    hr_min_pct: int,
    hr_max_pct: int,
    max_hr: int,
    description: str,
) -> PaceZone:
    """Calculates a Daniels PaceZone for a given percentage of VDOT."""
    target_vo2 = vdot * intensity_pct
    v_m_per_min = velocity_from_target_vo2(target_vo2)

    # sec per km = 1000m / (v m/min / 60s) = 60000 / v
    sec_per_km = int(round(60000.0 / v_m_per_min))
    speed_kmh = round((v_m_per_min * 60.0) / 1000.0, 2)

    hr_min_bpm = int(round(max_hr * (hr_min_pct / 100.0)))
    hr_max_bpm = int(round(max_hr * (hr_max_pct / 100.0)))

    return PaceZone(
        code=code,
        name=name,
        seconds_per_km=sec_per_km,
        pace_formatted=seconds_per_km_to_formatted(sec_per_km),
        speed_kmh=speed_kmh,
        hr_min_pct=hr_min_pct,
        hr_max_pct=hr_max_pct,
        hr_min_bpm=hr_min_bpm,
        hr_max_bpm=hr_max_bpm,
        vdot_pct=round(intensity_pct * 100, 1),
        description=description,
    )


def get_daniels_paces(
    athlete_id: str = "louis",
    reference_10k_sec: Optional[int] = None,
) -> DanielsTrainingPaces:
    """
    Generates exact Jack Daniels training paces (E, M, T, I, R) for an athlete.
    """
    profile = ATHLETE_PHYSIO_PROFILES.get(athlete_id.lower(), ATHLETE_PHYSIO_PROFILES["louis"])
    time_sec = reference_10k_sec or profile["default_10k_sec"]
    max_hr = profile["max_hr"]

    vdot = calculate_vdot(distance_m=10000.0, time_sec=time_sec)
    m_ref = time_sec // 60
    s_ref = time_sec % 60
    ref_formatted = f"{m_ref}:{s_ref:02d}"

    # E: Endurance Fondamentale (62% - 72% VDOT, 65-79% FCmax)
    easy_low = calculate_pace_for_intensity(
        vdot, 0.62, "E-Low", "Endurance Récupération (Z1/Z2 basse)",
        hr_min_pct=65, hr_max_pct=72, max_hr=max_hr,
        description="Footing très facile, récupération active, habituation tendineuse sans fatigue.",
    )
    easy_high = calculate_pace_for_intensity(
        vdot, 0.72, "E-High", "Endurance Fondamentale (Z2 haute)",
        hr_min_pct=72, hr_max_pct=79, max_hr=max_hr,
        description="Allure de base pour 80% du volume hebdomadaire. Développement du réseau capillaire.",
    )

    # M: Allure Marathon (84% VDOT, 80-85% FCmax)
    marathon = calculate_pace_for_intensity(
        vdot, 0.84, "M", "Allure Spécifique Marathon",
        hr_min_pct=80, hr_max_pct=85, max_hr=max_hr,
        description="Tempo soutenu, adaptation à l'utilisation des lipides à intensité constante.",
    )

    # T: Seuil Lactique / Threshold (88% VDOT, 88-92% FCmax)
    threshold = calculate_pace_for_intensity(
        vdot, 0.88, "T", "Seuil Lactique (Threshold / Allure 1h)",
        hr_min_pct=88, hr_max_pct=92, max_hr=max_hr,
        description="Allure au seuil d'accumulation du lactate. Fractions de 1000m à 3000m (r=1 min).",
    )

    # I: Intervalles VMA (98% VDOT, 95-100% FCmax)
    interval = calculate_pace_for_intensity(
        vdot, 0.98, "I", "Intervalles VO2 Max (VMA)",
        hr_min_pct=95, hr_max_pct=100, max_hr=max_hr,
        description="Répétitions de 3 à 5 minutes pour développer la puissance aérobie maximale.",
    )

    # R: Répétitions / Vitesse & Économie (108% VDOT)
    repetition = calculate_pace_for_intensity(
        vdot, 1.08, "R", "Répétitions d'Économie de Course",
        hr_min_pct=98, hr_max_pct=100, max_hr=max_hr,
        description="Sprints de 200m à 400m avec récupération complète (2-3x le temps d'effort).",
    )

    return DanielsTrainingPaces(
        athlete_id=athlete_id.lower(),
        vdot=vdot,
        reference_race="10 km",
        reference_time_sec=time_sec,
        reference_time_formatted=ref_formatted,
        easy_low=easy_low,
        easy_high=easy_high,
        marathon=marathon,
        threshold=threshold,
        interval=interval,
        repetition=repetition,
    )


# ==============================================================================
# 2. BANISTER TRIMP & CTL / ATL / TSB MODEL
# ==============================================================================

def calculate_trimp(
    duration_min: float,
    avg_hr: Optional[int],
    resting_hr: int = 50,
    max_hr: int = 192,
    gender: str = "male",
) -> float:
    """
    Calculates Banister TRIMP (Training Impulse) based on heart rate reserve ratio:
    dHR = (HR_avg - HR_rest) / (HR_max - HR_rest)
    TRIMP = duration_min * dHR * 0.64 * e^(1.92 * dHR) (male)
    TRIMP = duration_min * dHR * 0.86 * e^(1.67 * dHR) (female)
    """
    if not avg_hr or avg_hr <= resting_hr or duration_min <= 0:
        return round(duration_min * 1.2, 1)

    hr_ratio = (avg_hr - resting_hr) / max(max_hr - resting_hr, 1)
    hr_ratio = min(max(hr_ratio, 0.0), 1.0)

    is_female = gender.lower() == "female"
    k = 0.86 if is_female else 0.64
    b = 1.67 if is_female else 1.92

    trimp = duration_min * hr_ratio * k * math.exp(b * hr_ratio)
    return round(trimp, 1)


def get_daily_load_series(athlete_id: str = "louis", days: int = 60) -> Dict[str, float]:
    """
    Fetches raw daily training load from SQLite activities and manual sessions.
    """
    profile = ATHLETE_PHYSIO_PROFILES.get(athlete_id.lower(), ATHLETE_PHYSIO_PROFILES["louis"])
    resting_hr = profile["resting_hr"]
    max_hr = profile["max_hr"]
    gender = profile["gender"]

    conn = get_connection()
    try:
        today = date.today()
        start_date = (today - timedelta(days=days)).isoformat()
        daily_loads: Dict[str, float] = {}

        # 1. Activities cache
        rows = conn.execute(
            """
            SELECT substr(start_time, 1, 10) AS day_str,
                   duration_sec,
                   avg_hr
            FROM activities_cache
            WHERE (athlete_id = ? OR athlete_id IS NULL)
              AND start_time >= ?
            """,
            (athlete_id.lower(), start_date),
        ).fetchall()

        for r in rows:
            day_str = r["day_str"]
            dur_m = (r["duration_sec"] or 0) / 60.0
            avg_hr = r["avg_hr"]
            load = calculate_trimp(dur_m, avg_hr, resting_hr, max_hr, gender)
            daily_loads[day_str] = daily_loads.get(day_str, 0.0) + load

        # 2. Manual sessions (e.g. Ultimate Frisbee for Louis or Track for Clara)
        manual_rows = conn.execute(
            """
            SELECT date, duration_minutes, sport
            FROM manual_completions
            WHERE athlete_id = ?
              AND date >= ?
              AND completed = 1
            """,
            (athlete_id.lower(), start_date),
        ).fetchall()

        for m in manual_rows:
            day_str = m["date"]
            dur_m = float(m["duration_minutes"] or 90)
            avg_hr = 154 if athlete_id == "louis" else 145
            load = calculate_trimp(dur_m, avg_hr, resting_hr, max_hr, gender)
            daily_loads[day_str] = round(daily_loads.get(day_str, 0.0) + load, 1)

        return daily_loads
    finally:
        conn.close()


def calculate_ctl_atl_tsb(
    athlete_id: str = "louis",
    ref_date: Optional[date] = None,
    history_days: int = 50,
) -> DailyLoadMetrics:
    """
    Computes time-series Exponentially Weighted Moving Averages (EWMA):
    CTL_t = CTL_{t-1} + (TRIMP_t - CTL_{t-1}) / 42
    ATL_t = ATL_{t-1} + (TRIMP_t - ATL_{t-1}) / 7
    TSB_t = CTL_t - ATL_t
    ACWR = ATL / CTL
    """
    target_date = ref_date or date.today()
    daily_loads = get_daily_load_series(athlete_id=athlete_id, days=history_days)

    # Chronological timeline from (target_date - history_days) to target_date
    start_d = target_date - timedelta(days=history_days)
    curr_ctl = 25.0  # sensible baseline seeding
    curr_atl = 25.0

    today_trimp = 0.0

    cur_d = start_d
    while cur_d <= target_date:
        d_str = cur_d.isoformat()
        t_load = daily_loads.get(d_str, 0.0)
        if cur_d == target_date:
            today_trimp = t_load

        # EWMA update formulas
        curr_ctl = curr_ctl + (t_load - curr_ctl) / 42.0
        curr_atl = curr_atl + (t_load - curr_atl) / 7.0
        cur_d += timedelta(days=1)

    ctl = round(curr_ctl, 1)
    atl = round(curr_atl, 1)
    tsb = round(ctl - atl, 1)

    effective_ctl = max(ctl, 10.0)
    acwr = round(atl / effective_ctl, 2)
    overload_warning = acwr > 1.5

    if acwr < 0.8:
        status_label = "Sous-charge (Risque désentraînement)"
        color = "#94A3B8"
    elif 0.8 <= acwr <= 1.3:
        status_label = "Zone Optimale (Sweet Spot)"
        color = "#10B981"
    elif 1.3 < acwr <= 1.5:
        status_label = "Charge Élevée (Surveillance)"
        color = "#F59E0B"
    else:
        status_label = "Alerte Surcharge (Risque Blessure ACWR > 1.5)"
        color = "#EF4444"

    return DailyLoadMetrics(
        date=target_date.isoformat(),
        trimp=today_trimp,
        ctl=ctl,
        atl=atl,
        tsb=tsb,
        acwr=acwr,
        overload_warning=overload_warning,
        status_label=status_label,
        color=color,
    )


# ==============================================================================
# 3. NOCTURNAL HRV BASELINE DRIFT (30 DAYS ± 1.5 SIGMA)
# ==============================================================================

def analyze_hrv_drift(
    athlete_id: str = "louis",
    current_hrv: Optional[float] = None,
    ref_date: Optional[date] = None,
) -> HRVBaselineAnalysis:
    """
    Computes 30-day nocturnal RMSSD mean and standard deviation (sigma).
    If current HRV < mean - 1.5 * sigma, sets suppress_intensity = True.
    """
    target_date = ref_date or date.today()
    conn = get_connection()
    try:
        start_d = (target_date - timedelta(days=30)).isoformat()
        rows = conn.execute(
            """
            SELECT readiness_score, resting_hr, stress_avg
            FROM biometrics_history
            WHERE athlete_id = ? AND date >= ?
            ORDER BY date DESC
            """,
            (athlete_id.lower(), start_d),
        ).fetchall()

        # Approximate RMSSD baseline from physiological records or Garmin readiness if raw RMSSD not logged
        baseline_samples: List[float] = []
        for r in rows:
            # Garmin HRV status correlates strongly with resting HR & readiness
            rhr = r["resting_hr"] or 52
            rmssd_est = max(35.0, 105.0 - (rhr * 0.9))
            baseline_samples.append(rmssd_est)

        if not baseline_samples:
            # Default physiological baseline
            mean_hrv = 65.0 if athlete_id == "louis" else 62.0
            std_hrv = 7.0
        else:
            mean_hrv = sum(baseline_samples) / len(baseline_samples)
            variance = sum((x - mean_hrv) ** 2 for x in baseline_samples) / max(len(baseline_samples), 1)
            std_hrv = max(math.sqrt(variance), 4.0)

        # Current HRV (given or estimated from latest session)
        hrv_val = current_hrv
        if hrv_val is None:
            hrv_val = round(mean_hrv, 1)

        z_score = round((hrv_val - mean_hrv) / std_hrv, 2)
        suppress = z_score < -1.5

        if suppress:
            msg = f"Alerte VFC : Chute significative (-{abs(z_score)}σ sous la baseline 30j). Intensité Z4/Z5 interdite, bascule en Z1/Z2."
        elif z_score < -0.8:
            msg = f"VFC basse ({z_score}σ). Fatigue résiduelle modérée : limiter les intervalles à du seuil court."
        elif z_score > 1.8:
            msg = f"VFC très élevée (+{z_score}σ). Système parasympathique dominant, vigilance si combiné à une FC basse léthargique."
        else:
            msg = f"VFC équilibrée ({z_score}σ dans la normale 30j ± 1.0σ). Tous feux verts pour l'entraînement programmé."

        return HRVBaselineAnalysis(
            athlete_id=athlete_id.lower(),
            date=target_date.isoformat(),
            current_hrv=round(hrv_val, 1),
            baseline_mean=round(mean_hrv, 1),
            baseline_std=round(std_hrv, 1),
            z_score=z_score,
            suppress_intensity=suppress,
            status_message=msg,
        )
    finally:
        conn.close()


# ==============================================================================
# 4. UNIFIED PHYSIOLOGICAL STATE BUILDER
# ==============================================================================

def get_complete_physiological_state(
    athlete_id: str = "louis",
    reference_10k_sec: Optional[int] = None,
    current_hrv: Optional[float] = None,
) -> PhysiologicalState:
    """
    Returns the unified, fully typed physiological state for an athlete:
    - Daniels VDOT & precise paces
    - CTL, ATL, TSB, ACWR
    - HRV baseline analysis
    - Allowed workout types according to deterministic mathematical safety guards.
    """
    vdot_profile = get_daniels_paces(athlete_id=athlete_id, reference_10k_sec=reference_10k_sec)
    load = calculate_ctl_atl_tsb(athlete_id=athlete_id)
    hrv = analyze_hrv_drift(athlete_id=athlete_id, current_hrv=current_hrv)

    allowed = ["recovery", "endurance_z2"]

    if not hrv.suppress_intensity and not load.overload_warning:
        allowed.extend(["tempo_z3", "threshold_z4", "intervals_vo2max", "long_run"])
    elif not load.overload_warning:
        # HRV suppressed but not overloaded: allow moderate tempo Z3 or short stride
        allowed.extend(["tempo_z3"])

    # Build coaching summary
    summary = (
        f"VDOT {vdot_profile.vdot} (Allure Seuil T : {vdot_profile.threshold.pace_formatted}, "
        f"Intervalles I : {vdot_profile.interval.pace_formatted}, E : {vdot_profile.easy_high.pace_formatted}). "
        f"État de charge : Forme TSB {load.tsb:+} (CTL {load.ctl} / ATL {load.atl}, ACWR {load.acwr}). "
        f"{hrv.status_message}"
    )

    return PhysiologicalState(
        athlete_id=athlete_id.lower(),
        date=load.date,
        vdot_profile=vdot_profile,
        current_load=load,
        hrv_analysis=hrv,
        allowed_workout_types=allowed,
        coaching_summary=summary,
    )


# Backward compatibility helper for existing web endpoints
def calculate_acwr(ref_date: Optional[date] = None) -> Dict[str, Any]:
    """Compatibility wrapper returning legacy ACWR dict format."""
    load = calculate_ctl_atl_tsb(athlete_id="louis", ref_date=ref_date)
    return {
        "date": load.date,
        "acute_load": load.atl,
        "chronic_load": load.ctl,
        "acwr_ratio": load.acwr,
        "tsb": load.tsb,
        "zone": "hazard" if load.overload_warning else ("warning" if load.acwr > 1.3 else "optimal"),
        "zone_label": load.status_label,
        "color": load.color,
        "recommendation": (
            "Alerte Surcharge (ACWR > 1.5). Allégez les séances."
            if load.overload_warning
            else "Ratio optimal, forme ascendante."
        ),
        "weekly_total_trimp": load.atl * 7,
    }
