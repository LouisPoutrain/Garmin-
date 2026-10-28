export type AthleteId = 'louis' | 'clara' | 'duo';

export interface AthleteStatus {
  status: string;
  athlete?: AthleteId;
  garmin_connected: boolean;
  both_connected?: boolean;
  athlete_name: string;
  primary_goal: string;
  sports: string[];
  date: string;
  louis?: {
    name: string;
    goal: string;
    connected: boolean;
  };
  clara?: {
    name: string;
    goal: string;
    connected: boolean;
  };
}

export interface Biometrics {
  athlete?: AthleteId;
  date: string;
  synced_today?: boolean;
  garmin_connected?: boolean;
  last_sync_gmt?: string | null;
  readiness_score: number | null;
  readiness_level: 'green' | 'yellow' | 'red' | 'pending';
  body_battery: number | null;
  resting_hr: number | null;
  avg_stress: number | null;
  sleep_hours: number | null;
  sleep_score: number | null;
  summary_message?: string;
  advice?: string[];
  louis?: Biometrics;
  clara?: Biometrics;
}

export interface Activity {
  id: number | string;
  name: string;
  sport: string;
  date: string;
  time: string;
  duration_minutes: number;
  distance_km: number;
  elevation_gain_m?: number;
  avg_hr?: number;
  speed_kmh?: number;
  aerobic_te?: number;
  anaerobic_te?: number;
  athlete_id?: string;
  athlete_name?: string;
}

export interface GoalProgression {
  goal_title: string;
  target_deadline: string;
  target_time: string;
  target_pace: string;
  current_pr: string;
  current_pace: string;
  delta_seconds: number;
  delta_text: string;
  progress_percent: number;
  weekly_hybrid: string;
  next_milestone: string;
}

export interface ActualActivityInfo {
  id?: number | string;
  name: string;
  sport?: string;
  distance_km?: number;
  duration_min?: number;
  avg_hr?: number;
  speed_kmh?: number;
  pace?: string;
  aerobic_te?: number;
  anaerobic_te?: number;
  note?: string;
  completed_at?: string;
  garmin_activity_id?: string | number;
  garmin_synced?: boolean;
}

export interface ManualSessionValidationParams {
  date_iso: string;
  athlete_id?: string;
  sport?: string;
  completed?: boolean;
  duration_minutes?: number;
  activity_name?: string;
  description?: string;
  start_time?: string;
  push_to_garmin?: boolean;
  note?: string;
}

export interface DayPlan {
  athlete_id?: string;
  day_index?: number;
  day: string;
  day_name?: string;
  date_iso?: string;
  date_short?: string;
  date_formatted?: string;
  full_date_fr?: string;
  is_today?: boolean;
  is_past?: boolean;
  is_future?: boolean;
  is_shared?: boolean;
  shared_notes?: string;
  louis?: DayPlan;
  clara?: DayPlan;
  sport: string;
  sport_icon?: string;
  type: string;
  duration: string;
  intensity?: string;
  focus?: string;
  is_key?: boolean;
  status?: 'completed' | 'completed_manual' | 'today_pending' | 'rest_completed' | 'missed' | 'planned';
  status_label?: string;
  status_color?: string;
  actual_activity?: ActualActivityInfo | null;
  garmin_scheduled?: { workout_id: string; workout_name: string } | null;
  can_schedule_garmin?: boolean;
  can_manual_toggle?: boolean;
  workout_structure?: {
    type?: string;
    workout_name?: string;
    repeats?: number;
    rep_seconds?: number;
    recovery_seconds?: number;
    warmup_min?: number;
    cooldown_min?: number;
    hr_zone?: string;
    hr_min?: number;
    hr_max?: number;
    duration_minutes?: number;
  };
}

export interface AcwrData {
  date: string;
  acute_load: number;
  chronic_load: number;
  acwr_ratio: number;
  zone: 'under_training' | 'optimal' | 'warning' | 'hazard';
  zone_label: string;
  color: string;
  recommendation: string;
  weekly_total_trimp: number;
}

