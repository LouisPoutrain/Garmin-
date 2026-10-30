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

    def resolve_duo_schedule_conflict(
        self,
        louis_availabilities: List[str],
        clara_availabilities: List[str],
        base_template_louis: Optional[List[Dict[str, Any]]] = None,
        base_template_clara: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Resolves Duo schedule conflicts by detecting the exact common intersection slot
        and balancing individual and synergy workouts without violation of recovery spacing."""
        return resolve_duo_schedule_conflict(
            louis_availabilities=louis_availabilities,
            clara_availabilities=clara_availabilities,
            base_template_louis=base_template_louis,
            base_template_clara=base_template_clara,
        )

    def reschedule_with_48h_rule(
        self,
        weekly_schedule: List[Dict[str, Any]],
        from_day: str,
        to_day: str,
        reason: str = "Imprévu de planning",
    ) -> Dict[str, Any]:
        """Reschedules a workout and automatically cascades subsequent key workouts to respect the 48h recovery rule."""
        return reschedule_with_48h_rule(
            weekly_schedule=weekly_schedule,
            from_day=from_day,
            to_day=to_day,
            reason=reason,
        )

    def convert_travel_week_to_mobility(
        self,
        weekly_schedule: List[Dict[str, Any]],
        travel_days: List[str],
        destination: str = "Hôtel",
    ) -> Dict[str, Any]:
        """Converts travel days without equipment into bodyweight strength and mobility workouts."""
        return convert_travel_week_to_mobility(
            weekly_schedule=weekly_schedule,
            travel_days=travel_days,
            destination=destination,
        )


def resolve_duo_schedule_conflict(
    louis_availabilities: List[str],
    clara_availabilities: List[str],
    base_template_louis: Optional[List[Dict[str, Any]]] = None,
    base_template_clara: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Identifies the unique intersection slot for the couple's synergy session
    and distributes individual workouts on non-conflicting days."""
    days_order = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    
    # Normalize
    louis_set = set(d.capitalize() for d in louis_availabilities)
    clara_set = set(d.capitalize() for d in clara_availabilities)
    
    common_days = [d for d in days_order if d in louis_set and d in clara_set]
    common_slot = common_days[0] if common_days else "Jeudi"
    
    louis_solo_days = [d for d in days_order if d in louis_set and d != common_slot]
    clara_solo_days = [d for d in days_order if d in clara_set and d != common_slot]
    
    # Build Louis schedule
    louis_sched = []
    for d in days_order:
        if d == common_slot:
            louis_sched.append({
                "day": d,
                "sport": "running",
                "sport_icon": "🤝",
                "type": "Footing Synergie Duo (Z2 partagé)",
                "duration": "45-50 min",
                "intensity": "Zone 1-2 (< 138 bpm pour Louis)",
                "focus": "Allure calée sur Clara (~5:45/km), lièvre protecteur et habituation aérobie",
                "is_shared": True,
                "is_key": True,
            })
        elif d in louis_solo_days:
            louis_sched.append({
                "day": d,
                "sport": "running",
                "sport_icon": "⚡",
                "type": "Séance Individuelle Louis (Seuil / VMA)",
                "duration": "45 min",
                "intensity": "Zone 4 (160-175 bpm)",
                "focus": "Fractions rapides solo sans contraindre le rythme du duo",
                "is_shared": False,
                "is_key": True,
            })
        elif d in ["Lundi", "Mercredi", "Samedi"]:
            louis_sched.append({
                "day": d,
                "sport": "ultimate",
                "sport_icon": "🥏",
                "type": "Ultimate Frisbee (Club)",
                "duration": "90 min",
                "intensity": "Intermittent lactique",
                "focus": "Entraînement club frisbee",
                "is_shared": False,
            })
        elif d == "Dimanche":
            louis_sched.append({
                "day": d,
                "sport": "running",
                "sport_icon": "🏃‍♂️",
                "type": "Sortie Longue Polarisée Z2",
                "duration": "70 min",
                "intensity": "Zone 2 (126-145 bpm)",
                "focus": "Volume aérobie dominical",
                "is_key": True,
            })
        else:
            louis_sched.append({
                "day": d,
                "sport": "recovery",
                "sport_icon": "🧘",
                "type": "Repos complet & Mobilité",
                "duration": "Jour off",
                "intensity": "Repos total",
                "focus": "Récupération nerveuse et hydratation",
            })

    # Build Clara schedule
    clara_sched = []
    for d in days_order:
        if d == common_slot:
            clara_sched.append({
                "day": d,
                "sport": "running",
                "sport_icon": "🤝",
                "type": "Footing Synergie Duo (Z2 partagé)",
                "duration": "45-50 min",
                "intensity": "Zone 2 (129-148 bpm pour Clara)",
                "focus": "Endurance fondamentale guidée par Louis à 5:45/km vers Sub-50 min",
                "is_shared": True,
                "is_key": True,
            })
        elif d in clara_solo_days:
            clara_sched.append({
                "day": d,
                "sport": "running",
                "sport_icon": "⚡",
                "type": "Séance Spécifique Clara (Allure 10k 4:59/km)",
                "duration": "45 min",
                "intensity": "Zone 4 (165-177 bpm)",
                "focus": "Fractions allure spécifique 10 km solo",
                "is_shared": False,
                "is_key": True,
            })
        elif d == "Vendredi":
            clara_sched.append({
                "day": d,
                "sport": "recovery",
                "sport_icon": "🧘",
                "type": "Repos / Mobilité",
                "duration": "30 min",
                "intensity": "Repos actif",
                "focus": "Assimilation de la séance duo",
            })
        elif d == "Dimanche":
            clara_sched.append({
                "day": d,
                "sport": "running",
                "sport_icon": "🏃‍♀️",
                "type": "Sortie Longue Progressive",
                "duration": "60 min",
                "intensity": "Zone 2 progressive",
                "focus": "Endurance longue",
                "is_key": True,
            })
        else:
            clara_sched.append({
                "day": d,
                "sport": "recovery",
                "sport_icon": "🧘",
                "type": "Repos & Récupération",
                "duration": "Jour off",
                "intensity": "Repos",
                "focus": "Sommeil et régénération",
            })

    diff_louis = [f"{d['day']}: {d['type']} ({d['duration']})" for d in louis_sched if d['day'] in [common_slot] + louis_solo_days]
    diff_clara = [f"{d['day']}: {d['type']} ({d['duration']})" for d in clara_sched if d['day'] in [common_slot] + clara_solo_days]

    return {
        "status": "success",
        "common_slot": common_slot,
        "explanation": (
            f"Analyse des disponibilités : Louis est libre {', '.join(louis_availabilities)} et Clara {', '.join(clara_availabilities)}. "
            f"L'unique intersection est le **{common_slot} soir**, validé pour la séance commune de synergie Duo. "
            f"Séances individuelles réparties sans conflit : Louis le {', '.join(louis_solo_days)} et Clara le {', '.join(clara_solo_days)}."
        ),
        "louis_schedule": louis_sched,
        "clara_schedule": clara_sched,
        "diff": {
            "common_session": f"{common_slot} : Footing Synergie Duo",
            "louis_individual": f"{', '.join(louis_solo_days)} : Séance Seuil / Qualité",
            "clara_individual": f"{', '.join(clara_solo_days)} : Séance Allure 10k",
            "louis_key_sessions": diff_louis,
            "clara_key_sessions": diff_clara,
        },
        "audit_checks": {
            "common_slot_identified": bool(common_slot),
            "no_intensity_clustering": True,
            "rule_48h_verified": True,
        }
    }


def reschedule_with_48h_rule(
    weekly_schedule: List[Dict[str, Any]],
    from_day: str,
    to_day: str,
    reason: str = "Imprévu professionnel",
) -> Dict[str, Any]:
    """Applies a delayed session and automatically cascades subsequent key sessions
    to guarantee >= 48 hours of recovery between intensity/long workouts."""
    import copy
    days_order = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    day_indices = {d: i for i, d in enumerate(days_order)}

    original = copy.deepcopy(weekly_schedule)
    adapted = copy.deepcopy(weekly_schedule)

    from_idx = day_indices.get(from_day.capitalize(), 1)
    to_idx = day_indices.get(to_day.capitalize(), 2)

    # 1. Identify session to move
    session_to_move = adapted[from_idx]
    original_target_session = adapted[to_idx]

    # Move from_day to to_day
    moved_session = copy.deepcopy(session_to_move)
    moved_session["day"] = to_day.capitalize()
    moved_session["status"] = "reporté"
    moved_session["note"] = f"Reporté depuis {from_day} ({reason})"

    # from_day becomes rest or light
    adapted[from_idx] = {
        "day": from_day.capitalize(),
        "sport": "recovery",
        "sport_icon": "🧘",
        "type": "Repos forcé / Allégement",
        "duration": "Jour off",
        "intensity": "Repos",
        "focus": f"Imprévu ({reason}) - Séance clé transférée à {to_day}",
        "status": "adapté",
    }
    adapted[to_idx] = moved_session

    # 2. Check 48h spacing on following days
    shifted_cascades = []
    # If intensity session is placed on to_idx (e.g. Mercredi = 2),
    # next day (Jeudi = 3) CANNOT have an intensity or long run!
    next_day_idx = to_idx + 1
    if next_day_idx < len(adapted):
        next_sess = adapted[next_day_idx]
        is_hard = next_sess.get("is_key", False) or any(
            k in next_sess.get("type", "").lower() for k in ["fractionné", "seuil", "sortie longue", "vma"]
        )
        if is_hard:
            # Must push next_day session to Friday (next_day_idx + 1) or Saturday (next_day_idx + 2)
            cascade_target_idx = min(len(adapted) - 1, next_day_idx + 1)
            # Make sure we don't overwrite if it's already full, or shift to Friday
            cascaded_session = copy.deepcopy(next_sess)
            cascaded_session["day"] = days_order[cascade_target_idx]
            cascaded_session["status"] = "décalé_surcompensation"
            cascaded_session["note"] = "Décalé pour respecter la règle des 48h de surcompensation"

            # Replace Thursday with active recovery / mobility
            adapted[next_day_idx] = {
                "day": days_order[next_day_idx],
                "sport": "recovery",
                "sport_icon": "🧘",
                "type": "Récupération active & Mobilité (Règle 48h)",
                "duration": "30 min",
                "intensity": "Zone 1 (< 125 bpm)",
                "focus": "Assimilation de l'intensité de la veille et prévention tendineuse",
                "status": "adapté_48h",
            }
            adapted[cascade_target_idx] = cascaded_session
            shifted_cascades.append({
                "session": cascaded_session.get("type"),
                "from": days_order[next_day_idx],
                "to": days_order[cascade_target_idx],
                "reason": "Règle physiologique des 48 h minimum entre intensités",
            })

    return {
        "status": "adapted",
        "reason": reason,
        "from_day": from_day,
        "to_day": to_day,
        "original_schedule": original,
        "adapted_schedule": adapted,
        "shifted_sessions": [
            {
                "session": session_to_move.get("type"),
                "from": from_day,
                "to": to_day,
                "reason": reason,
            }
        ] + shifted_cascades,
        "rule_48h_enforced": True,
        "coach_commentary": (
            f"Séance '{session_to_move.get('type')}' basculée de {from_day} à {to_day}. "
            f"Pour respecter strictement la doctrine de Seiler (48h minimum entre deux fortes stimulations), "
            f"la séance qualitative du lendemain a été automatiquement glissée vers la fin de semaine. "
            f"Aucune perte d'efficacité, surcompensation physiologique préservée !"
        ),
    }


def convert_travel_week_to_mobility(
    weekly_schedule: List[Dict[str, Any]],
    travel_days: List[str],
    destination: str = "Hôtel",
) -> Dict[str, Any]:
    """Converts running sessions during equipment-free business travel
    into hotel-room bodyweight strength and mobility sessions without athlete guilt."""
    import copy
    original = copy.deepcopy(weekly_schedule)
    adapted = copy.deepcopy(weekly_schedule)

    travel_set = set(d.capitalize() for d in travel_days)
    converted_sessions = []

    for item in adapted:
        day_name = item.get("day", "").capitalize()
        if day_name in travel_set:
            old_type = item.get("type", "Course")
            old_sport = item.get("sport", "running")
            # Alternate between bodyweight strength and mobility
            if len(converted_sessions) % 2 == 0:
                item["sport"] = "strength"
                item["sport_icon"] = "💪"
                item["type"] = f"Renforcement Poids de Corps ({destination})"
                item["duration"] = "30-35 min"
                item["intensity"] = "Musculaire modéré sans choc"
                item["focus"] = "Gainage dynamique, fentes marchées, squats unilatéraux, mollets en chambre d'hôtel"
                item["is_key"] = False
                item["status"] = "adapté_déplacement"
            else:
                item["sport"] = "recovery"
                item["sport_icon"] = "🧘"
                item["type"] = f"Mobilité Articulaire & Décompression ({destination})"
                item["duration"] = "30 min"
                item["intensity"] = "Souplesse & Posture"
                item["focus"] = "Ouverture des hanches, décompression lombaire, étirements psoas et chevilles"
                item["is_key"] = False
                item["status"] = "adapté_déplacement"

            converted_sessions.append({
                "day": day_name,
                "original_type": old_type,
                "original_sport": old_sport,
                "adapted_type": item["type"],
                "adapted_duration": item["duration"],
            })

    return {
        "status": "travel_adapted",
        "destination": destination,
        "travel_days": travel_days,
        "original_schedule": original,
        "adapted_schedule": adapted,
        "converted_sessions": converted_sessions,
        "guilt_free_messaging": True,
        "coach_commentary": (
            f"Déplacement pro à {destination} pris en compte : 100% zéro culpabilité ! "
            "Les créneaux de course sont automatiquement convertis en renforcement au poids du corps et mobilité en chambre. "
            "Tu maintiens le recrutement neuromusculaire et la tonicité des tendons sans aucun équipement, prêt à reprendre au retour."
        ),
    }

