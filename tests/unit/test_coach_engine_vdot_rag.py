"""Unit tests for the Deterministic Physiology Engine, Doctrine RAG Store, and Episodic Memory."""

import pytest
from datetime import datetime, date, timedelta

from garmin_coach.physiology import (
    calculate_vdot,
    get_daniels_paces,
    calculate_trimp,
    calculate_ctl_atl_tsb,
    analyze_hrv_drift,
    get_complete_physiological_state,
)
from garmin_coach.rag.store import query_doctrine, get_doctrine_store
from garmin_coach.database.repository import AthleteMemoryRepository, DuoSynergyRepository
from garmin_coach.adaptation import evaluate_daily_adaptation
from garmin_coach.memory import record_feedback, get_active_memories, log_duo_session


class TestDeterministicPhysiology:
    """Tests Jack Daniels VDOT formula and exact training pace generation."""

    def test_vdot_louis_reference(self):
        # 10 km in 39:50 (2390 sec)
        vdot = calculate_vdot(distance_m=10000.0, time_sec=39 * 60 + 50)
        assert 51.5 <= vdot <= 53.0
        paces = get_daniels_paces("louis", 39 * 60 + 50)
        assert paces.athlete_id == "louis"
        assert paces.vdot == round(vdot, 2)
        # Threshold (T) must be faster than Marathon (M), and M faster than Easy (E)
        assert paces.threshold.seconds_per_km < paces.marathon.seconds_per_km < paces.easy_low.seconds_per_km
        # Intervals (I / VMA) must be faster than Threshold (T)
        assert paces.interval.seconds_per_km < paces.threshold.seconds_per_km
        # Repetitions (R) must be faster than Intervals (I)
        assert paces.repetition.seconds_per_km < paces.interval.seconds_per_km

    def test_vdot_clara_reference(self):
        # 10 km in 49:30 (2970 sec)
        vdot = calculate_vdot(distance_m=10000.0, time_sec=49 * 60 + 30)
        assert 39.5 <= vdot <= 41.5
        paces = get_daniels_paces("clara", 49 * 60 + 30)
        assert paces.athlete_id == "clara"
        # Easy Z2 high pace around ~5:55/km (355s/km)
        assert 350 <= paces.easy_high.seconds_per_km <= 365
        # Threshold T pace around ~5:03/km (303s/km)
        assert 295 <= paces.threshold.seconds_per_km <= 315

    def test_banister_trimp_calculation(self):
        # 45 min run at 150 bpm (rest 50, max 192, male)
        trimp_male = calculate_trimp(duration_min=45.0, avg_hr=150, resting_hr=50, max_hr=192, gender="male")
        assert trimp_male > 0
        trimp_female = calculate_trimp(duration_min=45.0, avg_hr=150, resting_hr=54, max_hr=185, gender="female")
        assert trimp_female > 0

    def test_ctl_atl_tsb_and_acwr(self):
        metrics = calculate_ctl_atl_tsb(athlete_id="louis", ref_date=date.today())
        assert metrics.ctl >= 0
        assert metrics.atl >= 0
        assert metrics.acwr >= 0
        assert isinstance(metrics.overload_warning, bool)

    def test_hrv_drift_suppress_intensity(self):
        # Normal value
        analysis_ok = analyze_hrv_drift(athlete_id="louis", current_hrv=65.0)
        assert analysis_ok.suppress_intensity is False

        # Severe drop below -1.5 sigma
        analysis_drop = analyze_hrv_drift(athlete_id="louis", current_hrv=30.0)
        assert analysis_drop.suppress_intensity is True
        assert analysis_drop.z_score < -1.5


class TestDoctrineRAG:
    """Tests ChromaDB doctrine indexing and semantic retrieval."""

    def test_rag_doctrine_store_initialized(self):
        store = get_doctrine_store()
        assert store.collection.count() >= 10

    def test_query_doctrine_hrv(self):
        results = query_doctrine("baisse VFC fatigue", topic="hrv", n_results=2)
        assert len(results) > 0
        assert results[0]["topic"] == "hrv"
        assert "content" in results[0]
        assert "title" in results[0]

    def test_query_doctrine_duo_crossover(self):
        results = query_doctrine("synchronisation allures couple duo", topic="duo", n_results=1)
        assert len(results) > 0
        assert results[0]["topic"] == "duo"
        assert "Duo" in results[0]["title"] or "Couple" in results[0]["content"]


class TestEpisodicMemory:
    """Tests SQLite episodic memory with automatic expiration and duo logs."""

    def test_record_feedback_with_expiration(self):
        # Fatigue / courbature should expire in 4 days
        res = record_feedback("louis", "Grosses courbatures aux ischios après séance")
        assert res["category"] == "fatigue"
        assert res["severity"] == 2
        assert res["expires_at"] is not None

        # Chronic injury should be permanent
        res_chronic = record_feedback("louis", "Antécédent de tendinite rotulienne genou droit")
        assert res_chronic["category"] == "injury"
        assert res_chronic["expires_at"] is None

        # Active memories retrieval
        active = get_active_memories("louis")
        assert len(active) >= 2
        assert any("courbatures" in m["content"] for m in active)

    def test_duo_synergy_logging(self):
        log_id = log_duo_session({
            "session_date": "2026-10-30",
            "common_workout_type": "Footing Z2 Foncier Duo",
            "louis_feedback": "Allure parfaite pour rester sous 140 bpm",
            "clara_feedback": "Super sensation de fluidité à 5:50/km",
            "pacing_delta_sec": 4,
            "synergy_rating": 5,
        })
        assert log_id > 0
        recent = DuoSynergyRepository.get_recent(10)
        matching = [r for r in recent if r["id"] == log_id]
        assert len(matching) == 1
        assert matching[0]["synergy_rating"] == 5


