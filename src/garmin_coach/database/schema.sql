-- Database schema for Garmin Coach AI (Multi-Athlete / Duo)

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Athletes table (profiles)
CREATE TABLE IF NOT EXISTS athletes (
    id TEXT PRIMARY KEY, -- 'louis', 'clara'
    name TEXT NOT NULL,
    primary_goal TEXT NOT NULL,
    target_race TEXT,
    target_date TEXT,
    target_time TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Planned workouts table (keyed by athlete_id and date)
CREATE TABLE IF NOT EXISTS planned_workouts (
    athlete_id TEXT NOT NULL DEFAULT 'louis',
    date TEXT NOT NULL,
    sport TEXT NOT NULL,
    workout_type TEXT NOT NULL,
    duration TEXT NOT NULL,
    intensity TEXT,
    focus TEXT,
    is_key INTEGER DEFAULT 0,
    is_shared INTEGER DEFAULT 0, -- 1 if shared session with partner
    shared_notes TEXT,
    workout_structure TEXT, -- JSON string
    status TEXT DEFAULT 'planned',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (athlete_id, date)
);

-- Manual completions (replaces manual_completions.json)
CREATE TABLE IF NOT EXISTS manual_completions (
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

-- Historical activities cache with physiological TRIMP score
CREATE TABLE IF NOT EXISTS activities_cache (
    activity_id INTEGER PRIMARY KEY,
    athlete_id TEXT DEFAULT 'louis',
    start_time TEXT,
    sport_type TEXT,
    activity_name TEXT,
    distance_m REAL,
    duration_sec REAL,
    avg_hr INTEGER,
    max_hr INTEGER,
    elevation_gain_m REAL,
    avg_cadence INTEGER,
    speed_kmh REAL,
    pace_str TEXT,
    aerobic_te REAL,
    anaerobic_te REAL,
    raw_json TEXT, -- Full JSON payload from Garmin
    trimp_score REAL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Daily biometrics snapshots (Readiness, Body Battery, Sleep, Stress)
CREATE TABLE IF NOT EXISTS biometrics_history (
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

-- Athlete facts and persistent memory
CREATE TABLE IF NOT EXISTS athlete_facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id TEXT NOT NULL DEFAULT 'louis',
    category TEXT NOT NULL,
    fact TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Coaching adaptation proposals (Closed-loop suggestions)
CREATE TABLE IF NOT EXISTS coaching_adaptations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id TEXT NOT NULL DEFAULT 'louis',
    date TEXT NOT NULL,
    trigger_reason TEXT NOT NULL,
    original_workout TEXT,
    proposed_workout TEXT,
    proposed_structure TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'dismissed'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    applied_at TEXT
);

-- Episodic athlete memories (feedback, injuries, preferences with automatic expiration)
CREATE TABLE IF NOT EXISTS athlete_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id TEXT NOT NULL,           -- 'louis' ou 'clara'
    category TEXT NOT NULL,             -- 'injury', 'fatigue', 'preference', 'physiology'
    content TEXT NOT NULL,              -- ex: 'Douleur face externe genou droit après fractionné bitume'
    severity INTEGER DEFAULT 1,         -- 1 (léger) à 3 (critique)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,          -- null = permanent, date = expiration automatique
    is_active BOOLEAN DEFAULT 1
);

-- Duo shared session feedback & pacing synergy
CREATE TABLE IF NOT EXISTS duo_synergy_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date DATE NOT NULL,
    common_workout_type TEXT NOT NULL,  -- 'threshold_tempo', 'long_run', 'recovery'
    louis_feedback TEXT,
    clara_feedback TEXT,
    pacing_delta_sec INTEGER,           -- écart mesuré vs planifié
    synergy_rating INTEGER              -- 1 (contre-productif) à 5 (parfaite symbiose)
);

