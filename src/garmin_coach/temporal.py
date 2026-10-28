"""Temporal anchoring and calendar calculation engine for Garmin Coach.

Prevents LLM hallucinations regarding days of the week, relative dates,
and past vs. future activities.
"""

from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional

JOURS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
MOIS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
]


def get_day_name_fr(d: date) -> str:
    """Returns the French day of the week (e.g. 'Dimanche')."""
    return JOURS_FR[d.weekday()]


def format_full_date_fr(d: date) -> str:
    """Returns date formatted in French (e.g. 'Dimanche 18 octobre 2026')."""
    return f"{JOURS_FR[d.weekday()]} {d.day} {MOIS_FR[d.month - 1]} {d.year}"


def format_relative_date_fr(target_date: date, ref_date: Optional[date] = None) -> str:
    """Formats a date with its day name and relative position (e.g. 'Mercredi 14/10/2026 (il y a 4 jours)')."""
    ref = ref_date or date.today()
    day_name = JOURS_FR[target_date.weekday()]
    date_str = f"{day_name} {target_date.day:02d}/{target_date.month:02d}/{target_date.year}"
    
    delta = (ref - target_date).days
    if delta == 0:
        return f"{date_str} (Aujourd'hui)"
    elif delta == 1:
        return f"{date_str} (Hier)"
    elif delta == -1:
        return f"{date_str} (Demain)"
    elif delta > 1:
        return f"{date_str} (Il y a {delta} jours)"
    else:
        return f"{date_str} (Dans {abs(delta)} jours)"


def parse_iso_or_local_date(date_val: Any) -> Optional[date]:
    """Safely parses various date string formats to a date object."""
    if isinstance(date_val, (date, datetime)):
        return date_val.date() if isinstance(date_val, datetime) else date_val
    if not date_val or not isinstance(date_val, str):
        return None
    try:
        clean = date_val.strip()[:10]
        return datetime.strptime(clean, "%Y-%m-%d").date()
    except Exception:
        return None


def get_temporal_context(
    ref_date: Optional[date] = None,
    weekly_template: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Builds a comprehensive temporal reference dictionary for the Coach LLM, synchronized with the weekly template."""
    today = ref_date or date.today()
    hier = today - timedelta(days=1)
    demain = today + timedelta(days=1)
    
    # Calculate next Tuesday (first agreed resumption day for Louis)
    days_until_tuesday = (1 - today.weekday()) % 7
    if days_until_tuesday == 0:
        days_until_tuesday = 7
    mardi = today + timedelta(days=days_until_tuesday)

    # If no weekly template provided, lazy load from CoachPlanner
    if weekly_template is None:
        try:
            from garmin_coach.profile import AthleteProfile
            from garmin_coach.planner import CoachPlanner
            from garmin_coach.memory import CoachMemory
            prof = AthleteProfile.load()
            mem = CoachMemory()
            planner = CoachPlanner(prof)
            weekly_template = planner.generate_weekly_template(memory=mem)
        except Exception:
            weekly_template = []

    # 7-day upcoming calendar mapped directly from weekly_template
    upcoming_calendar = []
    for i in range(1, 8):
        future_d = today + timedelta(days=i)
        d_name = JOURS_FR[future_d.weekday()]
        
        # Match day from planner template
        matched = next((w for w in (weekly_template or []) if w.get("day", "").lower() == d_name.lower()), None)
        if matched:
            role = f"{matched.get('sport_icon', '')} {matched.get('type', '')} ({matched.get('duration', '')}) - {matched.get('intensity', '')}".strip()
        else:
            role = "Repos ou séance libre"

        upcoming_calendar.append({
            "day_name": d_name,
            "date_iso": future_d.isoformat(),
            "date_fr": f"{d_name} {future_d.day}/{future_d.month:02d}",
            "scheduled_role": role,
            "scheduled_details": matched or {},
            "days_ahead": i,
        })

    return {
        "today_iso": today.isoformat(),
        "today_day": JOURS_FR[today.weekday()],
        "today_formatted": format_full_date_fr(today),
        "yesterday_iso": hier.isoformat(),
        "yesterday_day": JOURS_FR[hier.weekday()],
        "yesterday_formatted": format_full_date_fr(hier),
        "tomorrow_iso": demain.isoformat(),
        "tomorrow_day": JOURS_FR[demain.weekday()],
        "tomorrow_formatted": format_full_date_fr(demain),
        "tuesday_iso": mardi.isoformat(),
        "tuesday_day": JOURS_FR[mardi.weekday()],
        "tuesday_formatted": format_full_date_fr(mardi),
        "upcoming_calendar": upcoming_calendar,
    }