class TestAdaptationEngine:
    """Tests adaptation proposals with physiological triggers and doctrine citation."""

    def test_evaluate_adaptation_on_critical_hrv_and_acwr(self):
        planned = {
            "type": "Fractionné 10x400m VMA",
            "duration": "50 min",
            "sport": "running",
            "is_key": True,
        }
        proposal = evaluate_daily_adaptation(
            today_iso="2026-10-30",
            readiness_score=40,
            body_battery=30,
            acwr_data={"acwr_ratio": 1.55},
            planned_session=planned,
            hrv_analysis={"suppress_intensity": True, "current_rmssd": 35.0, "lower_threshold": 48.0},
            athlete_id="louis",
        )
        assert proposal is not None
        assert "Footing Régénératif" in proposal["proposed_workout"]
        assert "ACWR" in proposal["trigger_reason"]
        assert "VFC" in proposal["trigger_reason"]
        assert len(proposal.get("doctrine_rules", [])) > 0


class TestDynamicScheduleManagement:
    """Tests schedule conflict resolution, 48h spacing, and hotel travel mobility conversion."""

    def test_duo_schedule_conflict_resolution(self):
        from garmin_coach.planner import resolve_duo_schedule_conflict
        res = resolve_duo_schedule_conflict(
            louis_availabilities=["Mardi", "Jeudi"],
            clara_availabilities=["Mercredi", "Jeudi"],
        )
        assert res["status"] == "success"
        assert res["common_slot"] == "Jeudi"
        assert res["audit_checks"]["common_slot_identified"] is True
        assert res["audit_checks"]["no_intensity_clustering"] is True
        # Check Thursday has shared session
        louis_thu = next(d for d in res["louis_schedule"] if d["day"] == "Jeudi")
        clara_thu = next(d for d in res["clara_schedule"] if d["day"] == "Jeudi")
        assert louis_thu.get("is_shared") is True
        assert clara_thu.get("is_shared") is True

    def test_reschedule_with_48h_cascade(self):
        from garmin_coach.planner import reschedule_with_48h_rule
        template = [
            {"day": "Lundi", "type": "Repos", "sport": "recovery"},
            {"day": "Mardi", "type": "Fractionné VMA (8x1 min)", "sport": "running", "is_key": True},
            {"day": "Mercredi", "type": "Footing Z2 (40 min)", "sport": "running"},
            {"day": "Jeudi", "type": "Séance Clé Seuil (4x1000m)", "sport": "running", "is_key": True},
            {"day": "Vendredi", "type": "Repos", "sport": "recovery"},
            {"day": "Samedi", "type": "Footing Z2 Duo", "sport": "running"},
            {"day": "Dimanche", "type": "Sortie Longue 75 min", "sport": "running", "is_key": True},
        ]
        res = reschedule_with_48h_rule(template, from_day="Mardi", to_day="Mercredi", reason="Rush taf")
        assert res["status"] == "adapted"
        assert res["rule_48h_enforced"] is True
        # Wednesday has the VMA session
        wed = res["adapted_schedule"][2]
        assert "VMA" in wed["type"]
        # Thursday must be recovery (not Seuil)
        thu = res["adapted_schedule"][3]
        assert thu["sport"] == "recovery"
        assert "48h" in thu["type"]
        # Friday must have received the Seuil session
        fri = res["adapted_schedule"][4]
        assert "Seuil" in fri["type"]

    def test_convert_travel_week_to_mobility(self):
        from garmin_coach.planner import convert_travel_week_to_mobility
        template = [
            {"day": "Lundi", "type": "Repos", "sport": "recovery"},
            {"day": "Mardi", "type": "Footing Z2", "sport": "running"},
            {"day": "Mercredi", "type": "Fractionné Seuil", "sport": "running", "is_key": True},
            {"day": "Jeudi", "type": "Footing Z2", "sport": "running"},
            {"day": "Vendredi", "type": "Repos", "sport": "recovery"},
            {"day": "Samedi", "type": "Footing Z2 Duo", "sport": "running"},
            {"day": "Dimanche", "type": "Sortie Longue", "sport": "running", "is_key": True},
        ]
        res = convert_travel_week_to_mobility(template, ["Mardi", "Mercredi", "Jeudi"], "Hôtel Francfort")
        assert res["status"] == "travel_adapted"
        assert len(res["converted_sessions"]) == 3
        assert res["guilt_free_messaging"] is True
        # Converted days must be strength or recovery (no running)
        for day_name in ["Mardi", "Mercredi", "Jeudi"]:
            d_item = next(d for d in res["adapted_schedule"] if d["day"] == day_name)
            assert d_item["sport"] in ["strength", "recovery"]
