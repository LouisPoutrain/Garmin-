"""Biometric and activity analysis engine for Garmin Coach."""

from typing import Dict, Any, Optional
from garmin_coach.models import ReadinessLevel, ReadinessAssessment, WorkoutType, ActivityAnalysis
from garmin_coach.profile import AthleteProfile


class CoachAnalyzer:
    """Analyzes health metrics and workouts according to sports science principles."""

    def __init__(self, profile: AthleteProfile):
        self.profile = profile

    def evaluate_readiness(
        self,
        readiness_data: Optional[Dict[str, Any]] = None,
        sleep_data: Optional[Dict[str, Any]] = None,
        body_battery_data: Optional[Dict[str, Any]] = None,
        rhr_data: Optional[Dict[str, Any]] = None,
    ) -> ReadinessAssessment:
        """Evaluates current readiness and defines which workouts are safe/optimal."""
        
        # Extraction des métriques clés
        readiness_score = None
        if readiness_data:
            readiness_score = readiness_data.get("score") or readiness_data.get("trainingReadinessScore")

        sleep_score = None
        if sleep_data:
            daily_sleep = sleep_data.get("dailySleepDTO", {})
            sleep_score = daily_sleep.get("sleepScores", {}).get("overall", {}).get("value")

        body_battery = None
        if body_battery_data and isinstance(body_battery_data, list) and len(body_battery_data) > 0:
            body_battery = body_battery_data[-1].get("bodyBatteryLevel")

        resting_hr = None
        if rhr_data:
            resting_hr = rhr_data.get("restingHeartRate")

        advice = []

        # Règle d'évaluation
        # Vert : Readiness >= 65 et Sleep >= 70
        # Jaune : Readiness entre 45 et 64 ou sommeil moyen
        # Rouge : Readiness < 45 ou Body Battery très bas (< 25)
        
        effective_score = readiness_score if readiness_score is not None else 60
        
        if effective_score >= self.profile.min_readiness_for_intervals and (sleep_score is None or sleep_score >= 65):
            level = ReadinessLevel.GREEN
            summary = "Feu vert ! Votre corps est bien reposé et prêt pour une séance de qualité (intervalles, tempo ou sortie longue)."
            allowed = [
                WorkoutType.INTERVALS_VO2MAX,
                WorkoutType.THRESHOLD_Z4,
                WorkoutType.TEMPO_Z3,
                WorkoutType.ENDURANCE_Z2,
                WorkoutType.STRENGTH,
            ]
            advice.append("Profitez de cette fenêtre de fraîcheur pour placer votre séance la plus exigeante de la semaine.")
        elif effective_score >= 45:
            level = ReadinessLevel.YELLOW
            summary = "Vigilance modérée. Votre récupération est partielle. Privilégiez l'endurance fondamentale (Z2) ou une séance technique."
            allowed = [
                WorkoutType.ENDURANCE_Z2,
                WorkoutType.RECOVERY,
                WorkoutType.STRENGTH,
            ]
            advice.append("Évitez les intensités élevées au-delà de la Zone 2 pour ne pas creuser la dette de fatigue.")
            advice.append("Hydratez-vous bien et prévoyez un coucher plus tôt ce soir.")
        else:
            level = ReadinessLevel.RED
            summary = "Alerte fatigue / récupération insuffisante. Votre système nerveux et vos réserves nécessitent du repos."
            allowed = [
                WorkoutType.REST,
                WorkoutType.RECOVERY,
            ]
            advice.append("Priorité absolue à la récupération : repos complet ou marche active légère (Z1).")
            advice.append("Pas de fractionné ni de séance lourde aujourd'hui.")

        return ReadinessAssessment(
            level=level,
            readiness_score=readiness_score,
            sleep_score=sleep_score,
            body_battery=body_battery,
            resting_hr=resting_hr,
            hrv_status=None,
            recovery_hours_remaining=None,
            summary_message=summary,
            allowed_workout_types=allowed,
            advice=advice,
        )

    def analyze_activity(self, activity_data: Dict[str, Any]) -> ActivityAnalysis:
        """Analyzes a recorded activity to extract performance insights."""
        activity_id = activity_data.get("activityId", 0)
        name = activity_data.get("activityName", "Séance")
        type_key = activity_data.get("activityType", {}).get("typeKey", "running")
        duration_sec = activity_data.get("duration", 0)
        distance_meters = activity_data.get("distance", 0)

        duration_min = round(duration_sec / 60, 1)
        distance_km = round(distance_meters / 1000, 2)

        avg_hr = activity_data.get("averageHR")
        max_hr = activity_data.get("maxHR")
        aerobic_te = activity_data.get("aerobicTrainingEffect")
        anaerobic_te = activity_data.get("anaerobicTrainingEffect")

        takeaways = []
        if aerobic_te:
            if aerobic_te >= 4.0:
                takeaways.append(f"Impact aérobie très élevé ({aerobic_te:.1f}/5.0) : stimulus majeur, prévoir 48h de récupération.")
            elif aerobic_te >= 3.0:
                takeaways.append(f"Impact aérobie optimal ({aerobic_te:.1f}/5.0) : maintien et progression de l'endurance.")
            elif aerobic_te >= 2.0:
                takeaways.append(f"Impact aérobie modéré ({aerobic_te:.1f}/5.0) : idéal pour le foncier et la récupération active.")

        if anaerobic_te and anaerobic_te >= 2.0:
            takeaways.append(f"Charge anaérobie significative ({anaerobic_te:.1f}/5.0) : développement de la filière lactique et vitesse.")

        return ActivityAnalysis(
            activity_id=activity_id,
            activity_name=name,
            activity_type=type_key,
            start_time=activity_data.get("startTimeLocal", ""),
            duration_minutes=duration_min,
            distance_km=distance_km,
            avg_hr=int(avg_hr) if avg_hr else None,
            max_hr=int(max_hr) if max_hr else None,
            aerobic_training_effect=aerobic_te,
            anaerobic_training_effect=anaerobic_te,
            key_takeaways=takeaways,
            recovery_impact="Modéré à Élevé" if (aerobic_te and aerobic_te >= 3.5) else "Faible à Modéré",
        )
