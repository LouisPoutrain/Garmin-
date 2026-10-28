"""Persistent Coach Memory and Adaptive Learning Engine."""

import json
from datetime import datetime, date
from pathlib import Path
from typing import Dict, Any, List, Optional

MEMORY_FILE = Path(__file__).resolve().parents[2] / "data" / "coach_memory.json"


class CoachMemory:
    """Manages persistent memory, athlete insights, past feedback, and auto-adaptation."""

    def __init__(self, file_path: Optional[Path] = None):
        self.file_path = file_path or MEMORY_FILE
        self.data: Dict[str, Any] = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Memory load warning: {e}")
        
        # Default memory structure
        return {
            "athlete_name": "Louis Poutrain",
            "created_at": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "facts": {
                "strengths": [
                    "Solide expérience en course à pied (plus de 70 séances et 500 km enregistrés)",
                    "Capacité d'endurance confirmée avec des sorties longues jusqu'à 30 km (Panzoult)",
                    "Pratique régulière du cyclisme foncier (sorties de 25 à 37 km en Zone 1/2)",
                    "Pratique de l'Ultimate Frisbee (développement de l'explosivité et résistance aux changements de rythme)"
                ],
                "injuries_and_sensitivities": [],
                "preferences": [
                    "Approche polarisée 80/20 appréciée",
                    "Entraînements structurés avec allures et zones cardiaques explicites"
                ],
                "active_goals": [
                    "Amélioration de l'endurance fondamentale (Z2) et développement de la VO2 Max"
                ],
                "schedule_constraints": []
            },
            "recent_coaching_notes": [],
            "athlete_feedback_log": []
        }

    def save(self) -> None:
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self.data["last_updated"] = datetime.now().isoformat()
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def add_fact(self, category: str, fact: str) -> None:
        """Adds a discovered fact into athlete memory (e.g. preferences, injuries)."""
        if category not in self.data["facts"]:
            self.data["facts"][category] = []
        if fact not in self.data["facts"][category]:
            self.data["facts"][category].append(fact)
            self.save()

    def add_coaching_note(self, note: str) -> None:
        """Records an important coaching decision or observation."""
        self.data["recent_coaching_notes"].append({
            "timestamp": datetime.now().isoformat(),
            "note": note,
        })
        # Keep last 15 notes
        self.data["recent_coaching_notes"] = self.data["recent_coaching_notes"][-15:]
        self.save()

    def log_athlete_feedback(self, sensation: str, rpe: Optional[int] = None, note: str = "") -> None:
        """Logs athlete's feedback after training."""
        self.data["athlete_feedback_log"].append({
            "date": date.today().isoformat(),
            "timestamp": datetime.now().isoformat(),
            "sensation": sensation,
            "rpe": rpe,
            "note": note,
        })
        self.data["athlete_feedback_log"] = self.data["athlete_feedback_log"][-20:]
        self.save()

    def remove_fact(self, category: str, fact: str) -> bool:
        """Removes a specific fact from athlete memory."""
        if category in self.data.get("facts", {}) and fact in self.data["facts"][category]:
            self.data["facts"][category].remove(fact)
            self.save()
            return True
        return False

    def clear_category(self, category: str) -> None:
        """Clears all facts in a category (e.g. injuries when resolved)."""
        if category in self.data.get("facts", {}):
            self.data["facts"][category] = []
            self.save()

    def auto_learn_from_message(self, user_message: str) -> List[str]:
        """Detects insights, pains, goals, constraints or explicit memory instructions and updates memory."""
        lower = user_message.lower().strip()
        learned = []

        # 1. Explicit memory triggers: "retiens que...", "rappelle-toi que...", "note que...", "mémorise que..."
        for prefix in ["retiens que", "rappelle-toi que", "rappelle toi que", "note que", "mémorise que", "ajoute à ma mémoire"]:
            if prefix in lower:
                # Extract text after prefix
                idx = lower.find(prefix) + len(prefix)
                fact_content = user_message[idx:].strip(" :,-.")
                if fact_content:
                    fact = f"Consigne explicite de Louis : {fact_content}"
                    self.add_fact("preferences", fact)
                    learned.append(f"🧠 Mémorisé à votre demande : {fact_content}")

        # 2. Pain / injury resolution: "je n'ai plus mal", "douleur guérie", "plus mal au..."
        healing_phrases = ["plus mal", "douleur partie", "douleur disparue", "guéri", "plus de douleur", "ça ne me fait plus mal"]
        for hp in healing_phrases:
            if hp in lower:
                injuries = list(self.data.get("facts", {}).get("injuries_and_sensitivities", []))
                if injuries:
                    self.clear_category("injuries_and_sensitivities")
                    msg = "🩺 Douleurs et gênes retirées de la mémoire active (marquées comme résolues)."
                    learned.append(msg)
                    self.log_athlete_feedback("Récupération physique", note="Douleurs déclarées résolues.")
                break

        # 3. Pain / injury detection
        pain_keywords = ["mal au", "mal à la", "douleur", "blessure", "courbature", "tendon", "genou", "cheville", "mollet", "ischio", "aponévrose", "dos", "lombaires"]
        if not any(hp in lower for hp in healing_phrases):
            for kw in pain_keywords:
                if kw in lower:
                    fact = f"Signalement physique : '{user_message.strip()}' (signalé le {date.today().isoformat()})"
                    self.add_fact("injuries_and_sensitivities", fact)
                    learned.append(f"⚠️ Alerte santé enregistrée dans votre suivi : {fact}")
                    break

        # 4. Training Preference detection
        pref_triggers = ["je préfère", "j'aime bien", "j'apprécie", "je privilégie", "je préférerais", "plus de séances de"]
        for pt in pref_triggers:
            if pt in lower:
                fact = f"Préférence d'entraînement : '{user_message.strip()}'"
                self.add_fact("preferences", fact)
                learned.append(f"⭐ Préférence ajoutée à votre profil : {fact}")
                break

        # 5. Goal detection
        goal_triggers = ["je prépare", "mon objectif est", "objectif :", "je vise", "mon but est"]
        for gt in goal_triggers:
            if gt in lower:
                fact = f"Objectif cible : '{user_message.strip()}'"
                self.add_fact("active_goals", fact)
                learned.append(f"🎯 Nouvel objectif mémorisé : {fact}")
                break

        # 6. Schedule constraint & resumption detection
        if "reprend" in lower or "reprise" in lower:
            fact = "Reprise progressive de la course à pied : habituation tendineuse et articulaire prioritaire"
            self.add_fact("preferences", fact)
            learned.append(f"🔄 Phase de reprise enregistrée : {fact}")

        if "séance mardi" in lower or "commencer mardi" in lower or "première séance mardi" in lower:
            fact = "Première séance de course à pied programmée le Mardi"
            self.add_fact("schedule_constraints", fact)
            learned.append("🗓️ Créneau de reprise fixé au Mardi")

        if "dimanche" in lower and ("repos" in lower):
            fact = "Repos le Dimanche (jour de récupération déclaré)"
            self.add_fact("schedule_constraints", fact)
            learned.append("🗓️ Repos du dimanche pris en compte")
        elif "au repos" in lower or "jour de repos" in lower:
            fact = "Journée ou période de repos déclarée"
            self.add_fact("schedule_constraints", fact)
            learned.append("🗓️ Période de repos enregistrée")
        else:
            constraint_triggers = ["pas le ", "impossible le ", "je ne peux pas", "indisponible le ", "pas le temps le "]
            for ct in constraint_triggers:
                if ct in lower:
                    fact = f"Contrainte d'emploi du temps : {ct.strip()}"
                    self.add_fact("schedule_constraints", fact)
                    learned.append(f"🗓️ Contrainte prise en compte : {fact}")
                    break

        # 7. Sensation / RPE feedback
        if "rpe" in lower or "séance dure" in lower or "séance facile" in lower or "bonnes sensations" in lower or "épuisé" in lower:
            self.log_athlete_feedback(sensation="Sensation d'entraînement", note=user_message.strip())

        return learned

    def get_memory_summary_for_prompt(self) -> str:
        """Formats the persistent memory into a concise markdown section for the LLM prompt."""
        facts = self.data.get("facts", {})
        lines = ["=== MÉMOIRE PERSISTANTE DE L'ATHLÈTE (FAITS APPRIS & SUIVI) ==="]

        # Points forts
        strengths = facts.get("strengths", [])
        if strengths:
            lines.append("• Points forts historiques : " + "; ".join(strengths[:3]))

        # Alertes & blessures
        injuries = facts.get("injuries_and_sensitivities", [])
        if injuries:
            lines.append("⚠️ VIGILANCE SANTÉ / BLESSURES : " + "; ".join(injuries[-3:]))

        # Préférences
        prefs = facts.get("preferences", [])
        if prefs:
            lines.append("• Préférences déclarées : " + "; ".join(prefs[-3:]))

        # Objectifs
        goals = facts.get("active_goals", [])
        if goals:
            lines.append("🎯 Objectifs en cours : " + "; ".join(goals[-2:]))

        # Contraintes
        constraints = facts.get("schedule_constraints", [])
        if constraints:
            lines.append("🗓️ Contraintes d'agenda : " + "; ".join(constraints[-3:]))

        # Dernières notes
        notes = self.data.get("recent_coaching_notes", [])
        if notes:
            lines.append("• Dernier retour coach : " + notes[-1].get("note", ""))

        return "\n".join(lines)
