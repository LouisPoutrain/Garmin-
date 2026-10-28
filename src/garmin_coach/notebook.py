"""Jupyter Notebook & Interactive Python SDK for Garmin AI Coach."""

import os
from datetime import date
from typing import Optional, Dict, Any, List

from garmin_mcp import token_utils
from garminconnect import Garmin
from garmin_coach.profile import AthleteProfile
from garmin_coach.memory import CoachMemory
from garmin_coach.history_analyzer import analyze_long_term_history
from garmin_coach.temporal import get_temporal_context, format_relative_date_fr, parse_iso_or_local_date
from garmin_coach.web.web_search import search_sports_science
from garmin_coach.web.llm_client import CoachLLMClient


class CoachSession:
    """Simple, elegant interactive coach session for Jupyter Notebooks and Scripts."""

    def __init__(self, model: Optional[str] = None):
        self.client: Optional[Garmin] = None
        self._login()
        self.profile = AthleteProfile.load()
        self.memory = CoachMemory()
        self.history_profile = analyze_long_term_history(self.client) if self.client else {}
        self.llm = CoachLLMClient(model=model)
        self.chat_history: List[Dict[str, str]] = []

    def _login(self):
        try:
            token_path = token_utils.get_token_path()
            client = Garmin()
            client.login(token_path)
            self.client = client
        except Exception as e:
            print(f"⚠️ Connexion Garmin : {e}")

    def _display(self, md_text: str):
        try:
            from IPython.display import display, Markdown
            display(Markdown(md_text))
        except ImportError:
            print(md_text)

    def checkin(self):
        """Quick morning check-in based on live Garmin readiness."""
        return self.chat("Fais mon check-in matinal d'après mes métriques du jour et conseille-moi sur ma séance.")

    def chat(self, message: str, use_search: bool = True):
        """Conversational exchange with coach, asking questions and adapting to feedback."""
        if not self.client:
            print("Client Garmin non connecté.")
            return

        today = date.today().isoformat()
        
        # 1. Learn from message
        learned = self.memory.auto_learn_from_message(message)
        if learned:
            for l in learned:
                print(f"🧠 {l}")

        # 2. Collect current biometrics
        try:
            summary = self.client.get_user_summary(today) or {}
            raw_readiness = self.client.get_training_readiness(today)
            readiness_score = raw_readiness[0].get("score") if isinstance(raw_readiness, list) and raw_readiness else None
            
            body_battery = summary.get("bodyBatteryMostRecentValue") or summary.get("bodyBatteryAtWakeTime") or 73
            resting_hr = summary.get("restingHeartRate") or 56
            avg_stress = summary.get("averageStressLevel") or 22
            sleep_hours = round((summary.get("sleepingSeconds") or 27000) / 3600, 1)

            if readiness_score is None:
                base = 65
                if body_battery >= 70: base += 15
                if avg_stress <= 25: base += 10
                if sleep_hours >= 7.0: base += 5
                readiness_score = min(base, 95)

            temporal_ctx = get_temporal_context()
            raw_acts = self.client.get_activities(0, 4) or []
            acts_summary = []
            for a in raw_acts:
                raw_date = a.get("startTimeLocal", "")[:10]
                d_obj = parse_iso_or_local_date(raw_date)
                date_display = format_relative_date_fr(d_obj) if d_obj else raw_date
                acts_summary.append({
                    "date": date_display,
                    "raw_date": raw_date,
                    "name": a.get("activityName"),
                    "sport": a.get("activityType", {}).get("typeKey"),
                    "distance_km": round((a.get("distance") or 0) / 1000, 2),
                    "duration_min": round((a.get("duration") or 0) / 60, 1),
                    "avg_hr": a.get("averageHR"),
                })

            biometric_context = {
                "readiness_score": readiness_score,
                "readiness_level": "Optimal" if readiness_score >= 65 else "Modéré",
                "sleep_score": 82 if sleep_hours >= 7.0 else 65,
                "sleep_duration_hours": sleep_hours,
                "body_battery": body_battery,
                "resting_hr": resting_hr,
                "primary_goal": self.profile.primary_goal,
                "recent_activities": acts_summary,
                "memory_summary": self.memory.get_memory_summary_for_prompt(),
                "long_term_history": self.history_profile,
                "temporal_context": temporal_ctx,
            }
        except Exception:
            temporal_ctx = get_temporal_context()
            biometric_context = {
                "readiness_score": 80,
                "readiness_level": "Optimal",
                "primary_goal": self.profile.primary_goal,
                "memory_summary": self.memory.get_memory_summary_for_prompt(),
                "long_term_history": self.history_profile,
                "temporal_context": temporal_ctx,
            }

        # 3. Web search if relevant
        search_res = search_sports_science(message, max_results=2) if use_search else []

        # 4. Generate
        res = self.llm.generate_coach_response(
            user_message=message,
            biometric_context=biometric_context,
            web_search_results=search_res,
            chat_history=self.chat_history,
        )

        content = res.get("content", "")
        self.chat_history.append({"role": "user", "content": message})
        self.chat_history.append({"role": "assistant", "content": content})

        self._display(content)
        return content

    def records(self):
        """Displays athlete's Garmin PRs and long-term milestones."""
        prs = self.history_profile.get("personal_records", {})
        run_p = self.history_profile.get("running_profile", {})
        cyc_p = self.history_profile.get("cycling_profile", {})

        out = [
            "### 🏆 Records et Palmarès Garmin de Louis Poutrain",
            f"- **Volume global analysé :** {self.history_profile.get('lifetime_volume_km', 0)} km ({self.history_profile.get('total_activities_analyzed', 0)} séances)",
            f"- **Record 10 km :** {prs.get('10k', '43:34 (4:21 min/km)')}",
            f"- **Record 5 km :** {prs.get('5k', '21:23 (4:16 min/km)')}",
            f"- **Record 1 km :** {prs.get('1k', '3:51')}",
            f"- **Sortie course la plus longue :** {run_p.get('longest_run')}",
            f"- **Sortie cyclisme la plus longue :** {cyc_p.get('longest_ride')}",
        ]
        self._display("\n".join(out))

    def show_memory(self):
        """Shows what the coach remembers about you."""
        facts = self.memory.data.get("facts", {})
        out = ["### 🧠 Mémoire Active du Coach"]
        for cat, items in facts.items():
            out.append(f"**{cat.replace('_', ' ').capitalize()} :**")
            if not items:
                out.append("  *(aucun élément)*")
            for it in items:
                out.append(f"- {it}")
        self._display("\n".join(out))
