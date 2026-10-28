"""Data models for the Garmin Coach module."""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any


class ReadinessLevel(Enum):
    GREEN = "green"    # Prêt pour séance clé (intervalles, tempo, sortie longue)
    YELLOW = "yellow"  # Fatigue modérée -> Endurance fondamentale Z1/Z2 uniquement
    RED = "red"        # Fatigue élevée -> Repos complet ou récupération active légère


class WorkoutType(Enum):
    REST = "rest"
    RECOVERY = "recovery"
    ENDURANCE_Z2 = "endurance_z2"
    TEMPO_Z3 = "tempo_z3"
    THRESHOLD_Z4 = "threshold_z4"
    INTERVALS_VO2MAX = "intervals_vo2max"
    LONG_RUN = "long_run"
    STRENGTH = "strength"


@dataclass
class ReadinessAssessment:
    level: ReadinessLevel
    readiness_score: Optional[int]
    sleep_score: Optional[int]
    body_battery: Optional[int]
    resting_hr: Optional[int]
    hrv_status: Optional[str]
    recovery_hours_remaining: Optional[int]
    summary_message: str
    allowed_workout_types: List[WorkoutType]
    advice: List[str]


@dataclass
class PrescribedWorkout:
    sport: str
    workout_type: WorkoutType
    title: str
    description: str
    duration_minutes: int
    target_zone: str
    target_hr_range: Optional[tuple[int, int]] = None
    intervals: Optional[Dict[str, Any]] = None


@dataclass
class ActivityAnalysis:
    activity_id: int
    activity_name: str
    activity_type: str
    start_time: str
    duration_minutes: float
    distance_km: float
    avg_hr: Optional[int]
    max_hr: Optional[int]
    aerobic_training_effect: Optional[float]
    anaerobic_training_effect: Optional[float]
    zone_distribution: Dict[str, float] = field(default_factory=dict)
    key_takeaways: List[str] = field(default_factory=list)
    recovery_impact: str = ""
