"""Unit tests for the garmin_coach module."""

import pytest
from garmin_coach.models import ReadinessLevel, WorkoutType
from garmin_coach.profile import AthleteProfile
from garmin_coach.analyzer import CoachAnalyzer
from garmin_coach.planner import CoachPlanner


@pytest.fixture
def sample_profile(tmp_path):
    data = {
        "athlete": {"name": "Test Athlete", "primary_sports": ["running"]},
        "goals": {"primary_goal": "Progression 10k"},
        "zones": {"hr_zones": {"Z2_endurance": [120, 140], "Z4_threshold": [160, 175]}},
        "coaching_rules": {"min_readiness_for_intervals": 65, "min_sleep_score_for_hard_session": 70},
    }
    profile = AthleteProfile(data)
    return profile


def test_profile_properties(sample_profile):
    assert sample_profile.name == "Test Athlete"
    assert sample_profile.primary_sports == ["running"]
    assert sample_profile.min_readiness_for_intervals == 65


def test_analyzer_readiness_green(sample_profile):
    analyzer = CoachAnalyzer(sample_profile)
    assessment = analyzer.evaluate_readiness(
        readiness_data={"score": 80},
        sleep_data={"dailySleepDTO": {"sleepScores": {"overall": {"value": 85}}}},
    )
    assert assessment.level == ReadinessLevel.GREEN
    assert WorkoutType.INTERVALS_VO2MAX in assessment.allowed_workout_types


def test_analyzer_readiness_yellow(sample_profile):
    analyzer = CoachAnalyzer(sample_profile)
    assessment = analyzer.evaluate_readiness(
        readiness_data={"score": 55},
        sleep_data={"dailySleepDTO": {"sleepScores": {"overall": {"value": 60}}}},
    )
    assert assessment.level == ReadinessLevel.YELLOW
    assert WorkoutType.INTERVALS_VO2MAX not in assessment.allowed_workout_types
    assert WorkoutType.ENDURANCE_Z2 in assessment.allowed_workout_types


def test_analyzer_readiness_red(sample_profile):
    analyzer = CoachAnalyzer(sample_profile)
    assessment = analyzer.evaluate_readiness(
        readiness_data={"score": 30},
        sleep_data={"dailySleepDTO": {"sleepScores": {"overall": {"value": 45}}}},
    )
    assert assessment.level == ReadinessLevel.RED
    assert WorkoutType.REST in assessment.allowed_workout_types


def test_planner_recommendation_adapts_to_readiness(sample_profile):
    analyzer = CoachAnalyzer(sample_profile)
    planner = CoachPlanner(sample_profile)

    # Cas fatigue rouge -> repos
    assessment_red = analyzer.evaluate_readiness(readiness_data={"score": 25})
    workout_red = planner.recommend_daily_workout(assessment_red)
    assert workout_red.workout_type == WorkoutType.REST

    # Cas fatigue jaune -> Z2
    assessment_yellow = analyzer.evaluate_readiness(readiness_data={"score": 50})
    workout_yellow = planner.recommend_daily_workout(assessment_yellow)
    assert workout_yellow.workout_type == WorkoutType.ENDURANCE_Z2

    # Cas forme verte -> fractionné
    assessment_green = analyzer.evaluate_readiness(readiness_data={"score": 85})
    workout_green = planner.recommend_daily_workout(assessment_green)
    assert workout_green.workout_type == WorkoutType.INTERVALS_VO2MAX
