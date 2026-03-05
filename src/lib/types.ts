// =============================================================================
// Vitalis — Shared TypeScript Types
// =============================================================================

// ---------------------------------------------------------------------------
// Mood & Mental State
// ---------------------------------------------------------------------------

export type MoodState =
  | "depression_risk"
  | "low"
  | "euthymic"
  | "elevated"
  | "mania_risk";

export const MOOD_STATE_COLORS: Record<MoodState, string> = {
  depression_risk: "#1e40af", // Blue
  low: "#60a5fa", // Light blue
  euthymic: "#22c55e", // Green
  elevated: "#eab308", // Yellow
  mania_risk: "#ef4444", // Orange/Red
};

// ---------------------------------------------------------------------------
// Health Reading — matches MongoDB health_readings collection
// ---------------------------------------------------------------------------

export interface SleepStages {
  /** Minutes in light sleep */
  light: number;
  /** Minutes in deep/slow-wave sleep */
  deep: number;
  /** Minutes in REM sleep */
  rem: number;
  /** Minutes awake during sleep period */
  awake: number;
}

export interface HealthReading {
  _id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  source: "whoop" | "apple_health" | "manual";
  timestamp: Date;

  // Heart metrics
  hrv_rmssd?: number; // ms (WHOOP primary)
  hrv_sdnn?: number; // ms (Apple Health primary)
  resting_hr?: number; // bpm
  avg_hr?: number; // bpm (daytime average)

  // Respiratory & SpO2
  spo2?: number; // percentage
  respiratory_rate?: number; // breaths/min

  // Temperature
  skin_temp?: number; // Celsius
  skin_temp_deviation?: number; // deviation from baseline

  // Sleep
  sleep_duration?: number; // minutes
  sleep_efficiency?: number; // percentage (0-100)
  sleep_onset?: string; // ISO timestamp
  sleep_wake?: string; // ISO timestamp
  sleep_stages?: SleepStages;

  // Activity
  steps?: number;
  active_calories?: number;
  strain?: number; // WHOOP strain (0-21)

  // WHOOP-specific
  recovery_score?: number; // 0-100
  whoop_score_state?: "SCORED" | "PENDING_STRAIN" | "UNSCORABLE";

  // Metadata
  validated?: boolean;
  confidence?: number; // 0-1
  outlier_flags?: string[];
  created_at?: Date;
  updated_at?: Date;
}

// ---------------------------------------------------------------------------
// Daily Score — matches MongoDB daily_scores collection
// ---------------------------------------------------------------------------

export interface DailyScore {
  _id?: string;
  userId: string;
  date: string; // YYYY-MM-DD

  // Composite scores
  mood_score: number; // z-score composite
  mood_state: MoodState;
  body_battery: number; // 0-100
  sleep_gpa: number; // 0-4.0
  sleep_grade: string; // A-F

  // Z-scores (individual components)
  z_hrv: number;
  z_circadian: number;
  z_sleep_efficiency: number;
  z_sleep_duration_var: number;
  z_rhr: number;
  z_activity: number;

  // Patterns detected
  patterns: string[];

  // Confidence
  confidence: number;
  data_completeness: number;

  // Source readings used
  reading_ids: string[];

  created_at?: Date;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  passed: boolean;
  outliers: string[];
  confidence: number;
  completeness: number;
  flags: {
    field: string;
    reason: string;
    value: number;
    bound?: { min: number; max: number };
  }[];
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

export interface BaselineMetric {
  mean: number;
  std: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  count: number;
}

export interface Baseline {
  userId: string;
  windowDays: number;
  startDate: string;
  endDate: string;
  metrics: {
    hrv_rmssd?: BaselineMetric;
    hrv_sdnn?: BaselineMetric;
    resting_hr?: BaselineMetric;
    spo2?: BaselineMetric;
    respiratory_rate?: BaselineMetric;
    skin_temp?: BaselineMetric;
    sleep_duration?: BaselineMetric;
    sleep_efficiency?: BaselineMetric;
    steps?: BaselineMetric;
    active_calories?: BaselineMetric;
    strain?: BaselineMetric;
    recovery_score?: BaselineMetric;
  };
  sufficient: boolean; // true if >= 7 days of data
}

// ---------------------------------------------------------------------------
// Sleep Grade
// ---------------------------------------------------------------------------

export interface SleepGrade {
  duration: { value: number; grade: string; points: number };
  efficiency: { value: number; grade: string; points: number };
  deep: { value: number; grade: string; points: number };
  rem: { value: number; grade: string; points: number };
  consistency: { value: number; grade: string; points: number };
  overall: { gpa: number; grade: string };
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export type EvidenceLevel = "strong" | "moderate" | "emerging" | "traditional";

export interface SupplementSuggestion {
  name: string;
  dosage: string;
  timing: string;
  reason: string;
  evidence: EvidenceLevel;
  contraindications?: string[];
  interactions?: string[];
}

export interface Recommendation {
  _id?: string;
  userId: string;
  date: string;
  patterns: string[];
  moodState: MoodState;

  supplements: SupplementSuggestion[];
  dietTips: string[];
  lifestyleTips: string[];
  warnings: string[];

  created_at?: Date;
}

// ---------------------------------------------------------------------------
// WHOOP API Types
// ---------------------------------------------------------------------------

export interface WhoopTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  token_type: string;
  scope: string;
}

export interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: "SCORED" | "PENDING_STRAIN" | "UNSCORABLE";
  score: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

export interface WhoopSleep {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: "SCORED" | "PENDING_STRAIN" | "UNSCORABLE";
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number;
  };
}

export interface WhoopCycle {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string;
  timezone_offset: string;
  score_state: "SCORED" | "PENDING_STRAIN" | "UNSCORABLE";
  score: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

// ---------------------------------------------------------------------------
// Apple Health Parsed Types
// ---------------------------------------------------------------------------

export interface AppleHealthDayData {
  date: string;
  hrv_sdnn?: number[];
  resting_hr?: number[];
  spo2?: number[];
  respiratory_rate?: number[];
  sleep_analysis?: {
    startDate: string;
    endDate: string;
    value: string; // "HKCategoryValueSleepAnalysisAsleepDeep" etc.
  }[];
  steps?: number;
  active_calories?: number;
  wrist_temp?: number[];
}
