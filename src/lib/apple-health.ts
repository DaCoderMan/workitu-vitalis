// =============================================================================
// Vitalis — Apple Health XML Parser
// =============================================================================
//
// Parses Apple Health Export.xml files into normalized HealthReading format.
// Uses string-based extraction (regex) instead of full DOM parsing to handle
// large files efficiently (Export.xml can be 1GB+).
//
// =============================================================================

import type { HealthReading, AppleHealthDayData, SleepStages } from "@/lib/types";

// ---------------------------------------------------------------------------
// Apple Health Record Type Identifiers
// ---------------------------------------------------------------------------

const RECORD_TYPES = {
  HRV_SDNN: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  RESTING_HR: "HKQuantityTypeIdentifierRestingHeartRate",
  SPO2: "HKQuantityTypeIdentifierOxygenSaturation",
  RESPIRATORY_RATE: "HKQuantityTypeIdentifierRespiratoryRate",
  STEPS: "HKQuantityTypeIdentifierStepCount",
  ACTIVE_CALORIES: "HKQuantityTypeIdentifierActiveEnergyBurned",
  WRIST_TEMP: "HKQuantityTypeIdentifierAppleWalkingSteadiness",
  BODY_TEMP: "HKQuantityTypeIdentifierBodyTemperature",
  SLEEP_ANALYSIS: "HKCategoryTypeIdentifierSleepAnalysis",
} as const;

// ---------------------------------------------------------------------------
// Regex-based Record Extraction
// ---------------------------------------------------------------------------

interface RawRecord {
  type: string;
  value: string;
  unit: string;
  startDate: string;
  endDate: string;
  sourceName: string;
}

/**
 * Extract individual <Record> elements from the XML string using regex.
 * This avoids loading the entire DOM tree into memory.
 */
function extractRecords(xml: string, typeFilter?: string): RawRecord[] {
  const records: RawRecord[] = [];

  // Match self-closing <Record .../> and <Record ...>...</Record> elements
  const recordRegex = /<Record\s+([^>]*?)\/?>(?:<\/Record>)?/g;
  let match: RegExpExecArray | null;

  while ((match = recordRegex.exec(xml)) !== null) {
    const attrs = match[1];

    const type = extractAttr(attrs, "type");
    if (!type) continue;
    if (typeFilter && type !== typeFilter) continue;

    records.push({
      type,
      value: extractAttr(attrs, "value") ?? "",
      unit: extractAttr(attrs, "unit") ?? "",
      startDate: extractAttr(attrs, "startDate") ?? "",
      endDate: extractAttr(attrs, "endDate") ?? "",
      sourceName: extractAttr(attrs, "sourceName") ?? "",
    });
  }

  return records;
}

/**
 * Extract an XML attribute value by name from an attribute string.
 */
function extractAttr(attrs: string, name: string): string | undefined {
  const regex = new RegExp(`${name}="([^"]*)"`, "i");
  const match = regex.exec(attrs);
  return match?.[1];
}

/**
 * Extract the date portion (YYYY-MM-DD) from an Apple Health date string.
 * Apple Health dates look like: "2024-03-15 22:30:00 +0300"
 */
function extractDate(dateStr: string): string {
  return dateStr.substring(0, 10);
}

// ---------------------------------------------------------------------------
// Group Records by Date
// ---------------------------------------------------------------------------

/**
 * Group extracted records into per-day buckets.
 */
