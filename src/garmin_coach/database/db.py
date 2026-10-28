"""
Database manager and initialization for Garmin Coach AI.
Uses built-in SQLite with WAL mode for fast concurrent reads and ACID transactions.
"""
import json
import os
import sqlite3
from pathlib import Path
from typing import Optional

DB_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
DB_PATH = DB_DIR / "garmin_coach.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Returns a thread-safe sqlite3 connection with WAL mode and row factory."""
    target_path = db_path or DB_PATH
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(target_path), timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def init_db(db_path: Optional[Path] = None):
    """Initializes tables, performs schema migrations, and seeds multi-athlete plans."""
    conn = get_connection(db_path)
    try:
        # 1. Run multi-athlete migration on existing tables if needed
        migrate_schema_to_multi_athlete(conn)

        # 2. Ensure schema definitions are applied
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()

        # 3. Migrate existing JSON data if SQLite tables were empty
        migrate_from_json_if_needed(conn)

        # 4. Seed Clara's initial 3-week plan and athletes table
        seed_clara_training_plan_if_needed(conn)
    finally:
        conn.close()


def migrate_schema_to_multi_athlete(conn: sqlite3.Connection):
    """Non-destructively migrates existing single-athlete tables to support multi-athlete."""
    cursor = conn.cursor()

    # 1. Athletes table
    conn.execute("""
    CREATE TABLE IF NOT EXISTS athletes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        primary_goal TEXT NOT NULL,
        target_race TEXT,
        target_date TEXT,
        target_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.execute("""
    INSERT OR IGNORE INTO athletes (id, name, primary_goal, target_race, target_date, target_time)
    VALUES 
    ('louis', 'Louis', '10 km sous les 40 min', '10 km route', '2027-04-18', '00:39:59'),
    ('clara', 'Clara', '10 km sous les 50 min', '10 km route', '2027-04-18', '00:49:59');
    """)

    # 2. planned_workouts migration (composite PK: athlete_id, date)
    cursor.execute("PRAGMA table_info(planned_workouts)")
    cols = [c[1] for c in cursor.fetchall()]
    if cols and "athlete_id" not in cols:
        conn.execute("ALTER TABLE planned_workouts RENAME TO planned_workouts_old;")
        conn.execute("""
        CREATE TABLE planned_workouts (
            athlete_id TEXT NOT NULL DEFAULT 'louis',
            date TEXT NOT NULL,
            sport TEXT NOT NULL,
            workout_type TEXT NOT NULL,
            duration TEXT NOT NULL,
            intensity TEXT,
            focus TEXT,
            is_key INTEGER DEFAULT 0,
            is_shared INTEGER DEFAULT 0,
            shared_notes TEXT,
            workout_structure TEXT,
            status TEXT DEFAULT 'planned',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (athlete_id, date)
        );
        """)
        conn.execute("""
        INSERT INTO planned_workouts (
            athlete_id, date, sport, workout_type, duration, intensity, focus, is_key, is_shared, shared_notes, workout_structure, status, created_at, updated_at
        )
        SELECT 
            'louis', date, sport, workout_type, duration, intensity, focus, is_key, 0, NULL, workout_structure, status, created_at, updated_at
        FROM planned_workouts_old;
        """)
        conn.execute("DROP TABLE planned_workouts_old;")

    # 3. manual_completions migration (composite PK: athlete_id, date)
    cursor.execute("PRAGMA table_info(manual_completions)")
    cols = [c[1] for c in cursor.fetchall()]
    if cols and "athlete_id" not in cols:
        conn.execute("ALTER TABLE manual_completions RENAME TO manual_completions_old;")
        conn.execute("""
        CREATE TABLE manual_completions (
            athlete_id TEXT NOT NULL DEFAULT 'louis',
            date TEXT NOT NULL,
            sport TEXT NOT NULL,
            completed INTEGER DEFAULT 1,
            duration_minutes INTEGER DEFAULT 90,
            activity_name TEXT,
            description TEXT,
            start_time TEXT DEFAULT '19:30',
            garmin_synced INTEGER DEFAULT 0,
            garmin_activity_id TEXT,
            note TEXT,
            completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (athlete_id, date)
        );
        """)
        conn.execute("""
        INSERT INTO manual_completions (
            athlete_id, date, sport, completed, duration_minutes, activity_name, description, start_time, garmin_synced, garmin_activity_id, note, completed_at
        )
        SELECT 
            'louis', date, sport, completed, duration_minutes, activity_name, description, start_time, garmin_synced, garmin_activity_id, note, completed_at
        FROM manual_completions_old;
        """)
        conn.execute("DROP TABLE manual_completions_old;")

    # 4. biometrics_history migration (composite PK: athlete_id, date)
    cursor.execute("PRAGMA table_info(biometrics_history)")
    cols = [c[1] for c in cursor.fetchall()]
    if cols and "athlete_id" not in cols:
        conn.execute("ALTER TABLE biometrics_history RENAME TO biometrics_history_old;")
        conn.execute("""
        CREATE TABLE biometrics_history (
            athlete_id TEXT NOT NULL DEFAULT 'louis',
            date TEXT NOT NULL,
            readiness_score INTEGER,
            body_battery INTEGER,
            resting_hr INTEGER,
            sleep_hours REAL,
            sleep_score INTEGER,
            stress_avg INTEGER,
            raw_json TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (athlete_id, date)
        );
        """)
        conn.execute("""
        INSERT INTO biometrics_history (
            athlete_id, date, readiness_score, body_battery, resting_hr, sleep_hours, sleep_score, stress_avg, raw_json, updated_at
        )
        SELECT 
            'louis', date, readiness_score, body_battery, resting_hr, sleep_hours, sleep_score, stress_avg, raw_json, updated_at
        FROM biometrics_history_old;
        """)
        conn.execute("DROP TABLE biometrics_history_old;")

    # 5. activities_cache athlete_id column
    cursor.execute("PRAGMA table_info(activities_cache)")
    cols = [c[1] for c in cursor.fetchall()]
    if cols and "athlete_id" not in cols:
        conn.execute("ALTER TABLE activities_cache ADD COLUMN athlete_id TEXT DEFAULT 'louis';")

    # 6. athlete_facts athlete_id column
    cursor.execute("PRAGMA table_info(athlete_facts)")
    cols = [c[1] for c in cursor.fetchall()]
    if cols and "athlete_id" not in cols:
        conn.execute("ALTER TABLE athlete_facts ADD COLUMN athlete_id TEXT NOT NULL DEFAULT 'louis';")

    # 7. coaching_adaptations athlete_id column
    cursor.execute("PRAGMA table_info(coaching_adaptations)")
    cols = [c[1] for c in cursor.fetchall()]
    if cols and "athlete_id" not in cols:
        conn.execute("ALTER TABLE coaching_adaptations ADD COLUMN athlete_id TEXT NOT NULL DEFAULT 'louis';")

    conn.commit()


def seed_clara_training_plan_if_needed(conn: sqlite3.Connection):
    """Seeds Clara's initial 3-week progressive training plan if not yet present."""
    row = conn.execute("SELECT COUNT(*) AS c FROM planned_workouts WHERE athlete_id = 'clara'").fetchone()
    if row and row["c"] > 0:
        return

    clara_sessions = [
        # === Semaine 1 (2026-10-19 to 2026-10-25) ===
        ("2026-10-19", "recovery", "Repos complet", "Journée off", "Repos", "Assimilation & régénération musculaire", 0, 0, None, None),
        ("2026-10-20", "running", "Footing Aérobie Z2 (35 min)", "35 min", "Zone 2 (129-148 bpm)", "Endurance fondamentale, allure cible ~6:00 min/km, foulée relâchée", 1, 0, None, json.dumps({
            "type": "continuous", "workout_name": "Footing Aérobie Z2 35min", "duration_minutes": 35,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
        ("2026-10-21", "running", "Fractionné Court VMA : 8 x 200m", "45 min", "Zone 5 (VMA)", "Échauffement 15 min + 8 x 200m à 4:35/km r=45s trot + retour au calme 10 min", 1, 0, None, json.dumps({
            "type": "intervals", "workout_name": "Fractionné 8x200m VMA", "repeats": 8, "rep_seconds": 55, "recovery_seconds": 45,
            "warmup_min": 15, "cooldown_min": 10, "hr_zone": "Z5", "hr_min": 176, "hr_max": 185
        })),
        ("2026-10-22", "strength", "Renforcement & Mobilité", "30 min", "Légère", "Gainage, fentes, proprioception cheville pour la course à pied", 0, 0, None, None),
        ("2026-10-23", "running", "Footing Z2 Foncier (40 min)", "40 min", "Zone 2 (129-148 bpm)", "Footing aérobie régulier à ~5:55 min/km", 1, 1, "Séance en duo : Louis accompagne Clara en vraie Z2 pour réguler son propre cardio !", json.dumps({
            "type": "continuous", "workout_name": "Footing Z2 Duo 40min", "duration_minutes": 40,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
        ("2026-10-24", "recovery", "Repos actif", "Journée off", "Repos", "Marche détente ou récupération", 0, 0, None, None),
        ("2026-10-25", "running", "Sortie Longue Z2 Progressive (50 min)", "50 min", "Zone 2 (129-148 bpm)", "Endurance longue progressive, 40 min à 6:00/km + 10 min à 5:35/km", 1, 1, "Sortie longue en duo le dimanche matin !", json.dumps({
            "type": "continuous", "workout_name": "Sortie Longue Z2 50min", "duration_minutes": 50,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),

        # === Semaine 2 (2026-10-26 to 2026-11-01) - Semaine en cours ===
        ("2026-10-26", "recovery", "Repos complet", "Journée off", "Repos", "Récupération après la sortie longue", 0, 0, None, None),
        ("2026-10-27", "running", "Footing Z2 Régénération (40 min)", "40 min", "Zone 2 (129-148 bpm)", "Footing très souple, travail de cadence à 170 ppm", 1, 0, None, json.dumps({
            "type": "continuous", "workout_name": "Footing Z2 Régénération 40min", "duration_minutes": 40,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
        ("2026-10-28", "running", "Séance Spécifique 10k : 5 x 600m", "50 min", "Allure Spé (4:55 min/km)", "15 min échauffement + 5 x 600m à 4:55/km r=1'30\" trot + 10 min retour calme", 1, 0, None, json.dumps({
            "type": "intervals", "workout_name": "Spé 10k 5x600m Clara", "repeats": 5, "rep_seconds": 177, "recovery_seconds": 90,
            "warmup_min": 15, "cooldown_min": 10, "hr_zone": "Z4", "hr_min": 163, "hr_max": 175
        })),
        ("2026-10-29", "strength", "Renforcement & Étirements", "30 min", "Légère", "Gainage statique/dynamique et ouverture de hanches", 0, 0, None, None),
        ("2026-10-30", "running", "Footing Z2 Endurance Fondamentale (45 min)", "45 min", "Zone 2 (129-148 bpm)", "Endurance aérobie, allure régulière 5:50 min/km", 1, 1, "Séance commune avec Louis : échauffement partagé et retour au calme ensemble !", json.dumps({
            "type": "continuous", "workout_name": "Footing Z2 Duo 45min", "duration_minutes": 45,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
        ("2026-10-31", "recovery", "Repos complet", "Journée off", "Repos", "Fraîcheur avant la sortie longue dominicale", 0, 0, None, None),
        ("2026-11-01", "running", "Sortie Longue Aérobie (55 min)", "55 min", "Zone 2 (129-148 bpm)", "Sortie longue dominicale en endurance pure à 5:50-6:00/km", 1, 1, "Sortie longue en duo le dimanche matin !", json.dumps({
            "type": "continuous", "workout_name": "Sortie Longue Z2 55min", "duration_minutes": 55,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),

        # === Semaine 3 (2026-11-02 to 2026-11-08) ===
        ("2026-11-02", "recovery", "Repos complet", "Journée off", "Repos", "Régénération", 0, 0, None, None),
        ("2026-11-03", "running", "Footing Z2 (40 min) + 4 lignes droites", "40 min", "Zone 2 (129-148 bpm)", "35 min Z2 à 5:50/km + 4 accélérations progressives 80m pour la posture", 1, 0, None, json.dumps({
            "type": "continuous", "workout_name": "Footing Z2 & Lignes droites", "duration_minutes": 40,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
        ("2026-11-04", "running", "Séance Seuil 10 km : 3 x 1500m", "55 min", "Zone 4 Seuil (163-175 bpm)", "15 min échauffement + 3 x 1500m à 4:52/km r=2'00\" trot + 10 min retour calme", 1, 0, None, json.dumps({
            "type": "intervals", "workout_name": "Seuil 3x1500m Clara", "repeats": 3, "rep_seconds": 438, "recovery_seconds": 120,
            "warmup_min": 15, "cooldown_min": 10, "hr_zone": "Z4", "hr_min": 163, "hr_max": 175
        })),
        ("2026-11-05", "strength", "Mobilité & Gainage doux", "25 min", "Légère", "Décharge musculaire et mobilité bassin", 0, 0, None, None),
        ("2026-11-06", "running", "Sortie Fondamentale Z2 (45 min)", "45 min", "Zone 2 (129-148 bpm)", "Endurance fondamentale à 5:45/km", 1, 1, "Séance commune en duo : Louis et Clara courent ensemble !", json.dumps({
            "type": "continuous", "workout_name": "Sortie Fondamentale Duo 45min", "duration_minutes": 45,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
        ("2026-11-07", "recovery", "Repos complet", "Journée off", "Repos", "Repos pré-sortie longue", 0, 0, None, None),
        ("2026-11-08", "running", "Sortie Longue Z2 avec bloc Tempo (60 min)", "60 min", "Zone 2-3 (135-155 bpm)", "40 min Z2 + 15 min Z3 allure semi (5:15/km) + 5 min retour au calme", 1, 1, "Sortie longue en duo le dimanche matin !", json.dumps({
            "type": "continuous", "workout_name": "Sortie Longue Tempo 60min", "duration_minutes": 60,
            "warmup_min": 5, "cooldown_min": 5, "hr_zone": "Z2", "hr_min": 129, "hr_max": 148
        })),
    ]

    for item in clara_sessions:
        conn.execute("""
        INSERT OR REPLACE INTO planned_workouts
        (athlete_id, date, sport, workout_type, duration, intensity, focus, is_key, is_shared, shared_notes, workout_structure, status)
        VALUES ('clara', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')
        """, item)

    # Mark Louis's corresponding shared sessions with is_shared = 1
    shared_dates = ["2026-10-23", "2026-10-25", "2026-10-30", "2026-11-01", "2026-11-06", "2026-11-08"]
    for d in shared_dates:
        conn.execute("""
        UPDATE planned_workouts
        SET is_shared = 1,
            shared_notes = CASE
                WHEN date = '2026-10-30' THEN 'Séance commune : Échauffement partagé 15 min et retour au calme ensemble !'
                WHEN date = '2026-11-06' THEN 'Sortie en duo : Allure 5:45-5:55/km. Idéal pour forcer Louis en vraie Z2 aérobie tout en accompagnant Clara !'
                ELSE 'Séance commune en duo avec Clara'
            END
        WHERE athlete_id = 'louis' AND date = ?
        """, (d,))

    conn.commit()
    print("✅ Plan d'entraînement de Clara (3 semaines) et séances partagées duo initialisés avec succès.")


def migrate_from_json_if_needed(conn: sqlite3.Connection):
    """Seamlessly imports legacy JSON files into SQLite on initial startup."""
    legacy_plan_file = DB_DIR / "custom_training_plan.json"
    legacy_manual_file = DB_DIR / "manual_completions.json"
    legacy_memory_file = DB_DIR / "coach_memory.json"

    # 1. Planned workouts
    row = conn.execute("SELECT COUNT(*) AS c FROM planned_workouts").fetchone()
    if row and row["c"] == 0 and legacy_plan_file.exists():
        try:
            with open(legacy_plan_file, "r", encoding="utf-8") as f:
                plan_data = json.load(f)
            for date_iso, s in plan_data.items():
                struct_json = json.dumps(s.get("workout_structure")) if s.get("workout_structure") else None
                conn.execute(
                    """
                    INSERT OR REPLACE INTO planned_workouts
                    (date, sport, workout_type, duration, intensity, focus, is_key, workout_structure, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        date_iso,
                        s.get("sport", "rest"),
                        s.get("type", "Entraînement"),
                        s.get("duration", "45 min"),
                        s.get("intensity", ""),
                        s.get("focus", ""),
                        1 if s.get("is_key") else 0,
                        struct_json,
                        s.get("status", "planned"),
                    ),
                )
            conn.commit()
            print(f"✅ Migré {len(plan_data)} séances d'entraînement depuis {legacy_plan_file.name} vers SQLite.")
        except Exception as e:
            print(f"Warning: échec migration legacy plan: {e}")

    # 2. Manual completions
    row = conn.execute("SELECT COUNT(*) AS c FROM manual_completions").fetchone()
    if row and row["c"] == 0 and legacy_manual_file.exists():
        try:
            with open(legacy_manual_file, "r", encoding="utf-8") as f:
                manual_data = json.load(f)
            for date_iso, m in manual_data.items():
                conn.execute(
                    """
                    INSERT OR REPLACE INTO manual_completions
                    (date, sport, completed, duration_minutes, activity_name, description, start_time, garmin_synced, garmin_activity_id, note, completed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        date_iso,
                        m.get("sport", "ultimate"),
                        1 if m.get("completed", True) else 0,
                        int(m.get("duration_minutes", 90)),
                        m.get("activity_name", ""),
                        m.get("description", ""),
                        m.get("start_time", "19:30"),
                        1 if m.get("garmin_synced") else 0,
                        str(m.get("garmin_activity_id")) if m.get("garmin_activity_id") else None,
                        m.get("note", ""),
                        m.get("completed_at", ""),
                    ),
                )
            conn.commit()
            print(f"✅ Migré {len(manual_data)} complétions manuelles depuis {legacy_manual_file.name} vers SQLite.")
        except Exception as e:
            print(f"Warning: échec migration legacy manual: {e}")

    # 3. Memory facts
    row = conn.execute("SELECT COUNT(*) AS c FROM athlete_facts").fetchone()
    if row and row["c"] == 0 and legacy_memory_file.exists():
        try:
            with open(legacy_memory_file, "r", encoding="utf-8") as f:
                mem_data = json.load(f)
            facts_dict = mem_data.get("facts", {})
            inserted = 0
            for category, fact_list in facts_dict.items():
                if isinstance(fact_list, list):
                    for fact in fact_list:
                        conn.execute(
                            "INSERT INTO athlete_facts (category, fact, active) VALUES (?, ?, 1)",
                            (category, str(fact)),
                        )
                        inserted += 1
            conn.commit()
            print(f"✅ Migré {inserted} faits de mémoire depuis {legacy_memory_file.name} vers SQLite.")
        except Exception as e:
            print(f"Warning: échec migration legacy memory: {e}")
