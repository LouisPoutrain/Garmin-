"""Athlete profile management for Garmin Coach."""

import json
from pathlib import Path
from typing import Dict, Any, Optional

DEFAULT_PROFILE_PATH = Path(__file__).resolve().parents[2] / "athlete_profile.json"


class AthleteProfile:
    """Manages the athlete configuration and preferences."""

    def __init__(self, data: Dict[str, Any]):
        self.data = data

    @property
    def name(self) -> str:
        return self.data.get("athlete", {}).get("name", "Athlète")

    @property
    def primary_sports(self) -> list[str]:
        return self.data.get("athlete", {}).get("primary_sports", ["running"])

    @property
    def primary_goal(self) -> str:
        return self.data.get("goals", {}).get("primary_goal", "")

    @property
    def hr_zones(self) -> Dict[str, list[int]]:
        return self.data.get("zones", {}).get("hr_zones", {})

    @property
    def min_readiness_for_intervals(self) -> int:
        return self.data.get("coaching_rules", {}).get("min_readiness_for_intervals", 65)

    @property
    def min_sleep_for_hard_session(self) -> int:
        return self.data.get("coaching_rules", {}).get("min_sleep_score_for_hard_session", 70)

    @property
    def id(self) -> str:
        return self.data.get("athlete", {}).get("id", "louis")

    @classmethod
    def load(cls, athlete_id_or_path: Optional[Any] = None) -> "AthleteProfile":
        if isinstance(athlete_id_or_path, (Path, str)) and ("/" in str(athlete_id_or_path) or "\\" in str(athlete_id_or_path)):
            target = Path(athlete_id_or_path)
        else:
            athlete_id = (str(athlete_id_or_path) if athlete_id_or_path else "louis").strip().lower()
            if athlete_id == "clara":
                target = Path(__file__).resolve().parents[2] / "athlete_profile_clara.json"
            else:
                target = DEFAULT_PROFILE_PATH

        if not target.exists():
            raise FileNotFoundError(f"Profil athlète introuvable : {target}")
        with open(target, "r", encoding="utf-8") as f:
            return cls(json.load(f))

    def save(self, path: Optional[Path] = None) -> None:
        if path:
            target = path
        elif self.id == "clara":
            target = Path(__file__).resolve().parents[2] / "athlete_profile_clara.json"
        else:
            target = DEFAULT_PROFILE_PATH

        with open(target, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
