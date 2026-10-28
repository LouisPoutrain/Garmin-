"""
Repository data access layer for Garmin Coach AI (Multi-Athlete / Duo).
Provides typed access to SQLite tables with JSON serialization helpers.
"""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from garmin_coach.database.db import get_connection, init_db


class WorkoutRepository:
    """Handles persistence of planned workouts and cycles for Louis and Clara."""

    @staticmethod
    def get_all(athlete_id: str = "louis") -> Dict[str, Dict[str, Any]]:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            rows = conn.execute(
                "SELECT * FROM planned_workouts WHERE athlete_id = ? ORDER BY date ASC",
                (clean_id,),
            ).fetchall()
            result = {}
            for r in rows:
                struct = json.loads(r["workout_structure"]) if r["workout_structure"] else None
                result[r["date"]] = {
                    "athlete_id": r["athlete_id"],
                    "sport": r["sport"],
                    "type": r["workout_type"],
                    "duration": r["duration"],
                    "intensity": r["intensity"] or "",
                    "focus": r["focus"] or "",
                    "is_key": bool(r["is_key"]),
                    "is_shared": bool(r["is_shared"]),
                    "shared_notes": r["shared_notes"] or "",
                    "workout_structure": struct,
                    "status": r["status"] or "planned",
                }
            return result
        finally:
            conn.close()

    @staticmethod
    def get_by_date(date_iso: str, athlete_id: str = "louis") -> Optional[Dict[str, Any]]:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            row = conn.execute(
                "SELECT * FROM planned_workouts WHERE athlete_id = ? AND date = ?",
                (clean_id, date_iso),
            ).fetchone()
            if not row:
                return None
            struct = json.loads(row["workout_structure"]) if row["workout_structure"] else None
            return {
                "athlete_id": row["athlete_id"],
                "sport": row["sport"],
                "type": row["workout_type"],
                "duration": row["duration"],
                "intensity": row["intensity"] or "",
                "focus": row["focus"] or "",
                "is_key": bool(row["is_key"]),
                "is_shared": bool(row["is_shared"]),
                "shared_notes": row["shared_notes"] or "",
                "workout_structure": struct,
                "status": row["status"] or "planned",
            }
        finally:
            conn.close()

    @staticmethod
    def get_duo_plan() -> Dict[str, Dict[str, Dict[str, Any]]]:
        """Returns workouts for both athletes keyed by athlete_id."""
        return {
            "louis": WorkoutRepository.get_all("louis"),
            "clara": WorkoutRepository.get_all("clara"),
        }

    @staticmethod
    def save_plan(plan_dict: Dict[str, Dict[str, Any]], athlete_id: str = "louis") -> None:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            now = datetime.now().isoformat()
            for date_iso, s in plan_dict.items():
                struct_json = json.dumps(s.get("workout_structure")) if s.get("workout_structure") else None
                conn.execute(
                    """
                    INSERT INTO planned_workouts
                    (athlete_id, date, sport, workout_type, duration, intensity, focus, is_key, is_shared, shared_notes, workout_structure, status, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(athlete_id, date) DO UPDATE SET
                        sport=excluded.sport,
                        workout_type=excluded.workout_type,
                        duration=excluded.duration,
                        intensity=excluded.intensity,
                        focus=excluded.focus,
                        is_key=excluded.is_key,
                        is_shared=excluded.is_shared,
                        shared_notes=excluded.shared_notes,
                        workout_structure=excluded.workout_structure,
                        status=excluded.status,
                        updated_at=excluded.updated_at
                    """,
                    (
                        clean_id,
                        date_iso,
                        s.get("sport", "rest"),
                        s.get("type", "Entraînement"),
                        s.get("duration", "45 min"),
                        s.get("intensity", ""),
                        s.get("focus", ""),
                        1 if s.get("is_key") else 0,
                        1 if s.get("is_shared") else 0,
                        s.get("shared_notes") or "",
                        struct_json,
                        s.get("status", "planned"),
                        now,
                    ),
                )
            conn.commit()
        finally:
            conn.close()


