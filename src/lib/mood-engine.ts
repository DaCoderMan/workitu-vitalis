// =============================================================================
// Vitalis — Mood Analysis Engine
// =============================================================================

import type {
  HealthReading,
  DailyScore,
  Baseline,
  BaselineMetric,
  MoodState,
  SleepGrade,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Z-Score Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate a standard z-score: (value - mean) / std.
 * Returns 0 if std is 0 or undefined (no variance).
 */
export function calculateZScore(
  value: number,
  mean: number,
  std: number
): number {
  if (!std || std === 0) return 0;
  return (value - mean) / std;
}

// ---------------------------------------------------------------------------
// Baseline Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate a BaselineMetric (mean, std, median, quartiles) for an array of values.
 */
function computeMetric(values: number[]): BaselineMetric {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  return { mean, std, median, q1, q3, iqr, count: n };
}

/** Metric keys we track baselines for */
const BASELINE_KEYS = [
  "hrv_rmssd",
  "hrv_sdnn",
  "resting_hr",
  "spo2",
  "respiratory_rate",
  "skin_temp",
  "sleep_duration",
  "sleep_efficiency",
  "steps",
  "active_calories",
  "strain",
  "recovery_score",
] as const;

type BaselineKey = (typeof BASELINE_KEYS)[number];

/**
 * Calculate a rolling baseline from an array of HealthReadings.
 * Uses the most recent `days` readings (default 14).
 */
export function calculateBaseline(
  readings: HealthReading[],
  days: number = 14
): Baseline {
  // Sort by date descending and take the most recent `days`
  const sorted = [...readings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const window = sorted.slice(0, days);

  const metrics: Baseline["metrics"] = {};

  for (const key of BASELINE_KEYS) {
    const values = window
      .map((r) => r[key] as number | undefined)
      .filter((v): v is number => v !== undefined && v !== null);

    if (values.length >= 3) {
      metrics[key] = computeMetric(values);
    }
  }

  const startDate = window[window.length - 1]?.date ?? "";
  const endDate = window[0]?.date ?? "";

  return {
    userId: readings[0]?.userId ?? "",
    windowDays: days,
    startDate,
    endDate,
    metrics,
    sufficient: window.length >= 7,
  };
}

// ---------------------------------------------------------------------------
// Circadian Phase Score
// ---------------------------------------------------------------------------

/**
 * Calculate a circadian alignment z-score based on sleep onset time.
 * Optimal window: 22:00-23:30. Score degrades outside this window.
 * Returns a value where positive = good alignment.
 */
function calculateCircadianZ(
  reading: HealthReading,
  baseline: Baseline
): number {
  if (!reading.sleep_onset) return 0;

  const onset = new Date(reading.sleep_onset);
  const hours = onset.getHours() + onset.getMinutes() / 60;

  // Normalize hour to "hours from midnight" (handle past-midnight onset)
  const adjustedHour = hours < 12 ? hours + 24 : hours;

  // Optimal target: 22.5 (10:30 PM)
  const optimalOnset = 22.5;
  const deviation = Math.abs(adjustedHour - optimalOnset);

  // Convert deviation to z-score-like value (0 deviation = +1, 3h deviation = -1)
  return Math.max(-2, 1 - deviation / 1.5);
}

// ---------------------------------------------------------------------------
// Sleep Duration Variability
// ---------------------------------------------------------------------------

/**
 * Calculate sleep duration variability z-score.
 * Low variability (consistent sleep) = positive score.
 */
function calculateSleepDurationVarZ(
  reading: HealthReading,
  baseline: Baseline
): number {
  const metric = baseline.metrics.sleep_duration;
  if (!metric || !reading.sleep_duration) return 0;

  // Deviation from personal mean
  const deviation = Math.abs(reading.sleep_duration - metric.mean);

  // Normalize: <30min deviation is great, >120min is poor
  return Math.max(-2, 1 - deviation / 60);
}

// ---------------------------------------------------------------------------
// Composite Mood Score
// ---------------------------------------------------------------------------

/**
 * Calculate composite mood score using weighted z-scores:
 *
 *   MoodScore = (0.25 * HRV_z) + (0.25 * CircadianPhase_z)
 *             + (0.15 * SleepEfficiency_z) + (0.15 * SleepDurationVar_z)
 *             + (0.10 * RHR_z) + (0.10 * Activity_z)
 *
 * Note: RHR is inverted (lower is better, so we negate the z-score).
 */
export function calculateMoodScore(
  reading: HealthReading,
  baseline: Baseline
): {
  score: number;
  components: {
    z_hrv: number;
    z_circadian: number;
    z_sleep_efficiency: number;
    z_sleep_duration_var: number;
    z_rhr: number;
    z_activity: number;
  };
} {
  const hrvMetric = baseline.metrics.hrv_rmssd ?? baseline.metrics.hrv_sdnn;
  const hrvValue = reading.hrv_rmssd ?? reading.hrv_sdnn ?? 0;
  const z_hrv = hrvMetric ? calculateZScore(hrvValue, hrvMetric.mean, hrvMetric.std) : 0;

  const z_circadian = calculateCircadianZ(reading, baseline);

  const sleepEffMetric = baseline.metrics.sleep_efficiency;
  const z_sleep_efficiency =
    sleepEffMetric && reading.sleep_efficiency !== undefined
      ? calculateZScore(reading.sleep_efficiency, sleepEffMetric.mean, sleepEffMetric.std)
      : 0;

  const z_sleep_duration_var = calculateSleepDurationVarZ(reading, baseline);

  // RHR: lower is better, so invert the z-score
  const rhrMetric = baseline.metrics.resting_hr;
  const z_rhr =
    rhrMetric && reading.resting_hr !== undefined
      ? -calculateZScore(reading.resting_hr, rhrMetric.mean, rhrMetric.std)
      : 0;

  // Activity: use strain if available, otherwise steps
  const activityMetric = baseline.metrics.strain ?? baseline.metrics.steps;
  const activityValue = reading.strain ?? reading.steps ?? 0;
  const z_activity = activityMetric
    ? calculateZScore(activityValue, activityMetric.mean, activityMetric.std)
    : 0;

  const score =
    0.25 * z_hrv +
    0.25 * z_circadian +
    0.15 * z_sleep_efficiency +
    0.15 * z_sleep_duration_var +
    0.10 * z_rhr +
    0.10 * z_activity;

  return {
    score: Math.round(score * 100) / 100,
    components: {
      z_hrv: Math.round(z_hrv * 100) / 100,
      z_circadian: Math.round(z_circadian * 100) / 100,
      z_sleep_efficiency: Math.round(z_sleep_efficiency * 100) / 100,
      z_sleep_duration_var: Math.round(z_sleep_duration_var * 100) / 100,
      z_rhr: Math.round(z_rhr * 100) / 100,
      z_activity: Math.round(z_activity * 100) / 100,
    },
  };
}

// ---------------------------------------------------------------------------
// Mood State Classification
// ---------------------------------------------------------------------------

/**
 * Classify mood state based on composite score thresholds:
 *
 *   < -1.5   : "depression_risk"  (Blue)
 *   -1.5...-0.5: "low"            (Light blue)
 *   -0.5...0.5 : "euthymic"       (Green)
 *   0.5...1.5  : "elevated"       (Yellow)
 *   > 1.5    : "mania_risk"       (Orange/Red)
 */
export function classifyMoodState(score: number): MoodState {
  if (score < -1.5) return "depression_risk";
  if (score < -0.5) return "low";
  if (score <= 0.5) return "euthymic";
  if (score <= 1.5) return "elevated";
  return "mania_risk";
}

// ---------------------------------------------------------------------------
// Body Battery (0-100)
// ---------------------------------------------------------------------------

/**
 * Calculate a "Body Battery" score from 0-100 based on recovery, sleep, and stress.
 *
 * Formula:
 *   battery = (recovery_component * 0.4) + (sleep_component * 0.35) + (stress_component * 0.25)
 *
 * Each component is normalized to 0-100.
 */
export function calculateBodyBattery(
  reading: HealthReading,
  baseline: Baseline
): number {
  // Recovery component (0-100): WHOOP recovery score or HRV-based estimate
  let recoveryComponent = 50; // default neutral
  if (reading.recovery_score !== undefined) {
    recoveryComponent = reading.recovery_score;
  } else if (reading.hrv_rmssd !== undefined && baseline.metrics.hrv_rmssd) {
    const z = calculateZScore(
      reading.hrv_rmssd,
      baseline.metrics.hrv_rmssd.mean,
      baseline.metrics.hrv_rmssd.std
    );
    // Map z-score (-2..+2) to 0-100
    recoveryComponent = Math.max(0, Math.min(100, 50 + z * 25));
  }

  // Sleep component (0-100): combine efficiency and duration adequacy
  let sleepComponent = 50;
  if (reading.sleep_efficiency !== undefined && reading.sleep_duration !== undefined) {
    const efficiencyScore = reading.sleep_efficiency; // already 0-100
    const durationAdequacy = Math.min(100, (reading.sleep_duration / 480) * 100); // 8h = 100%
    sleepComponent = efficiencyScore * 0.6 + durationAdequacy * 0.4;
  } else if (reading.sleep_efficiency !== undefined) {
    sleepComponent = reading.sleep_efficiency;
  }

  // Stress component (0-100): lower RHR relative to baseline = less stress = higher battery
  let stressComponent = 50;
  if (reading.resting_hr !== undefined && baseline.metrics.resting_hr) {
    const z = calculateZScore(
      reading.resting_hr,
      baseline.metrics.resting_hr.mean,
      baseline.metrics.resting_hr.std
    );
    // Invert: lower RHR = higher battery
    stressComponent = Math.max(0, Math.min(100, 50 - z * 25));
  }

  const battery =
    recoveryComponent * 0.4 + sleepComponent * 0.35 + stressComponent * 0.25;

  return Math.round(Math.max(0, Math.min(100, battery)));
}

// ---------------------------------------------------------------------------
// Sleep GPA
// ---------------------------------------------------------------------------

/** Grade thresholds (returns letter grade and GPA points) */
function grade(value: number, thresholds: [number, number, number, number]): {
  grade: string;
  points: number;
} {
  const [a, b, c, d] = thresholds;
  if (value >= a) return { grade: "A", points: 4.0 };
  if (value >= b) return { grade: "B", points: 3.0 };
  if (value >= c) return { grade: "C", points: 2.0 };
  if (value >= d) return { grade: "D", points: 1.0 };
  return { grade: "F", points: 0.0 };
}

/**
 * Calculate a Sleep GPA by grading individual sleep components A-F.
 *
 * Components:
 * - Duration: A >= 450min, B >= 390, C >= 330, D >= 270
 * - Efficiency: A >= 90%, B >= 80%, C >= 70%, D >= 60%
 * - Deep sleep: A >= 20% of total, B >= 15%, C >= 10%, D >= 5%
 * - REM sleep: A >= 22% of total, B >= 17%, C >= 12%, D >= 7%
 * - Consistency (placeholder): based on deviation from baseline
 */
export function calculateSleepGPA(
  sleepStages: HealthReading["sleep_stages"],
  duration: number,
  efficiency: number,
  baselineDuration?: number
): SleepGrade {
  // Duration grade
  const durationGrade = grade(duration, [450, 390, 330, 270]);

  // Efficiency grade
  const efficiencyGrade = grade(efficiency, [90, 80, 70, 60]);

  // Deep sleep percentage grade
  let deepPct = 0;
  if (sleepStages && duration > 0) {
    deepPct = (sleepStages.deep / duration) * 100;
  }
  const deepGrade = grade(deepPct, [20, 15, 10, 5]);

  // REM sleep percentage grade
  let remPct = 0;
  if (sleepStages && duration > 0) {
    remPct = (sleepStages.rem / duration) * 100;
  }
  const remGrade = grade(remPct, [22, 17, 12, 7]);

  // Consistency grade: deviation from baseline mean
  let consistencyScore = 50;
  if (baselineDuration && baselineDuration > 0) {
    const deviation = Math.abs(duration - baselineDuration);
    consistencyScore = Math.max(0, 100 - (deviation / baselineDuration) * 100);
  }
  const consistencyGrade = grade(consistencyScore, [90, 75, 60, 40]);

  // Overall GPA (weighted average)
  const weights = {
    duration: 0.25,
    efficiency: 0.25,
    deep: 0.2,
    rem: 0.2,
    consistency: 0.1,
  };

  const gpa =
    durationGrade.points * weights.duration +
    efficiencyGrade.points * weights.efficiency +
    deepGrade.points * weights.deep +
    remGrade.points * weights.rem +
    consistencyGrade.points * weights.consistency;

  const roundedGpa = Math.round(gpa * 100) / 100;

  // Overall letter grade from GPA
  let overallGrade = "F";
  if (roundedGpa >= 3.5) overallGrade = "A";
  else if (roundedGpa >= 2.5) overallGrade = "B";
  else if (roundedGpa >= 1.5) overallGrade = "C";
  else if (roundedGpa >= 0.5) overallGrade = "D";

  return {
    duration: { value: duration, ...durationGrade },
    efficiency: { value: efficiency, ...efficiencyGrade },
    deep: { value: deepPct, ...deepGrade },
    rem: { value: remPct, ...remGrade },
    consistency: { value: consistencyScore, ...consistencyGrade },
    overall: { gpa: roundedGpa, grade: overallGrade },
  };
}

// ---------------------------------------------------------------------------
// Pattern Detection
// ---------------------------------------------------------------------------

/** Detectable patterns with their conditions */
interface PatternRule {
  id: string;
  label: string;
  detect: (scores: DailyScore[]) => boolean;
}

const PATTERN_RULES: PatternRule[] = [
  {
    id: "low_hrv",
    label: "Consistently low HRV",
    detect: (scores) => {
      const recent = scores.slice(-3);
      return recent.length >= 3 && recent.every((s) => s.z_hrv < -0.5);
    },
  },
  {
    id: "circadian_delay",
    label: "Circadian rhythm delayed",
    detect: (scores) => {
      const recent = scores.slice(-3);
      return recent.length >= 3 && recent.every((s) => s.z_circadian < -0.5);
    },
  },
  {
    id: "poor_sleep",
    label: "Poor sleep quality",
    detect: (scores) => {
      const recent = scores.slice(-3);
      return (
        recent.length >= 3 &&
        recent.every((s) => s.z_sleep_efficiency < -0.5)
      );
    },
  },
  {
    id: "elevated_rhr",
    label: "Elevated resting heart rate",
    detect: (scores) => {
      const recent = scores.slice(-3);
      // z_rhr is already inverted (negative = elevated RHR)
      return recent.length >= 3 && recent.every((s) => s.z_rhr < -0.5);
    },
  },
  {
    id: "low_activity",
    label: "Below-average physical activity",
    detect: (scores) => {
      const recent = scores.slice(-5);
      return (
        recent.length >= 5 && recent.every((s) => s.z_activity < -0.5)
      );
    },
  },
  {
    id: "high_strain",
    label: "Consistently high strain without recovery",
    detect: (scores) => {
      const recent = scores.slice(-3);
      return (
        recent.length >= 3 &&
        recent.every((s) => s.z_activity > 1.0 && s.z_hrv < 0)
      );
    },
  },
  {
    id: "sleep_debt",
    label: "Accumulating sleep debt",
    detect: (scores) => {
      const recent = scores.slice(-5);
      return (
        recent.length >= 5 &&
        recent.every((s) => s.z_sleep_duration_var < -0.3)
      );
    },
  },
  {
    id: "declining_mood",
    label: "Declining mood trend",
    detect: (scores) => {
      if (scores.length < 5) return false;
      const recent = scores.slice(-5);
      // Check if each score is lower than the previous
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].mood_score >= recent[i - 1].mood_score) return false;
      }
      return true;
    },
  },
];

/**
 * Detect patterns from a series of daily scores.
 * Looks at the most recent `days` scores (default 7).
 */
export function detectPatterns(
  scores: DailyScore[],
  days: number = 7
): string[] {
  // Sort by date ascending and take the most recent window
  const sorted = [...scores].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const window = sorted.slice(-days);

  if (window.length < 3) return [];

  return PATTERN_RULES.filter((rule) => rule.detect(window)).map(
    (rule) => rule.id
  );
}
