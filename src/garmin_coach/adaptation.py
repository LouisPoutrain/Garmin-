"""
Closed-loop workout adaptation engine for Garmin Coach AI.
Evaluates morning biometrics + ACWR workload ratio against today's planned session
and automatically offers proactive workout adaptations to prevent overtraining.
"""
import json
from datetime import date, datetime
from typing import Any, Dict, Optional
from garmin_coach.database.db import get_connection
from garmin_coach.database.repository import WorkoutRepository


def evaluate_daily_adaptation(
    today_iso: str,
    readiness_score: int,
    body_battery: int,
    acwr_data: Dict[str, Any],
    planned_session: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Evaluates whether today's session needs physiological adaptation."""
    if not planned_session:
        return None

    sport = planned_session.get("sport", "")
    workout_type = planned_session.get("type", "")
    is_key = planned_session.get("is_key", False)

    # Don't adapt rest days or already light sessions
    if sport == "recovery" or "repos" in workout_type.lower():
        return None

    acwr_ratio = acwr_data.get("acwr_ratio", 1.0)
    trigger_reasons = []

    if readiness_score < 45:
        trigger_reasons.append(f"Score de préparation critique ({readiness_score}/100)")
    elif readiness_score < 55 and is_key:
        trigger_reasons.append(f"Récupération partielle ({readiness_score}/100) face à une séance clé")

    if body_battery < 35:
        trigger_reasons.append(f"Réserves d'énergie faibles (Body Battery {body_battery}%)")

    if acwr_ratio > 1.4:
        trigger_reasons.append(f"Charge aiguë trop forte (ACWR {acwr_ratio})")

    if not trigger_reasons:
        return None

    # Generate adaptation proposal
    reason_str = " & ".join(trigger_reasons)
    original_title = f"{planned_session.get('type')} ({planned_session.get('duration')})"

    if is_key or "fractionné" in workout_type.lower() or "seuil" in workout_type.lower():
        proposed_title = "Footing Régénératif Z1 (30 min)"
        proposed_structure = {
            "type": "continuous",
            "workout_name": "Régénération Active Z1 (30 min)",
            "duration_minutes": 30,
            "warmup_min": 5,
            "cooldown_min": 5,
            "hr_zone": "Z1",
            "hr_min": 100,
            "hr_max": 125,
        }
        coach_advice = (
            f"⚠️ Vos voyants physiologiques recommandent d'alléger l'effort aujourd'hui ({reason_str}). "
            "Convertir cette séance intensive en footing régénératif Zone 1 permettra d'assimiler la charge sans risquer de surcharge tendineuse."
        )
    else:
        proposed_title = "Repos complet & Récupération"
        proposed_structure = None
        coach_advice = (
            f"💤 Alerte fatigue détectée ({reason_str}). "
            "Il est vivement conseillé de faire une journée off complète pour restaurer votre système nerveux et votre sommeil."
        )

    proposal = {
        "date": today_iso,
        "trigger_reason": reason_str,
        "original_workout": original_title,
        "proposed_workout": proposed_title,
        "proposed_structure": proposed_structure,
        "coach_advice": coach_advice,
        "status": "pending",
    }

    # Store in database
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO coaching_adaptations
            (date, trigger_reason, original_workout, proposed_workout, proposed_structure, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """,
            (
                today_iso,
                reason_str,
                original_title,
                proposed_title,
                json.dumps(proposed_structure) if proposed_structure else None,
            ),
        )
        conn.commit()
        proposal["id"] = cur.lastrowid
    finally:
        conn.close()

    return proposal


def apply_adaptation(adaptation_id: int, garmin_client=None) -> Dict[str, Any]:
    """Applies a pending adaptation to the schedule and optionally reschedules on Garmin."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM coaching_adaptations WHERE id = ?", (adaptation_id,)
        ).fetchone()
        if not row:
            return {"status": "error", "message": "Proposition d'adaptation introuvable"}

        date_iso = row["date"]
        proposed_workout = row["proposed_workout"]
        proposed_structure = json.loads(row["proposed_structure"]) if row["proposed_structure"] else None

        # 1. Update SQLite planned_workouts
        struct_json = json.dumps(proposed_structure) if proposed_structure else None
        sport_type = "running" if proposed_structure else "recovery"
        conn.execute(
            """
            UPDATE planned_workouts
            SET workout_type = ?,
                duration = ?,
                sport = ?,
                intensity = 'Zone 1 (< 125 bpm)',
                focus = 'Séance adaptée pour récupération physiologique',
                is_key = 0,
                workout_structure = ?,
                status = 'adapted',
                updated_at = CURRENT_TIMESTAMP
            WHERE date = ?
            """,
            (
                proposed_workout,
                "30 min" if proposed_structure else "Journée off",
                sport_type,
                struct_json,
                date_iso,
            ),
        )

        # 2. Mark adaptation as applied
        conn.execute(
            """
            UPDATE coaching_adaptations
            SET status = 'applied', applied_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (adaptation_id,),
        )
        conn.commit()

        # 3. If running workout and Garmin client connected, re-schedule on Garmin
        garmin_msg = ""
        if proposed_structure and garmin_client:
            from garmin_coach.calendar_tracker import schedule_workout_to_garmin
            res = schedule_workout_to_garmin(
                garmin_client=garmin_client,
                date_iso=date_iso,
                workout_name=proposed_structure.get("workout_name", proposed_workout),
                duration_minutes=proposed_structure.get("duration_minutes", 30),
                hr_min=proposed_structure.get("hr_min"),
                hr_max=proposed_structure.get("hr_max"),
                workout_structure=proposed_structure,
            )
            if res.get("status") == "success":
                garmin_msg = " et séance adaptée reprogrammée sur votre montre Garmin !"

        return {
            "status": "success",
            "date": date_iso,
            "adapted_workout": proposed_workout,
            "message": f"Planning mis à jour : {proposed_workout}{garmin_msg}",
        }
    finally:
        conn.close()


def dismiss_adaptation(adaptation_id: int) -> Dict[str, Any]:
    """Dismisses an adaptation proposal."""
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE coaching_adaptations SET status = 'dismissed' WHERE id = ?",
            (adaptation_id,),
        )
        conn.commit()
        return {"status": "success", "message": "Proposition d'adaptation ignorée"}
    finally:
        conn.close()