class ManualCompletionRepository:
    """Handles manual session logs and Garmin synchronization records per athlete."""

    @staticmethod
    def get_all(athlete_id: str = "louis") -> Dict[str, Dict[str, Any]]:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            rows = conn.execute(
                "SELECT * FROM manual_completions WHERE athlete_id = ?",
                (clean_id,),
            ).fetchall()
            result = {}
            for r in rows:
                result[r["date"]] = {
                    "athlete_id": r["athlete_id"],
                    "sport": r["sport"],
                    "completed": bool(r["completed"]),
                    "duration_minutes": r["duration_minutes"],
                    "activity_name": r["activity_name"] or "",
                    "description": r["description"] or "",
                    "start_time": r["start_time"] or "19:30",
                    "garmin_synced": bool(r["garmin_synced"]),
                    "garmin_activity_id": r["garmin_activity_id"],
                    "note": r["note"] or "",
                    "completed_at": r["completed_at"] or "",
                }
            return result
        finally:
            conn.close()

    @staticmethod
    def save(date_iso: str, data: Dict[str, Any], athlete_id: str = "louis") -> None:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            conn.execute(
                """
                INSERT INTO manual_completions
                (athlete_id, date, sport, completed, duration_minutes, activity_name, description, start_time, garmin_synced, garmin_activity_id, note, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(athlete_id, date) DO UPDATE SET
                    sport=excluded.sport,
                    completed=excluded.completed,
                    duration_minutes=excluded.duration_minutes,
                    activity_name=excluded.activity_name,
                    description=excluded.description,
                    start_time=excluded.start_time,
                    garmin_synced=excluded.garmin_synced,
                    garmin_activity_id=excluded.garmin_activity_id,
                    note=excluded.note,
                    completed_at=excluded.completed_at
                """,
                (
                    clean_id,
                    date_iso,
                    data.get("sport", "ultimate"),
                    1 if data.get("completed", True) else 0,
                    int(data.get("duration_minutes", 90)),
                    data.get("activity_name", ""),
                    data.get("description", ""),
                    data.get("start_time", "19:30"),
                    1 if data.get("garmin_synced") else 0,
                    str(data.get("garmin_activity_id")) if data.get("garmin_activity_id") else None,
                    data.get("note", ""),
                    data.get("completed_at", datetime.now().isoformat()),
                ),
            )
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def delete(date_iso: str, athlete_id: str = "louis") -> None:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            conn.execute(
                "DELETE FROM manual_completions WHERE athlete_id = ? AND date = ?",
                (clean_id, date_iso),
            )
            conn.commit()
        finally:
            conn.close()


