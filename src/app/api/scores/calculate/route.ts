// =============================================================================
// Calculate Daily Score — Compute mood/health score for a given date
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";
import {
  calculateBaseline,
  calculateMoodScore,
  classifyMoodState,
  calculateBodyBattery,
  calculateSleepGPA,
  detectPatterns,
} from "@/lib/mood-engine";
import type { HealthReading, DailyScore } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Use provided date or default to today
    const targetDate =
      body.date || new Date().toISOString().split("T")[0];

    const client = await clientPromise;
    const db = client.db();

    // Fetch readings for the target date
    const todayReadings = (await db
      .collection("health_readings")
      .find({
        userId,
        date: targetDate,
        validated: true,
      })
      .toArray()) as unknown as HealthReading[];

    if (todayReadings.length === 0) {
      return NextResponse.json(
        { error: "No validated readings found for this date" },
        { status: 404 }
      );
    }

    // Fetch 14-day history for baseline calculation
    const baselineStart = new Date(targetDate);
    baselineStart.setDate(baselineStart.getDate() - 14);
    const baselineStartStr = baselineStart.toISOString().split("T")[0];

    const historyReadings = (await db
      .collection("health_readings")
      .find({
        userId,
        date: { $gte: baselineStartStr, $lt: targetDate },
        validated: true,
      })
      .sort({ date: -1 })
      .toArray()) as unknown as HealthReading[];

    // Compute personal baseline from historical data
    const baseline = calculateBaseline(historyReadings);

    // Use the primary reading (prefer WHOOP, fallback to apple_health)
    const primaryReading =
      todayReadings.find((r) => r.source === "whoop") || todayReadings[0];

    // Compute mood score (includes z-scores)
    const moodResult = calculateMoodScore(primaryReading, baseline);

    // Classify mood state from composite score
    const moodState = classifyMoodState(moodResult.score);

    // Calculate body battery
    const bodyBattery = calculateBodyBattery(primaryReading, baseline);

    // Calculate sleep GPA
    const sleepGrade = calculateSleepGPA(
      primaryReading.sleep_stages,
      primaryReading.sleep_duration ?? 0,
      primaryReading.sleep_efficiency ?? 0,
      baseline.metrics.sleep_duration?.mean
    );

    // Detect patterns from historical daily scores
    const historicalScores = (await db
      .collection("daily_scores")
      .find({ userId })
      .sort({ date: -1 })
      .limit(7)
      .toArray()) as unknown as DailyScore[];
    const patterns = detectPatterns(historicalScores);

    // Calculate data completeness
    const expectedFields = [
      "hrv_rmssd",
      "hrv_sdnn",
      "resting_hr",
      "sleep_duration",
      "sleep_efficiency",
      "steps",
      "spo2",
    ];
    const presentFields = expectedFields.filter(
      (f) => primaryReading[f as keyof HealthReading] !== undefined
    );
    const dataCompleteness = presentFields.length / expectedFields.length;

    const zScores = moodResult.components;

    // Build the daily score
    const dailyScore: DailyScore = {
      userId,
      date: targetDate,
      mood_score: moodResult.score,
      mood_state: moodState,
      body_battery: bodyBattery,
      sleep_gpa: sleepGrade.overall.gpa,
      sleep_grade: sleepGrade.overall.grade,
      z_hrv: zScores.z_hrv,
      z_circadian: zScores.z_circadian,
      z_sleep_efficiency: zScores.z_sleep_efficiency,
      z_sleep_duration_var: zScores.z_sleep_duration_var,
      z_rhr: zScores.z_rhr,
      z_activity: zScores.z_activity,
      patterns,
      confidence: baseline.sufficient ? 0.85 : 0.5,
      data_completeness: dataCompleteness,
      reading_ids: todayReadings
        .map((r) => r._id)
        .filter(Boolean) as string[],
      created_at: new Date(),
    };

    // Store in daily_scores collection (upsert by userId + date)
    await db.collection("daily_scores").updateOne(
      { userId, date: targetDate },
      {
        $set: dailyScore,
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ score: dailyScore });
  } catch (error) {
    console.error("[Score Calculate] Error:", error);
    return NextResponse.json(
      { error: "Failed to calculate daily score" },
      { status: 500 }
    );
  }
}