function groupByDate(records: RawRecord[]): Map<string, RawRecord[]> {
  const groups = new Map<string, RawRecord[]>();

  for (const record of records) {
    const date = extractDate(record.startDate);
    if (!date || date.length !== 10) continue;

    const existing = groups.get(date);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(date, [record]);
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Value Aggregation Helpers
// ---------------------------------------------------------------------------

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// Sleep Analysis Parsing
// ---------------------------------------------------------------------------

/**
 * Apple Health sleep value types:
 * - HKCategoryValueSleepAnalysisInBed
 * - HKCategoryValueSleepAnalysisAsleepUnspecified
 * - HKCategoryValueSleepAnalysisAsleepCore (light)
 * - HKCategoryValueSleepAnalysisAsleepDeep
 * - HKCategoryValueSleepAnalysisAsleepREM
 * - HKCategoryValueSleepAnalysisAwake
 */
function parseSleepRecords(records: RawRecord[]): {
  duration: number;
  efficiency: number;
  stages: SleepStages;
  onset: string | undefined;
  wake: string | undefined;
} | null {
  if (records.length === 0) return null;

  let lightMs = 0;
  let deepMs = 0;
  let remMs = 0;
  let awakeMs = 0;
  let inBedMs = 0;
  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;

  for (const record of records) {
    const start = new Date(record.startDate);
    const end = new Date(record.endDate);
    const durationMs = end.getTime() - start.getTime();

    if (durationMs <= 0) continue;

    if (!earliestStart || start < earliestStart) earliestStart = start;
    if (!latestEnd || end > latestEnd) latestEnd = end;

    const value = record.value;

    if (value.includes("InBed")) {
      inBedMs += durationMs;
    } else if (value.includes("AsleepCore") || value.includes("AsleepUnspecified")) {
      lightMs += durationMs;
    } else if (value.includes("AsleepDeep")) {
      deepMs += durationMs;
    } else if (value.includes("AsleepREM") || value.includes("REM")) {
      remMs += durationMs;
    } else if (value.includes("Awake")) {
      awakeMs += durationMs;
    }
  }

  const totalSleepMs = lightMs + deepMs + remMs;
  const totalSleepMin = Math.round(totalSleepMs / 60000);

  if (totalSleepMin === 0) return null;

  // Use InBed time if available, otherwise total sleep + awake
  const totalInBedMs = inBedMs > 0 ? inBedMs : totalSleepMs + awakeMs;
  const efficiency = totalInBedMs > 0 ? (totalSleepMs / totalInBedMs) * 100 : 0;

  return {
    duration: totalSleepMin,
    efficiency: Math.round(efficiency * 10) / 10,
    stages: {
      light: Math.round(lightMs / 60000),
      deep: Math.round(deepMs / 60000),
      rem: Math.round(remMs / 60000),
      awake: Math.round(awakeMs / 60000),
    },
    onset: earliestStart?.toISOString(),
    wake: latestEnd?.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main Parser
// ---------------------------------------------------------------------------

/**
 * Parse an Apple Health Export.xml string into an array of normalized HealthReadings.
 *
 * This function uses regex-based extraction instead of DOM parsing to handle
 * large files (Apple Health exports can be 500MB-1GB+).
 *
 * @param xmlString - The raw XML content of Export.xml
 * @param userId    - User ID to attach to the readings (default: "apple-health-import")
 * @returns         - Array of HealthReadings, one per day
 */
export function parseAppleHealthExport(
  xmlString: string,
  userId: string = "apple-health-import"
): HealthReading[] {
  // Extract all records at once
  const allRecords = extractRecords(xmlString);

  // Separate by type and group by date
  const hrvRecords = new Map<string, number[]>();
  const rhrRecords = new Map<string, number[]>();
  const spo2Records = new Map<string, number[]>();
  const rrRecords = new Map<string, number[]>();
  const stepsRecords = new Map<string, number[]>();
  const calorieRecords = new Map<string, number[]>();
  const tempRecords = new Map<string, number[]>();
  const sleepRecords = new Map<string, RawRecord[]>();

  for (const record of allRecords) {
    const date = extractDate(record.startDate);
    if (!date || date.length !== 10) continue;

    const numValue = parseFloat(record.value);

    switch (record.type) {
      case RECORD_TYPES.HRV_SDNN:
        pushToMap(hrvRecords, date, numValue);
        break;
      case RECORD_TYPES.RESTING_HR:
        pushToMap(rhrRecords, date, numValue);
        break;
      case RECORD_TYPES.SPO2:
        // Apple Health stores SpO2 as a decimal (0.0-1.0)
        pushToMap(spo2Records, date, numValue <= 1 ? numValue * 100 : numValue);
        break;
      case RECORD_TYPES.RESPIRATORY_RATE:
        pushToMap(rrRecords, date, numValue);
        break;
      case RECORD_TYPES.STEPS:
        pushToMap(stepsRecords, date, numValue);
        break;
      case RECORD_TYPES.ACTIVE_CALORIES:
        pushToMap(calorieRecords, date, numValue);
        break;
      case RECORD_TYPES.BODY_TEMP:
        pushToMap(tempRecords, date, numValue);
        break;
      case RECORD_TYPES.SLEEP_ANALYSIS: {
        const existing = sleepRecords.get(date);
        if (existing) {
          existing.push(record);
        } else {
          sleepRecords.set(date, [record]);
        }
        break;
      }
    }
  }

  // Collect all unique dates
  const allDates = new Set<string>();
  for (const map of [hrvRecords, rhrRecords, spo2Records, rrRecords, stepsRecords, calorieRecords, tempRecords, sleepRecords]) {
    for (const date of map.keys()) {
      allDates.add(date);
    }
  }

  // Build HealthReadings per date
  const readings: HealthReading[] = [];

  for (const date of Array.from(allDates).sort()) {
    const reading: HealthReading = {
      userId,
      date,
      source: "apple_health",
      timestamp: new Date(date),
    };

    // HRV (SDNN) — average of daily readings
    const hrvValues = hrvRecords.get(date);
    if (hrvValues && hrvValues.length > 0) {
      reading.hrv_sdnn = Math.round(average(hrvValues) * 10) / 10;
    }

    // Resting HR — take the minimum of daily readings (most accurate)
    const rhrValues = rhrRecords.get(date);
    if (rhrValues && rhrValues.length > 0) {
      reading.resting_hr = Math.round(Math.min(...rhrValues));
    }

    // SpO2 — average
    const spo2Values = spo2Records.get(date);
    if (spo2Values && spo2Values.length > 0) {
      reading.spo2 = Math.round(average(spo2Values) * 10) / 10;
    }

    // Respiratory rate — average
    const rrValues = rrRecords.get(date);
    if (rrValues && rrValues.length > 0) {
      reading.respiratory_rate = Math.round(average(rrValues) * 10) / 10;
    }

    // Steps — sum of all sources for the day
    const stepsValues = stepsRecords.get(date);
    if (stepsValues && stepsValues.length > 0) {
      reading.steps = Math.round(sum(stepsValues));
    }

    // Active calories — sum
    const calorieValues = calorieRecords.get(date);
    if (calorieValues && calorieValues.length > 0) {
      reading.active_calories = Math.round(sum(calorieValues));
    }

    // Wrist/body temperature
    const tempValues = tempRecords.get(date);
    if (tempValues && tempValues.length > 0) {
      reading.skin_temp = Math.round(average(tempValues) * 10) / 10;
    }

    // Sleep analysis
    const sleepRecs = sleepRecords.get(date);
    if (sleepRecs && sleepRecs.length > 0) {
      const sleep = parseSleepRecords(sleepRecs);
      if (sleep) {
        reading.sleep_duration = sleep.duration;
        reading.sleep_efficiency = sleep.efficiency;
        reading.sleep_stages = sleep.stages;
        reading.sleep_onset = sleep.onset;
        reading.sleep_wake = sleep.wake;
      }
    }

    readings.push(reading);
  }

  return readings;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function pushToMap(map: Map<string, number[]>, key: string, value: number): void {
  if (isNaN(value)) return;
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}
