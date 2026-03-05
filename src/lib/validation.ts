// =============================================================================
// Vitalis — Data Validation Pipeline (3-Stage)
// =============================================================================

import type { HealthReading, ValidationResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Stage 1: Hard Bounds
// ---------------------------------------------------------------------------

/** Absolute physiological bounds — readings outside these are sensor errors. */
const HARD_BOUNDS: Record<string, { min: number; max: number }> = {
  resting_hr: { min: 30, max: 220 },
  avg_hr: { min: 30, max: 220 },
  hrv_rmssd: { min: 1, max: 400 },
  hrv_sdnn: { min: 1, max: 500 },
  spo2: { min: 70, max: 100 },
  respiratory_rate: { min: 4, max: 40 },
  skin_temp: { min: 30, max: 40 },
  sleep_duration: { min: 0, max: 960 }, // 16 hours max
  sleep_efficiency: { min: 0, max: 100 },
  recovery_score: { min: 0, max: 100 },
  strain: { min: 0, max: 21 },
  steps: { min: 0, max: 100000 },
  active_calories: { min: 0, max: 10000 },
};

/**
 * Stage 1: Check all numeric fields against absolute physiological bounds.
 * Returns list of fields that failed with their values and bounds.
 */
function checkHardBounds(
  reading: HealthReading
): ValidationResult["flags"] {
  const flags: ValidationResult["flags"] = [];

  for (const [field, bounds] of Object.entries(HARD_BOUNDS)) {
    const value = reading[field as keyof HealthReading] as number | undefined;
    if (value === undefined || value === null) continue;

    if (value < bounds.min || value > bounds.max) {
      flags.push({
        field,
        reason: "hard_bound_violation",
        value,
        bound: bounds,
      });
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Stage 2: IQR Outlier Detection (14-day rolling window)
// ---------------------------------------------------------------------------

/** IQR multiplier for biomarker data — 2.0x is more permissive than Tukey's 1.5x */
const IQR_MULTIPLIER = 2.0;

/** Fields to check for IQR outliers */
const IQR_FIELDS = [
  "hrv_rmssd",
  "hrv_sdnn",
  "resting_hr",
  "spo2",
  "respiratory_rate",
  "skin_temp",
  "sleep_duration",
  "sleep_efficiency",
  "recovery_score",
  "strain",
] as const;

/**
 * Calculate Q1, Q3, and IQR for a sorted array of numbers.
 */
function calculateQuartiles(sorted: number[]): {
  q1: number;
  q3: number;
  iqr: number;
} {
  const n = sorted.length;
  if (n < 4) return { q1: sorted[0], q3: sorted[n - 1], iqr: 0 };

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return { q1, q3, iqr };
}

/**
 * Stage 2: IQR-based outlier detection using a 14-day rolling window.
 * Compares the current reading against historical values.
 */
function checkIQROutliers(
  reading: HealthReading,
  history: HealthReading[]
): ValidationResult["flags"] {
  const flags: ValidationResult["flags"] = [];

  // Need at least 7 days of history for meaningful IQR
  if (history.length < 7) return flags;

  for (const field of IQR_FIELDS) {
    const currentValue = reading[field] as number | undefined;
    if (currentValue === undefined || currentValue === null) continue;

    // Collect historical values for this field
    const historicalValues = history
      .map((r) => r[field] as number | undefined)
      .filter((v): v is number => v !== undefined && v !== null)
      .sort((a, b) => a - b);

    if (historicalValues.length < 5) continue;

    const { q1, q3, iqr } = calculateQuartiles(historicalValues);
    const lowerFence = q1 - IQR_MULTIPLIER * iqr;
    const upperFence = q3 + IQR_MULTIPLIER * iqr;

    if (currentValue < lowerFence || currentValue > upperFence) {
      flags.push({
        field,
        reason: "iqr_outlier",
        value: currentValue,
        bound: { min: lowerFence, max: upperFence },
      });
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Stage 3: Consistency Checks
// ---------------------------------------------------------------------------

/**
 * Stage 3: Domain-specific consistency checks.
 * - WHOOP score_state must be "SCORED" for the data to be trusted
 * - Sleep under 2 hours is excluded (likely a nap or sensor error)
 * - HR data gaps > 4 hours indicate incomplete day
 */
function checkConsistency(
  reading: HealthReading
): { flags: ValidationResult["flags"]; incomplete: boolean } {
  const flags: ValidationResult["flags"] = [];
  let incomplete = false;

  // WHOOP score_state check
  if (
    reading.source === "whoop" &&
    reading.whoop_score_state &&
    reading.whoop_score_state !== "SCORED"
  ) {
    flags.push({
      field: "whoop_score_state",
      reason: "unscored_whoop_data",
      value: 0,
    });
    incomplete = true;
  }

  // Sleep duration too short (likely a nap, not real sleep)
  if (
    reading.sleep_duration !== undefined &&
    reading.sleep_duration > 0 &&
    reading.sleep_duration < 120
  ) {
    flags.push({
      field: "sleep_duration",
      reason: "sleep_too_short",
      value: reading.sleep_duration,
      bound: { min: 120, max: 960 },
    });
  }

  // Check for significant HR data gaps (inferred from missing avg_hr on a day with other data)
  if (
    reading.resting_hr !== undefined &&
    reading.avg_hr === undefined &&
    reading.strain !== undefined
  ) {
    flags.push({
      field: "avg_hr",
      reason: "hr_data_gap",
      value: 0,
    });
    incomplete = true;
  }

  // Sleep stages should sum approximately to sleep_duration
  if (reading.sleep_stages && reading.sleep_duration) {
    const stageSum =
      reading.sleep_stages.light +
      reading.sleep_stages.deep +
      reading.sleep_stages.rem +
      reading.sleep_stages.awake;

    // Allow 10% tolerance
    if (Math.abs(stageSum - reading.sleep_duration) > reading.sleep_duration * 0.1) {
      flags.push({
        field: "sleep_stages",
        reason: "stage_sum_mismatch",
        value: stageSum,
        bound: {
          min: reading.sleep_duration * 0.9,
          max: reading.sleep_duration * 1.1,
        },
      });
    }
  }

  return { flags, incomplete };
}

// ---------------------------------------------------------------------------
// Completeness & Confidence
// ---------------------------------------------------------------------------

/** Key fields that contribute to data completeness */
const COMPLETENESS_FIELDS = [
  "hrv_rmssd",
  "hrv_sdnn",
  "resting_hr",
  "spo2",
  "respiratory_rate",
  "sleep_duration",
  "sleep_efficiency",
  "sleep_stages",
  "steps",
  "active_calories",
  "recovery_score",
] as const;

/**
 * Calculate data completeness as a ratio of present fields to total expected fields.
 */
function calculateCompleteness(reading: HealthReading): number {
  let present = 0;

  for (const field of COMPLETENESS_FIELDS) {
    const value = reading[field as keyof HealthReading];
    if (value !== undefined && value !== null) {
      present++;
    }
  }

  return present / COMPLETENESS_FIELDS.length;
}

/**
 * Calculate confidence score:
 *   (completeness * 0.4) + (baseline_days/14 * 0.3) + (outlier_free * 0.3)
 */
function calculateConfidence(
  completeness: number,
  historyLength: number,
  outlierCount: number
): number {
  const baselineFactor = Math.min(historyLength / 14, 1.0);
  const outlierFree = outlierCount === 0 ? 1.0 : 0.0;

  return completeness * 0.4 + baselineFactor * 0.3 + outlierFree * 0.3;
}

// ---------------------------------------------------------------------------
// Main Validation Function
// ---------------------------------------------------------------------------

/**
 * Run the full 3-stage validation pipeline on a health reading.
 *
 * @param reading  - The current reading to validate
 * @param history  - Previous 14 days of readings (for IQR and baseline)
 * @returns        - Validation result with pass/fail, outliers, confidence, and completeness
 */
export function validateReading(
  reading: HealthReading,
  history: HealthReading[]
): ValidationResult {
  // Filter history to 14-day window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const recentHistory = history.filter(
    (r) => new Date(r.date) >= cutoff && r.date !== reading.date
  );

  // Stage 1: Hard bounds
  const hardBoundFlags = checkHardBounds(reading);

  // Stage 2: IQR outliers
  const iqrFlags = checkIQROutliers(reading, recentHistory);

  // Stage 3: Consistency
  const { flags: consistencyFlags, incomplete } = checkConsistency(reading);

  // Combine all flags
  const allFlags = [...hardBoundFlags, ...iqrFlags, ...consistencyFlags];
  const outliers = allFlags.map(
    (f) => `${f.field}: ${f.reason} (value=${f.value})`
  );

  // Completeness
  const completeness = calculateCompleteness(reading);

  // Confidence score
  const outlierCount = hardBoundFlags.length + iqrFlags.length;
  const confidence = calculateConfidence(
    completeness,
    recentHistory.length,
    outlierCount
  );

  // Passed = no hard bound violations, not incomplete
  const passed = hardBoundFlags.length === 0 && !incomplete;

  return {
    passed,
    outliers,
    confidence: Math.round(confidence * 100) / 100,
    completeness: Math.round(completeness * 100) / 100,
    flags: allFlags,
  };
}
