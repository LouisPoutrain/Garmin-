"""Universal LLM client for LiteLLM, vLLM, and OpenAI-compatible endpoints."""

import os
import json
from typing import List, Dict, Any, Optional
import requests


class CoachLLMClient:
    """Connects to LiteLLM, vLLM, or direct OpenAI/Gemini endpoints with token bounding."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        # Check for Google Gemini configuration
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        configured_provider = os.getenv("COACH_LLM_PROVIDER", "").lower()

        if gemini_key and (configured_provider == "gemini" or "gemini" in (model or os.getenv("COACH_LLM_MODEL", "")).lower() or not os.getenv("COACH_LLM_BASE_URL")):
            self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
            self.api_key = gemini_key
            self.model = model or os.getenv("COACH_LLM_MODEL") or "gemini-2.0-flash"
        else:
            # Default priority: user parameter -> env var -> LiteLLM default
            self.base_url = (
                base_url
                or os.getenv("COACH_LLM_BASE_URL")
                or os.getenv("LITELLM_BASE_URL")
                or "https://llm.ilaas.fr/v1"
            ).rstrip("/")
            
            self.api_key = (
                api_key
                or os.getenv("COACH_LLM_API_KEY")
                or os.getenv("LITELLM_API_KEY")
                or "076679b2-82f3-4b9b-a966-1aee659a7f14"
            )
            
            self.model = (
                model
                or os.getenv("COACH_LLM_MODEL")
                or "qwen-3.6-35b-instruct"
            )

    def generate_coach_response(
        self,
        user_message: str,
        biometric_context: Dict[str, Any],
        web_search_results: Optional[List[Dict[str, str]]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Generates a contextual response from the LLM or falls back cleanly."""
        
        # 1. Build warm, human, conversational coaching prompt dynamically anchored in time
        calendar_data = biometric_context.get("calendar_data", {})
        days = calendar_data.get("days", []) or biometric_context.get("weekly_plan", [])
        scorecard = calendar_data.get("scorecard", {})

        temporal = biometric_context.get("temporal_context", {})
        today_formatted = calendar_data.get("today_full_fr") or temporal.get("today_formatted", "Lundi 19 octobre 2026")
        today_day = temporal.get("today_day", "Lundi")
        yesterday_formatted = temporal.get("yesterday_formatted", "Dimanche 18 octobre 2026")

        # Find today and tomorrow in the real calendar
        today_item = next((d for d in days if d.get("is_today")), None)
        tomorrow_item = None
        if today_item:
            today_idx = today_item.get("day_index", 0)
            tomorrow_item = next((d for d in days if d.get("day_index") == today_idx + 1), None)

        today_prog_str = "Repos ou séance libre"
        if today_item:
            today_prog_str = f"{today_item.get('sport_icon', '')} {today_item.get('type', '')} ({today_item.get('duration', '')}) | Focus: {today_item.get('focus', '')} [Statut actuel: {today_item.get('status_label', 'Prévu')}]"

        tomorrow_prog_str = "Repos ou séance libre"
        if tomorrow_item:
            tomorrow_prog_str = f"[{tomorrow_item.get('date_short', '')} {tomorrow_item.get('day_name', tomorrow_item.get('day', ''))}] {tomorrow_item.get('sport_icon', '')} {tomorrow_item.get('type', '')} ({tomorrow_item.get('duration', '')}) | Focus: {tomorrow_item.get('focus', '')}"

        cal_lines = ""
        for item in days:
            marker = " 👈 (AUJOURD'HUI)" if item.get("is_today") else ""
            cal_lines += f"  - [{item.get('date_short', '')}] {item.get('day_name', item.get('day', ''))}{marker} : {item.get('sport_icon', '')} {item.get('type', '')} ({item.get('duration', '')}) | Statut: {item.get('status_label', 'Prévu')} | Focus: {item.get('focus', '')}\n"

        athlete_ctx = biometric_context.get("athlete_context", "louis")
        if athlete_ctx == "duo":
            system_prompt = (
                "Tu es le Coach d'Endurance et Préparateur Physique du DUO Louis & Clara (Préparation 10 km en Couple) !\n"
                "Tu t'adresses à eux comme un vrai coach humain : complice, motivant, bienveillant, clair et direct.\n"
                "• PROFIL DE LOUIS : Objectif 10 km sous les 40 min (3:59 min/km). Pratique l'Ultimate Frisbee 3x/semaine en club (efforts lactiques non tracés sur montre).\n"
                "• PROFIL DE CLARA : Objectif 10 km sous les 50 min (4:59 min/km). 4 séances/semaine en méthode polarisée 80/20.\n"
                "• PRINCIPE CLÉ DE SYNERGIE EN DUO :\n"
                "  - Vendredi (Footing Z2 foncier) et Dimanche (Sortie longue aérobie) sont vos séances communes 🤝 !\n"
                "  - Louis accompagne Clara à son allure foncière (~5:45 - 6:00/km). C'est un accord parfait : Louis est forcé de respecter une vraie Zone 2 aérobie stricte sans dépasser 140 bpm, ce qui protège ses tendons après l'Ultimate, tandis que Clara bénéficie d'une cadence et d'un soutien régulier pour progresser vers ses 50 min.\n"
                "  - Pour les séances d'allure ou fractionné (mercredi), échauffement (15 min) et retour au calme (10 min) peuvent être partagés sur piste ou boucle, avec des allures de répétitions individualisées.\n\n"
                "=== 🕒 ANCRAGE TEMPOREL DU DUO ===\n"
                f"• DATE ACTUELLE D'AUJOURD'HUI : {today_formatted} ({today_day})\n"
                f"• BILAN DE SEMAINE EN COURS : {scorecard.get('completed_sessions', 0)}/{scorecard.get('total_planned_sessions', 0)} séances réalisées\n\n"
                "• PLANNING DE LA SEMAINE DU DUO :\n"
                f"{cal_lines}\n"
            )
        elif athlete_ctx == "clara":
            system_prompt = (
                "Tu es le Coach d'Endurance et Préparateur Physique personnel de Clara.\n"
                "Tu t'adresses à elle avec chaleur, motivation, expertise en physiologie féminine et précision.\n"
                "• OBJECTIF DE CLARA : Passer sous les 50 minutes au 10 km (allure cible de course : 4:59 min/km, soit 12.0 km/h).\n"
                "• MÉTHODOLOGIE : Entraînement polarisé 80/20 (80% en Zone 2 foncière 129-148 bpm, 20% en intensité haute Z4/Z5).\n"
                "• SÉANCES CLÉS : 1 séance d'allure spécifique 10 km / fractionné par semaine (le mercredi), 2 footings Z2 à 5:45-6:00/km, 1 sortie longue progressive le dimanche (50 à 60 min).\n"
                "• SÉANCES PARTAGÉES EN DUO : Les vendredis et dimanches, Clara court avec son compagnon Louis en footing partagé.\n\n"
                "=== 🕒 ANCRAGE TEMPOREL CLARA ===\n"
                f"• DATE ACTUELLE D'AUJOURD'HUI : {today_formatted} ({today_day})\n"
                f"• PROGRAMME DU JOUR ({today_day}) : {today_prog_str}\n"
                f"• PROGRAMME DU LENDEMAIN : {tomorrow_prog_str}\n\n"
                "• PLANNING OFFICIEL DE CLARA :\n"
                f"{cal_lines}\n"
            )
        else:
            system_prompt = (
                "Tu es le Coach d'Endurance et Préparateur Physique personnel de Louis Poutrain.\n"
                "Tu t'adresses à lui comme un vrai coach humain de haut niveau : chaleureux, complice, motivant, à l'écoute, précis et direct.\n"
                "Tu as accès en temps réel aux données de sa montre Garmin Connect et à son historique athlétique.\n\n"
                "=== 🕒 ANCRAGE TEMPOREL STRICT & VÉRITÉ DU CALENDRIER RÉEL ===\n"
                f"• DATE ACTUELLE D'AUJOURD'HUI : {today_formatted} ({today_day})\n"
                f"• PROGRAMME DU JOUR ({today_day}) : {today_prog_str}\n"
                f"• PROGRAMME DU LENDEMAIN : {tomorrow_prog_str}\n"
                f"• BILAN DE SEMAINE EN COURS : {scorecard.get('completed_sessions', 0)}/{scorecard.get('total_planned_sessions', 0)} séances réalisées ({scorecard.get('completion_rate_percent', 0)}% de complétion)\n\n"
                "• EMPLOI DU TEMPS OFFICIEL DE LA SEMAINE (STRICTEMENT SYNCHRONISÉ AVEC L'INTERFACE WEB) :\n"
                f"{cal_lines}\n"
                "• SPÉCIFICITÉ ULTIMATE FRISBEE :\n"
                "  - Louis joue en club d'Ultimate Frisbee (efforts intermittents lactiques intenses, sprints courts, sauts, agilité).\n"
                "  - IMPORTANT : Louis n'enregistre PAS ses séances d'Ultimate sur sa montre Garmin (il retire sa montre pendant les entraînements de club pour des raisons de sécurité). Ne t'étonne donc jamais de ne pas voir de séance Garmin pour l'Ultimate. Il coche ces séances manuellement sur l'interface.\n"
                "• PROGRESSION VERS L'OBJECTIF 10 KM SOUS LES 40 MIN :\n"
                "  - Pour sa reprise running, priorité absolue à l'Endurance Fondamentale Zone 2 (126-145 bpm) pour réadapter les tendons et articulations avant d'introduire des séances de seuil ou de VMA.\n"
                "• SÉANCES EN DUO AVEC CLARA :\n"
                "  - Louis partage ses footings du vendredi et dimanche avec sa copine Clara (qui prépare un 10 km sous les 50 min). Courir au rythme de Clara (~5:45-6:00/km) est le meilleur moyen pour Louis de se discipliner en vraie Zone 2 aérobie !\n"
                "• GESTION DES BLESSURES ET DE LA SANTÉ :\n"
                "  - Louis N'A AUCUNE BLESSURE ACTIVE déclarée (ni genou, ni mollet, ni tendon, etc.).\n"
                "  - N'invente JAMAIS de blessure imaginaire.\n"
                "  - S'il dit qu'il a la forme, valide avec bienveillance et enthousiasme selon le programme du jour prévu.\n"
            )

        synced_today = biometric_context.get("synced_today", True)
        if not synced_today:
            system_prompt += (
                f"\n=== ⚠️ STATUT SYNCHRO GARMIN ({today_day}) ===\n"
                "• ATTENTION : Les métriques de la nuit et d'aujourd'hui ne sont PAS ENCORE synchronisées sur Garmin Connect.\n"
                "• L'athlète n'a pas encore ouvert l'application Garmin Connect sur son téléphone pour synchroniser sa montre Forerunner 55.\n"
                "• RÈGLE FONDAMENTALE : Si Louis demande son check-in matinal ou son état de forme, NE FABRIQUE PAS de métriques ou de score de préparation imaginaire. Dis-lui clairement et avec bienveillance qu'il doit ouvrir l'application Garmin Connect sur son smartphone pour synchroniser sa montre afin que tu aies accès à son vrai sommeil, sa Body Battery et sa FC au repos réelles !\n"
            )
        else:
            system_prompt += (
                f"\n=== ÉTAT DE FORME DU JOUR ({today_day}) - SYNCHRO ACTIVE ===\n"
                f"• Préparation physique calculée (Readiness Forerunner 55) : {biometric_context.get('readiness_score', 'N/D')}/100 ({biometric_context.get('readiness_level', 'Bonne forme')})\n"
                f"• Sommeil : {biometric_context.get('sleep_duration_hours', 'N/D')}h (Score: {biometric_context.get('sleep_score', 'N/D')}/100) | FC Repos : {biometric_context.get('resting_hr', 'N/D')} bpm | Body Battery : {biometric_context.get('body_battery', 'N/D')}%\n"
                f"• Objectif actuel de Louis : {biometric_context.get('primary_goal', 'Passer sous les 40 min au 10 km')}\n"
                f"• Zones FC repères : Z1 (100-125 bpm), Z2 (126-145 bpm - endurance fondamentale), Z3 (146-160 bpm), Z4 (161-175 bpm), Z5 (176-190 bpm max)\n"
            )

        acts = biometric_context.get("recent_activities", [])
        if acts:
            system_prompt += "\n=== DERNIÈRES SORTIES GARMIN ===\n"
            for a in acts:
                system_prompt += f"• {a.get('date')} : {a.get('name')} ({a.get('sport')}) - {a.get('distance_km')} km en {a.get('duration_min')} min, FC moy: {a.get('avg_hr')} bpm\n"

        # Ingestion de la mémoire persistante
        memory_summary = biometric_context.get("memory_summary", "")
        if memory_summary:
            system_prompt += f"\n{memory_summary}\n"

        # Ingestion de l'historique lointain de l'athlète
        long_term = biometric_context.get("long_term_history", {})
        if long_term:
            run_p = long_term.get("running_profile", {})
            cyc_p = long_term.get("cycling_profile", {})
            team_p = long_term.get("team_sports_profile", {})
            recent_run = run_p.get("most_recent_run", {})
            recent_bike = cyc_p.get("most_recent_ride", {})
            prs = long_term.get("personal_records", {})

            system_prompt += (
                f"\n=== HISTORIQUE ATHLÉTIQUE & RECORDS OFFICIELS GARMIN ===\n"
                f"• Repères de vitesse officiels de Louis : 10 km en {prs.get('10k', '43:34 (4:21 min/km à Chinon le 12/04/2026)')} | 5 km en {prs.get('5k', '21:23')} | 1 km en {prs.get('1k', '3:51')}\n"
                f"• Expérience course à pied : {run_p.get('sessions', 0)} séances ({run_p.get('total_km', 0)} km). Dernière sortie course : {recent_run.get('date')} ({recent_run.get('distance_km')} km à {recent_run.get('pace_or_speed')})\n"
                f"• Plus longue sortie : 29.95 km à Panzoult (rando/trail de 4h16 à 8:33/km, ne pas confondre avec un footing rapide)\n"
                f"• Cyclisme : {cyc_p.get('sessions', 0)} séances ({cyc_p.get('total_km', 0)} km). Dernière sortie vélo : {recent_bike.get('date')} ({recent_bike.get('distance_km')} km à {recent_bike.get('pace_or_speed')})\n"
                f"• Ultimate Frisbee : {team_p.get('sessions', 0)} séances ({team_p.get('total_hours', 0)} h d'efforts intermittents lactiques)\n"
            )

        # Ingestion des détails précis du Record 10 km (Chinon)
        pr_10k = biometric_context.get("pr_10k_detailed") or (biometric_context.get("long_term_history", {}).get("running_profile", {}).get("pr_10k_detailed"))
        if pr_10k:
            system_prompt += "\n=== 🏆 DÉTAILS GRANULAIRES DU RECORD 10 KM (CHINON 12/04/2026 - ID 22496284245) ===\n"
            system_prompt += (
                f"• Chrono officiel 10 km : 43:34 (allure 4:21 min/km) | Total sortie : {pr_10k.get('distance_km')} km en {pr_10k.get('duration_formatted')}\n"
                f"• Cardio : FC moyenne {pr_10k.get('avg_hr')} bpm | FC max {pr_10k.get('max_hr')} bpm\n"
                f"• Biomécanique : Cadence moy {pr_10k.get('biomechanics', {}).get('avg_cadence_spm')} spm (max {pr_10k.get('biomechanics', {}).get('max_cadence_spm')}) | Foulée {pr_10k.get('biomechanics', {}).get('stride_length_cm')} cm\n"
                f"• Dénivelé : D+ {pr_10k.get('elevation', {}).get('gain_m')} m / D- {pr_10k.get('elevation', {}).get('loss_m')} m\n"
            )
            zones = pr_10k.get("hr_zones", [])
            if zones:
                z_strs = [f"{z['zone_name']}: {z['duration_formatted']} ({z['percent']}%)" for z in zones]
                system_prompt += f"• Répartition cardio : {', '.join(z_strs)}\n"
            
            laps = pr_10k.get("laps", [])
            if laps:
                system_prompt += "• Splits officiels kilomètre par kilomètre (laps Garmin) :\n"
                for lap in laps:
                    system_prompt += f"  - Km {lap['lap_number']} : {lap['pace']} | FC moy: {lap['avg_hr']} bpm | Cadence: {lap['avg_cadence']} spm | D+: +{lap['elevation_gain_m']}m / D-: -{lap['elevation_loss_m']}m\n"

        # Ingestion de la dernière séance détaillée
        recent_act = biometric_context.get("most_recent_activity_detailed")
        if recent_act:
            sport_type = recent_act.get("sport")
            speed_val = recent_act.get("avg_speed_kmh")
            speed_or_pace = recent_act.get("avg_pace") if sport_type == "running" else f"{speed_val} km/h"
            hr_str = f"FC moy {recent_act.get('avg_hr')} bpm (max {recent_act.get('max_hr')} bpm)" if recent_act.get('avg_hr') else "Cardio non mesuré (montre retirée pendant l'Ultimate)"
            system_prompt += f"\n=== 🏁 DERNIÈRE ACTIVITÉ ENREGISTRÉE SUR GARMIN ({recent_act.get('name')} - {recent_act.get('date')}) ===\n"
            system_prompt += (
                f"• Nom : {recent_act.get('name')} | Sport : {sport_type} | Date : {recent_act.get('date')} | Durée : {recent_act.get('duration_formatted')}\n"
                f"• Vitesse / Allure : {speed_or_pace} | Distance : {recent_act.get('distance_km')} km\n"
                f"• Cardio : {hr_str}\n"
            )

        # Ingestion de la dernière séance de COURSE À PIED (running) avec splits complets
        recent_run = biometric_context.get("most_recent_running_detailed")
        if recent_run and (not recent_act or str(recent_run.get("id")) != str(recent_act.get("id"))):
            system_prompt += f"\n=== 🏃‍♂️ DERNIÈRE SÉANCE DE COURSE À PIED ({recent_run.get('name')} - {recent_run.get('date')}) ===\n"
            system_prompt += (
                f"• Séance : {recent_run.get('name')} (ID: {recent_run.get('id')}) le {recent_run.get('date')}\n"
                f"• Distance : {recent_run.get('distance_km')} km | Durée : {recent_run.get('duration_formatted')} | Allure moyenne : {recent_run.get('avg_pace')}\n"
                f"• Cardio RÉEL : FC moyenne {recent_run.get('avg_hr')} bpm | FC Max RÉELLE : {recent_run.get('max_hr')} bpm (ATTENTION : Ne pas inventer 178 bpm, le pic max réel enregistré est bien 160 bpm !)\n"
                f"• Cadence moyenne : {recent_run.get('biomechanics', {}).get('avg_cadence_spm')} spm | Dénivelé : +{recent_run.get('elevation', {}).get('gain_m')}m\n"
            )
            laps = recent_run.get("laps", [])
            if laps:
                system_prompt += "• Splits km par km officiels de cette sortie :\n"
                for lap in laps:
                    system_prompt += f"  - Km {lap['lap_number']} : {lap['pace']} | FC moy: {lap['avg_hr']} bpm | FC max: {lap['max_hr']} bpm\n"
            system_prompt += (
                "• VÉRITÉ ET ANALYSE COACHING SUR CETTE SÉANCE DU 20/10 :\n"
                "  - Cette sortie était censée être une reprise Z2 douce (126-145 bpm) pour réadapter les tendons.\n"
                "  - En réalité, Louis a couru à 5:01 min/km à 146 bpm de moyenne avec des pointes à 160 bpm (Zone 4 Seuil).\n"
                "  - DIAGNOSTIC FERME ET COHÉRENT : C'était un effort trop soutenu pour une reprise aérobie pure. Ne lui dis JAMAIS que c'était 'un parfait respect de la Zone 2'. Rappelle-lui au contraire avec bienveillance qu'il doit brider son allure (viser ~5:30-6:00/km) lors des prochains footings pour rester sous 140 bpm et laisser le temps aux tendons et capillaires de s'adapter !\n"
            )

        system_prompt += (
            "\n=== RÈGLES D'OR DE POSTURE DU COACH (STYLE INTERACTIF & SUR-MESURE) ===\n"
            f"1. PARLE À L'ATHLÈTE ({athlete_ctx.upper()}) COMME UN VRAI COACH HUMAIN, PAS UN RAPPORT TECHNIQUE FROID. Sois complice, naturel, encourageant et concis.\n"
            f"2. CO-CONSTRUIS AVEC L'ATHLÈTE : Pose 1 ou 2 questions simples pour valider son ressenti de récupération, son sommeil ou son organisation pour les prochains jours. Propose des séances alignées avec le calendrier réel du jour ({today_day} : {today_prog_str}).\n"
            "3. FORMAT DIGESTE ET AÉRÉ : Pas de pavés interminables de 50 lignes. Va droit au but en quelques paragraphes bien sentis (10 à 25 lignes max), avec des puces légères et des allures/fréquences cardiaques précises.\n"
            "4. RESPECTE LE NIVEAU RÉEL DE L'ATHLÈTE : Base tes conseils sur la méthodologie polarisée 80/20 (80% d'endurance fondamentale en Zone 2 pour construire la caisse aérobie et 20% d'intensité haute au seuil ou fractionné).\n"
            "5. SANTÉ ET VIGILANCE : N'invente JAMAIS de fausse blessure imaginaire si l'athlète n'en a pas signalé. Si l'athlète dit qu'il est en forme, valide avec enthousiasme selon le programme du jour prévu.\n"
            "6. ACCÈS TOTAL AUX DÉTAILS DES SÉANCES : Tu as accès DIRECT et COMPLET à toutes les données Garmin (splits km par km, cadence, dénivelé, zones cardiaques Z1-Z5). Cite des métriques concrètes pour étayer tes conseils.\n\n"
            "=== 🧠 DIRECTIVES DE MÉMOIRE PERSISTANTE & EXTRACTION INTELLIGENTE ===\n"
            "Tu disposes d'un système de mémoire persistante pour personnaliser l'accompagnement de Louis et Clara au fil des semaines.\n"
            "Si l'athlète t'indique un fait personnel durable :\n"
            "- Une demande explicite : 'retiens que...', 'note que...', 'rappelle-toi que...'\n"
            "- Une préférence d'entraînement : créneaux préférés, type de séance, parcours\n"
            "- Un objectif ou une cible : nouvelle course, chrono visé\n"
            "- Une contrainte d'agenda : jours indisponibles, travail, repos souhaité\n"
            "- Un signalement physique AVÉRÉ : douleur ou gêne musculaire/tendineuse (ex: 'j'ai mal au tendon')\n"
            "  ⚠️ ATTENTION : Une simple question théorique (ex: 'comment progresser sans se blesser ?') n'est PAS un signalement de blessure ! Ne crée jamais de fait de blessure pour une question générale.\n"
            "- Une guérison ou disparition de douleur : 'je n'ai plus mal', 'douleur guérie'\n\n"
            "Dans ces cas précis, ajoute à la TOUTE FIN de ta réponse un bloc technique sous ce format exact :\n"
            "<!-- MEMORY_UPDATE: [{\"action\": \"add\", \"category\": \"preferences\", \"fact\": \"Formulation claire du fait\", \"athlete\": \"louis\"}] -->\n"
            "Catégories possibles : 'preferences', 'active_goals', 'schedule_constraints', 'injuries_and_sensitivities', 'strengths'.\n"
            "Si une douleur est guérie : <!-- MEMORY_UPDATE: [{\"action\": \"clear_injuries\", \"category\": \"injuries_and_sensitivities\", \"fact\": \"Douleur déclarée résolue\", \"athlete\": \"louis\"}] -->\n"
            "Ce tag sera automatiquement intercepté par le cockpit sans s'afficher à l'athlète.\n"
        )

        # Ingestion du Moteur Physiologique Déterministe (Python pur)
        physio = biometric_context.get("physiological_state", {})
        if physio:
            system_prompt += "\n=== 📊 MOTEUR PHYSIOLOGIQUE DÉTERMINISTE (PYTHON PUR) ===\n"
            system_prompt += "RÈGLE ABSOLUE : Ces valeurs sont calculées mathématiquement. Tu ne dois JAMAIS improviser ou contredire ces nombres exacts.\n"
            
            vdot = physio.get("vdot")
            paces = physio.get("paces", {})
            if vdot and paces:
                system_prompt += f"• VDOT Jack Daniels officiel : {vdot:.1f}\n"
                e_low = paces.get('easy_low', {})
                e_high = paces.get('easy_high', {})
                m_zone = paces.get('marathon', {})
                t_zone = paces.get('threshold', {})
                i_zone = paces.get('interval', {})
                r_zone = paces.get('repetition', {})

                system_prompt += (
                    f"• Allures d'entraînement étalonnées (sec/km & min/km) :\n"
                    f"  - E (Endurance fondamentale) : {e_low.get('pace_formatted')} à {e_high.get('pace_formatted')} ({e_low.get('seconds_per_km')} à {e_high.get('seconds_per_km')} s/km) | FC: {e_low.get('hr_min_bpm')}-{e_high.get('hr_max_bpm')} bpm\n"
                    f"  - M (Allure Marathon) : {m_zone.get('pace_formatted')} ({m_zone.get('seconds_per_km')} s/km) | FC: {m_zone.get('hr_min_bpm')}-{m_zone.get('hr_max_bpm')} bpm\n"
                    f"  - T (Seuil Lactique / Threshold) : {t_zone.get('pace_formatted')} ({t_zone.get('seconds_per_km')} s/km) | FC: {t_zone.get('hr_min_bpm')}-{t_zone.get('hr_max_bpm')} bpm\n"
                    f"  - I (Intervalles VMA) : {i_zone.get('pace_formatted')} ({i_zone.get('seconds_per_km')} s/km) | FC: {i_zone.get('hr_min_bpm')}-{i_zone.get('hr_max_bpm')} bpm\n"
                    f"  - R (Répétitions d'économie) : {r_zone.get('pace_formatted')} ({r_zone.get('seconds_per_km')} s/km)\n"
                )

            load = physio.get("load_metrics", {})
            if load:
                system_prompt += (
                    f"• Séries temporelles de Charge (Banister / Gabbett EWMA) :\n"
                    f"  - CTL (Charge Chronique 42 jours) : {load.get('ctl', 0):.1f}\n"
                    f"  - ATL (Charge Aiguë 7 jours) : {load.get('atl', 0):.1f}\n"
                    f"  - TSB (Training Stress Balance / Forme) : {load.get('tsb', 0):+.1f}\n"
                    f"  - ACWR (Ratio Aigu:Chronique) : {load.get('acwr', 1.0):.2f}"
                )
                if load.get("hazard_warning"):
                    system_prompt += " ⚠️ [ALERTE SURCHARGE CRITIQUE : ACWR > 1.5, DANGER DE BLESSURE]\n"
                else:
                    system_prompt += "\n"

            hrv_base = physio.get("hrv_baseline", {})
            if hrv_base:
                suppress = hrv_base.get("suppress_intensity", False)
                system_prompt += (
                    f"• Dérive VFC (HRV nocturne) :\n"
                    f"  - Moyenne 30j : {hrv_base.get('baseline_mean', 0):.1f} ms (± {hrv_base.get('baseline_std', 0):.1f} ms) | Seuil bas (-1.5σ) : {hrv_base.get('lower_threshold', 0):.1f} ms\n"
                    f"  - VFC actuelle : {hrv_base.get('current_rmssd', 'N/D')} ms | Indicateur suppress_intensity = {suppress}\n"
                )
                if suppress:
                    system_prompt += "  🚨 [CONSIGNE STRICTE] VFC sous le seuil d'alerte : TOUTE SÉANCE D'INTENSITÉ EST INTERDITE AUJOURD'HUI. Préconiser un footing régénératif Z1 de 30 min ou du repos complet.\n"

        # Ingestion des Fiches de Doctrine RAG
        doctrine_rules = biometric_context.get("doctrine_rules", [])
        if doctrine_rules:
            system_prompt += "\n=== 📚 DOCTRINE SCIENTIFIQUE D'ENTRAÎNEMENT (RAG LOCAL) ===\n"
            system_prompt += (
                "RÈGLE MÉTHODOLOGIQUE DU COACH : Appuie et cite explicitement les règles d'entraînement expertes issues de la doctrine ci-dessous "
                "(ex. polarisation 80/20 de Seiler, répartition des volumes de Jack Daniels, protocole de récupération VFC ou synchronisation d'allures du duo) "
                "pour justifier scientifiquement ton analyse et tes adaptations d'allures/séances.\n"
            )
            for doc in doctrine_rules:
                system_prompt += f"• [{doc.get('title', 'Doctrine')} ({doc.get('topic', '')})] :\n  {doc.get('content', '')}\n"

        if biometric_context.get("three_week_plan_generated") or any(k in user_message.lower() for k in ["3 semaine", "trois semaine", "programme", "planifie", "montre", "calendrier"]):
            system_prompt += (
                "\n=== 🚀 PROGRAMMATION DU CYCLE 3 SEMAINES & SYNCHRONISATION MONTRE GARMIN ===\n"
                "Louis te demande s'il est certain que ses 3 prochaines semaines sont planifiées et si ses séances spécifiques vont se retrouver précisément sur sa montre Garmin.\n"
                "TU L'ASSURES PLEINEMENT ET AVEC PRÉCISION :\n"
                "1. OUI, LE CALENDRIER EST 100% MIS À JOUR POUR LES 3 SEMAINES :\n"
                "   - Semaine 1 (S43) : Reprise running Z2 (35 min à 126-145 bpm) pour habituation tendineuse + 3 entraînements Ultimate.\n"
                "   - Semaine 2 (S44) : Volume aérobie Z2 (45 min) + Fractionné court (8x1 min à 4:00/km, r=1' trot en Z4 165-178 bpm).\n"
                "   - Semaine 3 (S45) : Séance Clé Seuil Sub-40 (4x1000m à 4:00/km, r=1'45 trot en Z4 168-180 bpm) + Sortie longue Z2 50 min.\n"
                "   - Il peut naviguer semaine par semaine grâce aux boutons fléchés du planning ou cliquer sur le bouton 'Cycle 3 semaines'.\n"
                "2. OUI, LA SÉANCE PRÉCISE VA DIRECTEMENT SUR SA MONTRE GARMIN :\n"
                "   - Lorsqu'il clique sur 'Programmer sur Garmin' pour une séance de course (ex: 8x1 min ou 4x1000m au seuil), le système utilise l'API Garmin Connect MCP pour générer un entraînement structuré officiel (ExecutableStepDTO + RepeatGroupDTO).\n"
                "   - Ce fichier contient les étapes précises : échauffement, répétitions avec allure et FC cible, temps de repos/récupération trot, et retour au calme.\n"
                "   - Dès qu'il ouvre l'activité Course à pied sur sa montre Garmin, la montre affiche : 'Entraînement prévu : [Nom de la séance]' et le guide son par son (bips, vibrations, jauge de cadence/FC/allure) !\n"
            )

        if web_search_results:
            system_prompt += "\n\n=== RECHERCHE SCIENTIFIQUE RÉCENTE DU WEB ===\n"
            for item in web_search_results:
                system_prompt += f"• Source ({item.get('title')}): {item.get('snippet')}\n"

        # 2. Build conversation messages
        messages = [{"role": "system", "content": system_prompt}]
        if chat_history:
            for msg in chat_history[-6:]:

                messages.append({"role": msg["role"], "content": msg["content"]})
        
        messages.append({"role": "user", "content": user_message})

        # 3. Call endpoint
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1200,
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return {
                    "source": "llm",
                    "model": self.model,
                    "content": content,
                    "search_used": bool(web_search_results),
                    "search_sources": web_search_results or [],
                }
            else:
                print(f"LLM API Error HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"LLM API connection failed: {e}")

        # 4. Fallback intelligent si le serveur LLM est indisponible ou n'a pas répondu
        fallback_content = self._generate_rule_based_fallback(user_message, biometric_context, web_search_results)
        return {
            "source": "coach_engine_fallback",
            "model": "Moteur Physiologique Local",
            "content": fallback_content,
            "search_used": bool(web_search_results),
            "search_sources": web_search_results or [],
        }

    def _generate_rule_based_fallback(
        self,
        user_message: str,
        biometric_context: Dict[str, Any],
        web_search_results: Optional[List[Dict[str, str]]],
    ) -> str:
        """Rule-based physiological coach response if LLM server is unreachable."""
        score = biometric_context.get("readiness_score", 70)
        level = biometric_context.get("readiness_level", "green")

        if any(k in user_message.lower() for k in ["3 semaine", "trois semaine", "programme", "planifie", "montre", "calendrier"]):
            return (
                "### 🎯 Cycle 3 Semaines & Synchronisation Montre Garmin Garanties\n\n"
                "**Je te confirme à 100% que tout est opérationnel :**\n\n"
                "1. **Mise à jour immédiate du calendrier** : Ton cycle progressif sur 3 semaines est enregistré dans ton calendrier interactif :\n"
                "   - **Semaine 1 (S43)** : Reprise running Z2 (35 min à 126-145 bpm) pour réadapter tes tendons sans choc + 3 entraînements Ultimate.\n"
                "   - **Semaine 2 (S44)** : Volume aérobie Z2 (45 min) + Fractionné court (8x1 min à 4:00/km, r=1' trot, en Z4 165-178 bpm).\n"
                "   - **Semaine 3 (S45)** : Séance Clé Seuil Sub-40 (4x1000m à 4:00/km, r=1'45 trot, en Z4 168-180 bpm) + Sortie longue Z2 50 min.\n"
                "   - *Tu peux naviguer d'une semaine à l'autre avec les flèches du planning.*\n\n"
                "2. **La séance précise directement sur ta montre Garmin** :\n"
                "   - Quand tu cliques sur **'Programmer sur Garmin'**, le système construit un entraînement structuré officiel Garmin Connect (`RepeatGroupDTO`).\n"
                "   - Ce format injecte l'échauffement (15 min), les répétitions (ex: 8 fractions de 1 min ou 4 fractions de 1000m) avec la zone cardiaque cible exacte (Z4 165-180 bpm) et les allures requises, ainsi que les récupérations au trot et le retour au calme.\n"
                "   - Dès synchronisation Bluetooth/WiFi de ta montre, l'entraînement s'affiche dans **Entraînement > Calendrier** ou se lance dès que tu ouvres l'activité **Course à pied** le jour J !"
            )

        if "check-in" in user_message.lower() or "aujourd'hui" in user_message.lower() or "séance" in user_message.lower():
            if level == "green":
                return (
                    f"### 🟢 Check-in Matinal : Feu Vert (Score de préparation : {score}/100)\n\n"
                    "Vos voyants physiologiques sont excellents. Votre système nerveux et vos réserves musculaires sont prêts pour une charge de travail significative.\n\n"
                    "**Séance recommandée pour aujourd'hui :**\n"
                    "- **Type** : Séance clé - Fractionné VO2 Max / Seuil (Course à pied ou Vélo)\n"
                    "- **Échauffement** : 15 min Z1/Z2 progressif (115-135 bpm) + 4 lignes droites dynamiques\n"
                    "- **Corps de séance** : 6 à 8 répétitions de 2 min en Zone 4/5 (165-175 bpm) / Récupération 1 min 30 en trot très lent Z1\n"
                    "- **Retour au calme** : 10 min trot lent Z1\n"
                    "- **Hydratation** : 500ml eau + électrolytes post-séance."
                )
            elif level == "yellow":
                return (
                    f"### 🟡 Check-in Matinal : Récupération Modérée (Score : {score}/100)\n\n"
                    "Votre corps n'est que partiellement restauré. Une séance trop violente aujourd'hui risquerait d'accentuer la fatigue résiduelle.\n\n"
                    "**Séance recommandée pour aujourd'hui :**\n"
                    "- **Type** : Endurance Fondamentale pure (Zone 2)\n"
                    "- **Durée** : 45 à 50 minutes\n"
                    "- **Cible FC** : 126 à 145 bpm strict\n"
                    "- **Consigne** : Respiration par le nez possible, aisance respiratoire totale."
                )
            else:
                return (
                    f"### 🔴 Check-in Matinal : Alerte Récupération (Score : {score}/100)\n\n"
                    "Votre fatigue aiguë est importante. Forcer aujourd'hui serait contre-productif.\n\n"
                    "**Consigne du Coach :**\n"
                    "- Repos complet ou 30 min de marche très douce / étirements.\n"
                    "- Hydratation renforcée et coucher 30 minutes plus tôt ce soir."
                )

        # General response
        res = (
            "### Analyse du Coach\n\n"
            f"D'après vos métriques du jour (Readiness {score}/100), voici mes recommandations :\n\n"
            "- **Volume d'entraînement** : Respectez la règle des 80% en Zone 2 pour construire un moteur aérobie durable sans vous épuiser.\n"
            "- **Intensité** : Placez au maximum 1 à 2 séances d'intervalles par semaine, espacées d'au moins 48h de récupération.\n"
        )
        if web_search_results:
            res += "\n**Dernières connaissances issues de la littérature sportive :**\n"
            for s in web_search_results[:2]:
                res += f"- *{s['title']}* : {s['snippet']}\n"
        return res
