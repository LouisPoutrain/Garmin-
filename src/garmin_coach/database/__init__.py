"""Database package for Garmin Coach AI."""
from garmin_coach.database.db import get_connection, init_db
from garmin_coach.database.repository import (
    WorkoutRepository,
    ManualCompletionRepository,
    BiometricsRepository,
)

__all__ = [
    "get_connection",
    "init_db",
    "WorkoutRepository",
    "ManualCompletionRepository",
    "BiometricsRepository",
]