export interface CoachingAdaptation {
  id?: number;
  date: string;
  trigger_reason: string;
  original_workout: string;
  proposed_workout: string;
  proposed_structure?: any;
  coach_advice?: string;
  status: 'pending' | 'applied' | 'dismissed';
}

export interface WeeklyScorecard {
  completed_sessions: number;
  total_planned_sessions: number;
  completion_rate_percent: number;
  actual_volume_km: number;
}

export type Scorecard = WeeklyScorecard;
export type CalendarScorecard = WeeklyScorecard;

export interface WeeklyPlanData {
  athlete: string;
  athlete_id?: AthleteId;
  methodology: string;
  progression: GoalProgression;
  coordination_notes?: string;
  days: DayPlan[];
  louis_days?: DayPlan[];
  clara_days?: DayPlan[];
  louis_scorecard?: WeeklyScorecard;
  clara_scorecard?: WeeklyScorecard;
  acwr?: AcwrData;
  calendar?: {
    week_title: string;
    week_number: number;
    year: number;
    start_date: string;
    end_date: string;
    is_current_week: boolean;
    offset_weeks: number;
    today_iso: string;
    today_full_fr: string;
    scorecard: WeeklyScorecard;
  };
  scorecard?: WeeklyScorecard;
  week_title?: string;
  is_current_week?: boolean;
  offset_weeks?: number;
  today_iso?: string;
}

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
  learned_facts?: string[];
  search_used?: boolean;
  search_sources?: SearchSource[];
  sources?: SearchSource[];
  model?: string;
  is_loading?: boolean;
  error?: boolean;
}

export interface MemoryFacts {
  injuries_and_sensitivities: string[];
  preferences: string[];
  active_goals: string[];
  schedule_constraints: string[];
}

export interface AthleteMemory {
  athlete_name: string;
  last_updated: string;
  facts: MemoryFacts;
}

export interface HistoryProfile {
  total_activities_analyzed: number;
  lifetime_volume_km: number;
  lifetime_duration_hours: number;
  running_profile: {
    sessions: number;
    total_km: number;
    average_pace: string;
    longest_run: string;
  };
  cycling_profile: {
    sessions: number;
    total_km: number;
    max_distance_km: number;
  };
  personal_records: Record<string, string>;
}

export interface LapSplit {
  lap_number: number;
  distance_m: number;
  distance_km: number;
  cumul_km: number;
  duration_sec: number;
  duration_formatted: string;
  pace: string;
  speed_kmh: number;
  avg_hr?: number;
  max_hr?: number;
  avg_cadence?: number;
  elevation_gain_m: number;
  elevation_loss_m: number;
  calories: number;
}

export interface HRZoneBreakdown {
  zone_number: number;
  zone_name: string;
  low_boundary_bpm?: number;
  duration_sec: number;
  duration_formatted: string;
  percent: number;
}

export interface DetailedActivity {
  id: number | string;
  name: string;
  sport: string;
  start_time_local: string;
  date: string;
  time: string;
  distance_km: number;
  duration_sec: number;
  duration_formatted: string;
  moving_duration_formatted: string;
  avg_speed_kmh: number;
  avg_pace: string;
  max_speed_kmh?: number;
  avg_hr?: number;
  max_hr?: number;
  calories: number;
  elevation: {
    gain_m: number;
    loss_m: number;
    max_m?: number;
    min_m?: number;
  };
  biomechanics: {
    avg_cadence_spm?: number;
    max_cadence_spm?: number;
    stride_length_cm?: number;
    total_steps?: number;
  };
  training_effect?: {
    aerobic?: number;
    anaerobic?: number;
    label?: string;
  };
  laps: LapSplit[];
  hr_zones: HRZoneBreakdown[];
  weather?: {
    temperature_c?: number;
    feels_like_c?: number;
    relative_humidity?: number;
    wind_speed_kmh?: number;
    condition?: string;
  };
}
