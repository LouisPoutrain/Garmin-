"""Persistent Coach Memory and Adaptive Learning Engine with Neutral Baseline & Duo Support."""

import json
import re
from datetime import datetime, date
from pathlib import Path
from typing import Dict, Any, List, Optional

MEMORY_FILE = Path(__file__).resolve().parents[2] / "data" / "coach_memory.json"


def _get_neutral_memory_data() -> Dict[str, Any]:
    """Returns a fresh, completely neutral memory structure."""
    return {
        "athlete_name": "Louis & Clara",
        "created_at": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat(),
        "facts": {
            "strengths": [],
            "injuries_and_sensitivities": [],
            "preferences": [],
            "active_goals": [],
            "schedule_constraints": [],
        },
        "recent_coaching_notes": [],
        "athlete_feedback_log": [],
    }


class CoachMemory:
    """Manages persistent memory, athlete insights, past feedback, and auto-adaptation."""

    def __init__(self, file_path: Optional[Path] = None):
        self.file_path = file_path or MEMORY_FILE
        self.data: Dict[str, Any] = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    # Ensure all fact categories exist
                    if "facts" not in content or not isinstance(content["facts"], dict):
                        content["facts"] = {}
                    for cat in ["strengths", "injuries_and_sensitivities", "preferences", "active_goals", "schedule_constraints"]:
                        if cat not in content["facts"]:
                            content["facts"][cat] = []
                    return content
            except Exception as e:
                print(f"Memory load warning: {e}")

        # Default clean neutral memory structure
        return _get_neutral_memory_data()

    def save(self) -> None:
        """Persists memory data to disk and synchronizes active facts to SQLite if available."""
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self.data["last_updated"] = datetime.now().isoformat()
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def reset(self) -> None:
        """Completely resets memory to a clean, neutral state with zero pre-conceived baggage."""
        self.data = _get_neutral_memory_data()
        self.save()

        # Synchronize clean state to SQLite athlete_facts
        try:
            from garmin_coach.database.db import get_connection
            with get_connection() as conn:
                conn.execute("DELETE FROM athlete_facts")
                conn.commit()
            print("✅ Mémoire SQLite athlete_facts et fichier JSON réinitialisés à l'état neutre.")
        except Exception as e:
            print(f"Note reset SQLite athlete_facts: {e}")

    def add_fact(self, category: str, fact: str, athlete: str = "duo") -> None:
        """Adds a discovered fact into athlete memory and SQLite."""
        if category not in self.data["facts"]:
            self.data["facts"][category] = []
        fact_clean = fact.strip()
        if not fact_clean:
            return

        if fact_clean not in self.data["facts"][category]:
            self.data["facts"][category].append(fact_clean)
            self.save()

            # SQLite sync
            try:
                from garmin_coach.database.db import get_connection
                with get_connection() as conn:
                    # check if already exists
                    existing = conn.execute(
                        "SELECT id FROM athlete_facts WHERE category = ? AND fact = ?",
                        (category, fact_clean),
                    ).fetchone()
                    if not existing:
                        conn.execute(
                            "INSERT INTO athlete_facts (athlete_id, category, fact, active) VALUES (?, ?, ?, 1)",
                            (athlete.lower(), category, fact_clean),
                        )
                        conn.commit()
            except Exception as e:
                print(f"Note add_fact SQLite sync: {e}")

    def add_coaching_note(self, note: str) -> None:
        """Records an important coaching decision or observation."""
        self.data["recent_coaching_notes"].append({
            "timestamp": datetime.now().isoformat(),
            "note": note,
        })
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
        """Removes a specific fact from athlete memory and SQLite."""
        removed = False
        if category in self.data.get("facts", {}) and fact in self.data["facts"][category]:
            self.data["facts"][category].remove(fact)
            self.save()
            removed = True

        # SQLite sync
        try:
            from garmin_coach.database.db import get_connection
            with get_connection() as conn:
                conn.execute(
                    "DELETE FROM athlete_facts WHERE category = ? AND fact = ?",
                    (category, fact),
                )
                conn.commit()
        except Exception as e:
            print(f"Note remove_fact SQLite sync: {e}")

        return removed

    def clear_category(self, category: str) -> None:
        """Clears all facts in a category (e.g. injuries when resolved)."""
        if category in self.data.get("facts", {}):
            self.data["facts"][category] = []
            self.save()

        # SQLite sync
        try:
            from garmin_coach.database.db import get_connection
            with get_connection() as conn:
                conn.execute("DELETE FROM athlete_facts WHERE category = ?", (category,))
                conn.commit()
        except Exception as e:
            print(f"Note clear_category SQLite sync: {e}")

    def auto_learn_from_message(self, user_message: str, athlete_context: str = "duo") -> List[str]:
        """
        Intelligently detects explicit memory instructions, pain resolutions, real injuries,
        preferences, schedule constraints, and goals without false positives.
        """
        lower = user_message.lower().strip()
        learned: List[str] = []

        # Determine athlete attribution
        athlete_tag = "Clara" if "clara" in lower or athlete_context == "clara" else ("Louis" if "louis" in lower or athlete_context == "louis" else "Duo")

        # 1. Check for negations / questions about avoiding injury (e.g. "sans blessure", "sans se blesser")
        # THESE MUST NEVER BE RECORDED AS INJURIES
        negation_phrases = [
            "sans blessure", "sans me blesser", "sans se blesser", "pas de blessure", "aucune blessure",
            "zéro blessure", "pas blessé", "pas blessée", "je ne suis pas blessé", "je ne suis pas blessée",
            "sans douleur", "sans les douleurs", "pas de douleur", "aucune douleur", "zéro douleur",
            "sans bobo", "pas de bobo", "sans gêne", "pas de gêne", "aucune gêne",
            "éviter de me blesser", "éviter les blessures", "ne pas me blesser", "prévenir les blessures",
            "progresser sans", "courir sans blessure", "courir sans douleur",
        ]
        is_negation = any(neg in lower for neg in negation_phrases)

        # 2. Pain / injury resolution: "je n'ai plus mal", "douleur guérie", "plus mal au..."
        healing_phrases = [
            "plus mal", "douleur partie", "douleur disparue", "douleurs disparues", "guéri", "guérie",
            "plus de douleur", "plus de douleurs", "ça ne me fait plus mal", "mon genou va bien",
            "mes jambes vont bien", "plus de gêne", "douleur oubliée", "remis de ma blessure",
            "rétabli", "rétablis", "totalement récupéré",
        ]
        if any(hp in lower for hp in healing_phrases):
            injuries = list(self.data.get("facts", {}).get("injuries_and_sensitivities", []))
            if injuries:
                self.clear_category("injuries_and_sensitivities")
                msg = f"🩺 Douleurs et gênes retirées de la mémoire active pour {athlete_tag} (marquées comme résolues)."
                learned.append(msg)
                self.log_athlete_feedback("Récupération physique", note="Douleurs déclarées résolues.")

        # 3. Explicit memory triggers: "retiens que...", "rappelle-toi que...", "note que...", "mémorise que..."
        explicit_triggers = [
            "retiens que", "rappelle-toi que", "rappelle toi que", "note que", "mémorise que",
            "ajoute à ma mémoire", "ajoute à ta mémoire", "garde en mémoire", "enregistre que",
            "n'oublie pas que", "prends note que", "consigne :", "consigne pour",
        ]
        for prefix in explicit_triggers:
            if prefix in lower:
                idx = lower.find(prefix) + len(prefix)
                raw_fact = user_message[idx:].strip(" :,-.")
                if raw_fact:
                    # Clean fact text
                    raw_fact_clean = re.sub(r'^(que|de|d\')\s+', '', raw_fact, flags=re.IGNORECASE).strip()
                    # Classify category
                    raw_lower = raw_fact_clean.lower()
                    if any(w in raw_lower for w in ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "dispo", "indisponible", "horaire", "créneau", "matin", "soir", "midi"]):
                        target_cat = "schedule_constraints"
                    elif any(w in raw_lower for w in ["objectif", "viser", "chrono", "10 km", "semi", "marathon", "sub-", "allure"]):
                        target_cat = "active_goals"
                    elif any(w in raw_lower for w in ["mal", "douleur", "tendon", "genou", "cheville", "fatigue", "sensibilité"]) and not is_negation:
                        target_cat = "injuries_and_sensitivities"
                    else:
                        target_cat = "preferences"

                    tagged_fact = f"[{athlete_tag}] {raw_fact_clean}"
                    self.add_fact(target_cat, tagged_fact, athlete=athlete_tag)
                    learned.append(f"🧠 Mémorisé à votre demande ({target_cat}) : {tagged_fact}")
                break

        # 4. Pain / injury detection (STRICT: only if NOT negation and user actually reports active suffering)
        if not is_negation and not any(hp in lower for hp in healing_phrases):
            pain_triggers = [
                "j'ai mal au", "j'ai mal à la", "j'ai mal à l'", "j'ai mal aux",
                "douleur au", "douleur à la", "douleur à l'", "douleur aux",
                "grosse douleur", "douleur vive", "douleur aiguë",
                "tendinite au", "tendinite à", "gêne au genou", "gêne au tendon",
                "mollet qui tire", "ischio qui tire", "tendon douloureux",
                "cheville foulée", "entorse", "aponévrose douloureuse",
            ]
            for kw in pain_triggers:
                if kw in lower:
                    # Extract clean sentence or context
                    clean_text = user_message.strip()
                    # Ensure it's not a generic question
                    if not clean_text.endswith("?") and not any(q in lower for q in ["comment", "pourquoi", "est-ce que", "que faire si"]):
                        fact = f"[{athlete_tag}] Signalement physique : '{clean_text}' (signalé le {date.today().isoformat()})"
                        self.add_fact("injuries_and_sensitivities", fact, athlete=athlete_tag)
                        learned.append(f"⚠️ Alerte santé enregistrée dans votre suivi : {fact}")
                        break

        # 5. Training Preference detection (explicit user preference statements)
        pref_triggers = ["je préfère courir", "je préfère m'entraîner", "j'aime courir", "je privilégie", "je préférerais", "plus de séances de"]
        for pt in pref_triggers:
            if pt in lower and not any(p in lower for p in explicit_triggers):
                clean_text = user_message.strip()
                fact = f"[{athlete_tag}] Préférence déclarée : '{clean_text}'"
                self.add_fact("preferences", fact, athlete=athlete_tag)
                learned.append(f"⭐ Préférence ajoutée à votre profil : {fact}")
                break

        # 6. Goal detection (e.g. "mon objectif est de courir...")
        goal_triggers = ["mon objectif est de", "mon objectif :", "je vise les", "mon but est de", "je prépare le 10km", "je prépare un marathon"]
        for gt in goal_triggers:
            if gt in lower and not any(p in lower for p in explicit_triggers):
                clean_text = user_message.strip()
                fact = f"[{athlete_tag}] Objectif : '{clean_text}'"
                self.add_fact("active_goals", fact, athlete=athlete_tag)
                learned.append(f"🎯 Nouvel objectif mémorisé : {fact}")
                break

        # 7. Schedule constraint detection
        constraint_triggers = ["je ne peux pas courir le", "impossible de m'entraîner le", "pas disponible le", "indisponible le"]
        for ct in constraint_triggers:
            if ct in lower and not any(p in lower for p in explicit_triggers):
                clean_text = user_message.strip()
                fact = f"[{athlete_tag}] Contrainte d'emploi du temps : '{clean_text}'"
                self.add_fact("schedule_constraints", fact, athlete=athlete_tag)
                learned.append(f"🗓️ Contrainte prise en compte : {fact}")
                break

        # 8. Sensation / RPE feedback
        if any(w in lower for w in ["rpe", "séance très dure", "séance facile", "bonnes sensations", "grosses courbatures", "épuisé"]):
            self.log_athlete_feedback(sensation=f"[{athlete_tag}] Ressenti", note=user_message.strip())

        return learned

    def get_memory_summary_for_prompt(self, athlete_context: str = "duo") -> str:
        """Formats the persistent memory into a concise markdown section for the LLM prompt."""
        facts = self.data.get("facts", {})
        total_facts = sum(len(v) for v in facts.values() if isinstance(v, list))

        if total_facts == 0:
            return (
                "=== 🧠 ÉTAT DE LA MÉMOIRE PERSISTANTE (BASE NEUTRE) ===\n"
                "• Mémoire neutre : aucune blessure signalée, aucune contrainte rigide pré-enregistrée.\n"
                "• Les voyants de santé sont au vert (aucune douleur active). Ne fabrique JAMAIS de blessure imaginaire.\n"
                "• Écoute et flexibilité totale : intègre et mémorise en temps réel tout nouveau fait, consigne ou ressenti exprimé par l'athlète.\n"
            )

        lines = [f"=== 🧠 MÉMOIRE PERSISTANTE DU COACH ({athlete_context.upper()}) ==="]

        # Alertes & blessures
        injuries = facts.get("injuries_and_sensitivities", [])
        if injuries:
            lines.append("⚠️ VIGILANCE SANTÉ / DOULEURS ACTIVES : " + " | ".join(injuries[-3:]))
        else:
            lines.append("✅ SANTÉ : Aucune blessure active signalée. Voyants au vert.")

        # Préférences
        prefs = facts.get("preferences", [])
        if prefs:
            lines.append("• Préférences déclarées : " + " | ".join(prefs[-4:]))

        # Objectifs
        goals = facts.get("active_goals", [])
        if goals:
            lines.append("🎯 Objectifs mémorisés : " + " | ".join(goals[-3:]))

        # Contraintes
        constraints = facts.get("schedule_constraints", [])
        if constraints:
            lines.append("🗓️ Contraintes d'agenda mémorisées : " + " | ".join(constraints[-3:]))

        # Points forts
        strengths = facts.get("strengths", [])
        if strengths:
            lines.append("• Points forts validés : " + " | ".join(strengths[-3:]))

        # Dernières notes
        notes = self.data.get("recent_coaching_notes", [])
        if notes:
            lines.append("• Dernière note coaching : " + notes[-1].get("note", ""))

        return "\n".join(lines)