class BiometricsRepository:
    """Persists daily physiological snapshots for long-term tracking per athlete."""

    @staticmethod
    def save_snapshot(
        date_iso: str,
        metrics: Dict[str, Any],
        athlete_id: str = "louis",
        raw_data: Optional[Dict] = None,
    ) -> None:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            raw_str = json.dumps(raw_data) if raw_data else None
            conn.execute(
                """
                INSERT INTO biometrics_history
                (athlete_id, date, readiness_score, body_battery, resting_hr, sleep_hours, sleep_score, stress_avg, raw_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(athlete_id, date) DO UPDATE SET
                    readiness_score=excluded.readiness_score,
                    body_battery=excluded.body_battery,
                    resting_hr=excluded.resting_hr,
                    sleep_hours=excluded.sleep_hours,
                    sleep_score=excluded.sleep_score,
                    stress_avg=excluded.stress_avg,
                    raw_json=excluded.raw_json,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    clean_id,
                    date_iso,
                    metrics.get("readiness_score"),
                    metrics.get("body_battery"),
                    metrics.get("resting_hr"),
                    metrics.get("sleep_hours"),
                    metrics.get("sleep_score"),
                    metrics.get("stress_avg"),
                    raw_str,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def get_snapshot(date_iso: str, athlete_id: str = "louis") -> Optional[Dict[str, Any]]:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            row = conn.execute(
                "SELECT * FROM biometrics_history WHERE athlete_id = ? AND date = ?",
                (clean_id, date_iso),
            ).fetchone()
            if not row:
                return None
            return {
                "athlete_id": row["athlete_id"],
                "date": row["date"],
                "readiness_score": row["readiness_score"],
                "body_battery": row["body_battery"],
                "resting_hr": row["resting_hr"],
                "sleep_hours": row["sleep_hours"],
                "sleep_score": row["sleep_score"],
                "stress_avg": row["stress_avg"],
            }
        finally:
            conn.close()


class AthleteMemoryRepository:
    """Handles episodic memory persistence, severity weighting, and automatic expiration."""

    @staticmethod
    def record_memory(
        athlete_id: str,
        category: str,
        content: str,
        severity: int = 1,
        expires_at: Optional[str] = None,
    ) -> int:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO athlete_memories
                (athlete_id, category, content, severity, expires_at, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
                """,
                (clean_id, category.strip().lower(), content.strip(), severity, expires_at),
            )
            conn.commit()
            return cur.lastrowid
        finally:
            conn.close()

    @staticmethod
    def get_active(athlete_id: str) -> List[Dict[str, Any]]:
        """Returns active, non-expired memories for an athlete."""
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            rows = conn.execute(
                """
                SELECT id, athlete_id, category, content, severity, created_at, expires_at, is_active
                FROM athlete_memories
                WHERE athlete_id = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
                ORDER BY severity DESC, created_at DESC
                """,
                (clean_id,),
            ).fetchall()
            return [
                {
                    "id": r["id"],
                    "athlete_id": r["athlete_id"],
                    "category": r["category"],
                    "content": r["content"],
                    "severity": r["severity"],
                    "created_at": r["created_at"],
                    "expires_at": r["expires_at"],
                    "is_active": bool(r["is_active"]),
                }
                for r in rows
            ]
        finally:
            conn.close()

    @staticmethod
    def deactivate(memory_id: int) -> bool:
        init_db()
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE athlete_memories SET is_active = 0 WHERE id = ?", (memory_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()

    @staticmethod
    def clear_category(athlete_id: str, category: str) -> int:
        init_db()
        conn = get_connection()
        clean_id = (athlete_id or "louis").strip().lower()
        try:
            cur = conn.cursor()
            cur.execute(
                "UPDATE athlete_memories SET is_active = 0 WHERE athlete_id = ? AND category = ?",
                (clean_id, category.strip().lower()),
            )
            conn.commit()
            return cur.rowcount
        finally:
            conn.close()


class DuoSynergyRepository:
    """Handles shared duo session feedback, pacing synchronization, and synergy ratings."""

    @staticmethod
    def log_session(
        session_date: str,
        common_workout_type: str,
        louis_feedback: str = "",
        clara_feedback: str = "",
        pacing_delta_sec: int = 0,
        synergy_rating: int = 5,
    ) -> int:
        init_db()
        conn = get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO duo_synergy_logs
                (session_date, common_workout_type, louis_feedback, clara_feedback, pacing_delta_sec, synergy_rating)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    session_date,
                    common_workout_type,
                    louis_feedback.strip(),
                    clara_feedback.strip(),
                    pacing_delta_sec,
                    max(1, min(synergy_rating, 5)),
                ),
            )
            conn.commit()
            return cur.lastrowid
        finally:
            conn.close()

    @staticmethod
    def get_recent(limit: int = 10) -> List[Dict[str, Any]]:
        init_db()
        conn = get_connection()
        try:
            rows = conn.execute(
                """
                SELECT id, session_date, common_workout_type, louis_feedback, clara_feedback, pacing_delta_sec, synergy_rating
                FROM duo_synergy_logs
                ORDER BY session_date DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            return [
                {
                    "id": r["id"],
                    "session_date": str(r["session_date"]),
                    "common_workout_type": r["common_workout_type"],
                    "louis_feedback": r["louis_feedback"] or "",
                    "clara_feedback": r["clara_feedback"] or "",
                    "pacing_delta_sec": r["pacing_delta_sec"],
                    "synergy_rating": r["synergy_rating"],
                }
                for r in rows
            ]
        finally:
            conn.close()
