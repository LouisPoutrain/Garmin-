"""Pydantic data models for physiological metrics, Daniels VDOT, and episodic memory."""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ReadinessLevel(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class WorkoutType(str, Enum):
    REST = "rest"
    RECOVERY = "recovery"
    ENDURANCE_Z2 = "endurance_z2"
    TEMPO_Z3 = "tempo_z3"
    THRESHOLD_Z4 = "threshold_z4"
    INTERVALS_VO2MAX = "intervals_vo2max"
    LONG_RUN = "long_run"
    STRENGTH = "strength"


class ReadinessAssessment(BaseModel):
    level: ReadinessLevel
    readiness_score: Optional[int] = None
    sleep_score: Optional[int] = None
    body_battery: Optional[int] = None
    resting_hr: Optional[int] = None
    hrv_status: Optional[str] = None
    recovery_hours_remaining: Optional[int] = None
    summary_message: str = ""
    allowed_workout_types: List[WorkoutType] = Field(default_factory=list)
    advice: List[str] = Field(default_factory=list)


class PrescribedWorkout(BaseModel):
    sport: str
    workout_type: WorkoutType
    title: str
    description: str
    duration_minutes: int
    target_zone: str
    target_hr_range: Optional[tuple[int, int]] = None
    intervals: Optional[Dict[str, Any]] = None


class ActivityAnalysis(BaseModel):
    activity_id: int
    activity_name: str
    activity_type: str
    start_time: str
    duration_minutes: float
    distance_km: float
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    aerobic_training_effect: Optional[float] = None
    anaerobic_training_effect: Optional[float] = None
    zone_distribution: Dict[str, float] = Field(default_factory=dict)
    key_takeaways: List[str] = Field(default_factory=list)
    recovery_impact: str = ""


class PaceZone(BaseModel):
    """Specific training pace zone according to Jack Daniels Running Formula."""
    code: str = Field(description="Zone code: E, M, T, I, R")
    name: str = Field(description="Full name (e.g. Endurance Fondamentale, Seuil)")
    seconds_per_km: int = Field(description="Target pace in seconds per kilometer")
    pace_formatted: str = Field(description="Pace formatted as MM:SS min/km")
    speed_kmh: float = Field(description="Speed in km/h")
    hr_min_pct: int = Field(description="Minimum HR % of HRmax")
    hr_max_pct: int = Field(description="Maximum HR % of HRmax")
    hr_min_bpm: int = Field(description="Estimated min heart rate bpm")
    hr_max_bpm: int = Field(description="Estimated max heart rate bpm")
    vdot_pct: float = Field(description="Estimated percentage of VDOT")
    description: str = Field(description="Physiological intent of the zone")


class DanielsTrainingPaces(BaseModel):
    """Complete Jack Daniels VDOT pacing profile for an athlete."""
    athlete_id: str
    vdot: float
    reference_race: str
    reference_time_sec: int
    reference_time_formatted: str
    easy_low: PaceZone
    easy_high: PaceZone
    marathon: PaceZone
    threshold: PaceZone
    interval: PaceZone
    repetition: PaceZone


class DailyLoadMetrics(BaseModel):
    """Daily physiological load metrics using Banister TRIMP and Coggan EWMA."""
    date: str
    trimp: float
    ctl: float = Field(description="Chronic Training Load (Fitness over 42 days)")
    atl: float = Field(description="Acute Training Load (Fatigue over 7 days)")
    tsb: float = Field(description="Training Stress Balance (Form = CTL - ATL)")
    acwr: float = Field(description="Acute:Chronic Workload Ratio (ATL / CTL)")
    overload_warning: bool = Field(default=False, description="True if ACWR > 1.5")
    status_label: str = Field(description="Optimal, Warning, Hazard, or Under-training")
    color: str = Field(description="Status color code")


class HRVBaselineAnalysis(BaseModel):
    """Analysis of nocturnal HRV relative to 30-day baseline."""
    athlete_id: str
    date: str
    current_hrv: Optional[float] = None
    baseline_mean: float
    baseline_std: float
    z_score: float
    suppress_intensity: bool = Field(
        description="True if HRV is lower than mean - 1.5 sigma, forcing low intensity only"
    )
    status_message: str


class PhysiologicalState(BaseModel):
    """Unified deterministic physiological state for an athlete."""
    athlete_id: str
    date: str
    vdot_profile: DanielsTrainingPaces
    current_load: DailyLoadMetrics
    hrv_analysis: HRVBaselineAnalysis
    allowed_workout_types: List[str]
    coaching_summary: str

    @property
    def vdot(self) -> float:
        return self.vdot_profile.vdot

    @property
    def paces(self) -> DanielsTrainingPaces:
        return self.vdot_profile

    @property
    def load_metrics(self) -> DailyLoadMetrics:
        return self.current_load

    @property
    def hrv_baseline(self) -> HRVBaselineAnalysis:
        return self.hrv_analysis


class AthleteMemoryItem(BaseModel):
    """Episodic memory item stored in SQLite."""
    id: Optional[int] = None
    athlete_id: str
    category: str
    content: str
    severity: int = 1
    created_at: Optional[str] = None
    expires_at: Optional[str] = None
    is_active: bool = True


class DuoSynergyItem(BaseModel):
    """Feedback and pacing metrics for a shared session."""
    id: Optional[int] = None
    session_date: str
    common_workout_type: str
    louis_feedback: Optional[str] = None
    clara_feedback: Optional[str] = None
    pacing_delta_sec: Optional[int] = None
    synergy_rating: int = Field(ge=1, le=5, default=5)
