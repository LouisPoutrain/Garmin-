"""Training planner and workout generator for Garmin Coach."""

from typing import Dict, Any, List, Optional
from garmin_coach.models import WorkoutType, PrescribedWorkout, ReadinessAssessment, ReadinessLevel
from garmin_coach.profile import AthleteProfile


class CoachPlanner:
    """Plans workouts and builds weekly schedules adhering to 80/20 polarized training."""

    def __init__(self, profile: AthleteProfile):
        self.profile = profile

    def recommend_daily_workout(self, readiness: ReadinessAssessment, preferred_sport: str = "running") -> PrescribedWorkout:
        """Prescribes the optimal workout for today based on current readiness."""
        z2_range = self.profile.hr_zones.get("Z2_endurance", [125, 145])
        z4_range = self.profile.hr_zones.get("Z4_threshold", [160, 175])

        if readiness.level == ReadinessLevel.RED:
            return PrescribedWorkout(
                sport="recovery",
                workout_type=WorkoutType.REST,
                title="Journée Récupération & Sommeil",
                description="Repos complet ou 30 min de marche très douce / étirements légers. L'objectif est de refaire vos réserves.",
                duration_minutes=30,
                target_zone="Z1 / Repos",
            )
        elif readiness.level == ReadinessLevel.YELLOW:
            return PrescribedWorkout(
                sport=preferred_sport,
                workout_type=WorkoutType.ENDURANCE_Z2,
                title=f"Foncier Z2 - {preferred_sport.capitalize()} 45 min",
                description=(
                    f"Séance en pure endurance fondamentale. Restez strictement entre {z2_range[0]} et {z2_range[1]} bpm. "
                    "Vous devez être capable de tenir une conversation continue sans essoufflement."
                ),
                duration_minutes=45,
                target_zone="Z2",
                target_hr_range=tuple(z2_range),
            )
        else: # GREEN
            return PrescribedWorkout(
                sport=preferred_sport,
                workout_type=WorkoutType.INTERVALS_VO2MAX,
                title=f"Fractionné Seuil / VO2 Max - {preferred_sport.capitalize()}",
                description=(
                    "Échauffement 15 min Z1/Z2 + Gammes. Corps de séance : 6 x (2 min à allure Z4/Z5 puis 1 min 30 récup trot Z1). "
                    "Retour au calme 10 min Z1."
                ),
                duration_minutes=50,
                target_zone="Z4-Z5",
                target_hr_range=tuple(z4_range),
                intervals={"repeats": 6, "work_sec": 120, "rest_sec": 90},
            )

    def generate_weekly_template(self, memory: Optional[Any] = None) -> List[Dict[str, Any]]:
        """Returns a 7-day balanced microcycle tailored to athlete's constraints, sports, and active phase."""
        sports = [s.lower() for s in self.profile.primary_sports]
        is_ultimate_player = any("ultimate" in s for s in sports)

        # Check if athlete is in progressive resumption phase
        is_resumption = True
        if memory:
            mem_facts = memory.data.get("facts", {}) if hasattr(memory, "data") else {}
            all_facts = " ".join(mem_facts.get("preferences", []) + mem_facts.get("active_goals", []) + mem_facts.get("schedule_constraints", [])).lower()
            if "seuil" in all_facts and "reprise" not in all_facts:
                is_resumption = False

        if is_ultimate_player:
            if is_resumption:
                return [
                    {
                        "day": "Lundi",
                        "sport": "ultimate",
                        "sport_icon": "🥏",
                        "type": "Ultimate Frisbee (Club)",
                        "duration": "90 min",
                        "intensity": "Anaérobie / Sprints",
                        "focus": "Filière lactique, changements de direction et vitesse de réaction",
                    },
                    {
                        "day": "Mardi",
                        "sport": "running",
                        "sport_icon": "🏃‍♂️",
                        "type": "Reprise Running - Séance 1 (Z2 / Intermittent doux)",
                        "duration": "35-40 min",
                        "intensity": "Z2 stricte (126-145 bpm)",
                        "focus": "Habituation tendineuse et articulaire, alternance marche/course très souple",
                        "is_key": True,
                    },
                    {
                        "day": "Mercredi",
                        "sport": "ultimate",
                        "sport_icon": "🥏",
                        "type": "Ultimate Frisbee (Club)",
                        "duration": "90 min",
                        "intensity": "Jeu & Intensité",
                        "focus": "Sprints répétés et puissance intermittente",
                    },
                    {
                        "day": "Jeudi",
                        "sport": "cycling",
                        "sport_icon": "🚴",
                        "type": "Récupération active / Décrassage vélo doux",
                        "duration": "30-40 min",
                        "intensity": "Zone 1 très douce (< 125 bpm)",
                        "focus": "Drainage musculaire sans aucun impact mécanique, faire tourner les jambes",
                    },
                    {
                        "day": "Vendredi",
                        "sport": "running",
                        "sport_icon": "🏃‍♂️",
                        "type": "Running Z2 - Séance 2 (Endurance Fondamentale)",
                        "duration": "30-35 min",
                        "intensity": "Zone 2 (126-145 bpm)",
                        "focus": "Développement du moteur aérobie de base, allure conversationnelle sans fatigue",
                        "is_key": True,
                    },
                    {
                        "day": "Samedi",
                        "sport": "ultimate",
                        "sport_icon": "🥏",
                        "type": "Ultimate Frisbee (Match / Club)",
                        "duration": "90-120 min",
                        "intensity": "Haute intensité",
                        "focus": "Opposition tactique et compétition",
                    },
                    {
                        "day": "Dimanche",
                        "sport": "recovery",
                        "sport_icon": "🧘",
                        "type": "Repos complet & Régénération",
                        "duration": "Journée off",
                        "intensity": "Repos total",
                        "focus": "Sommeil, hydratation, régénération nerveuse avant la semaine suivante",
                    },
                ]
            else:
                return [
                    {
                        "day": "Lundi",
                        "sport": "ultimate",
                        "sport_icon": "🥏",
                        "type": "Ultimate Frisbee (Club)",
                        "duration": "90 min",
                        "intensity": "Anaérobie / Sprints",
                        "focus": "Filière lactique, changements de direction et vitesse de réaction",
                    },
                    {
                        "day": "Mardi",
                        "sport": "running",
                        "sport_icon": "🏃‍♂️",
                        "type": "Endurance Fondamentale Z2",
                        "duration": "40-45 min",
                        "intensity": "Z2 stricte (126-145 bpm)",
                        "focus": "Récupération active aérobie, drainage et capillarisation sans choc",
                    },
                    {
                        "day": "Mercredi",
                        "sport": "ultimate",
                        "sport_icon": "🥏",
                        "type": "Ultimate Frisbee (Club)",
                        "duration": "90 min",
                        "intensity": "Jeu & Intensité",
                        "focus": "Sprints répétés et puissance intermittente",
                    },
                    {
                        "day": "Jeudi",
                        "sport": "running",
                        "sport_icon": "⚡",
                        "type": "Séance Clé : Seuil Sub-40 (4:05-4:15/km)",
                        "duration": "50 min",
                        "intensity": "Zone 4 (161-175 bpm)",
                        "focus": "Fractionné long au seuil (ex: 3 x 2000m) pour débloquer le 4:00/km",
                        "is_key": True,
                    },
                    {
                        "day": "Vendredi",
                        "sport": "recovery",
                        "sport_icon": "🧘",
                        "type": "Repos / Mobilité & Prévention",
                        "duration": "30 min",
                        "intensity": "Repos complet",
                        "focus": "Mobilité hanches/ischios, hydratation et préparation du weekend",
                    },
                    {
                        "day": "Samedi",
                        "sport": "ultimate",
                        "sport_icon": "🥏",
                        "type": "Ultimate Frisbee (Match / Club)",
                        "duration": "90-120 min",
                        "intensity": "Haute intensité",
                        "focus": "Compétition ou opposition soutenue",
                    },
                    {
                        "day": "Dimanche",
                        "sport": "running",
                        "sport_icon": "🏃‍♂️",
                        "type": "Sortie Longue Polarisée Z2 (+ fin progressive)",
                        "duration": "65-75 min",
                        "intensity": "Zone 2 (126-145 bpm)",
                        "focus": "Endurance lipidique et résistance musculaire globale",
                        "is_key": True,
                    },
                ]

        # Standard polarized schedule if not an ultimate player
        return [
            {
                "day": "Lundi",
                "sport": "recovery",
                "sport_icon": "🧘",
                "type": "Repos / Mobilité",
                "duration": "30 min",
                "focus": "Récupération passive ou étirements doux",
            },
            {
                "day": "Mardi",
                "sport": "running",
                "sport_icon": "🏃‍♂️",
                "type": "Endurance Fondamentale Z2",
                "duration": "45-50 min",
                "focus": "Développement du réseau capillaire et oxydation des lipides",
            },
            {
                "day": "Mercredi",
                "sport": "running",
                "sport_icon": "⚡",
                "type": "Séance Clé (Fractionné Seuil)",
                "duration": "50 min",
                "focus": "Intervalles courts ou moyens pour stimuler la VO2 Max",
                "is_key": True,
            },
            {
                "day": "Jeudi",
                "sport": "strength",
                "sport_icon": "💪",
                "type": "Renforcement / Gainage",
                "duration": "40 min",
                "focus": "Stabilité du tronc, hanches, mollets et prévention des blessures",
            },
            {
                "day": "Vendredi",
                "sport": "recovery",
                "sport_icon": "🧘",
                "type": "Repos actif",
                "duration": "30 min",
                "focus": "Marche décontractée ou repos complet",
            },
            {
                "day": "Samedi",
                "sport": "cycling",
                "sport_icon": "🚴",
                "type": "Vélo croisé Z2",
                "duration": "60 min",
                "focus": "Volume aérobie sans impact articulaire excessif",
            },
            {
                "day": "Dimanche",
                "sport": "running",
                "sport_icon": "🏃‍♂️",
                "type": "Sortie Longue progressive Z2",
                "duration": "75-90 min",
                "focus": "Résistance mentale et endurance de longue durée",
                "is_key": True,
            },
        ]
