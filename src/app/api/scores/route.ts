// =============================================================================
// Daily Scores — Fetch daily mood/health scores for authenticated user
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const days = parseInt(searchParams.get("days") || "14", 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const client = await clientPromise;
    const db = client.db();

    const scores = await db
      .collection("daily_scores")
      .find({
        userId,
        date: { $gte: startDateStr },
      })
      .sort({ date: -1 })
      .toArray();

    // Return scores with mood_state for quick UI rendering
    const response = scores.map((score) => ({
      _id: score._id,
      date: score.date,
      mood_score: score.mood_score,
      mood_state: score.mood_state,
      body_battery: score.body_battery,
      sleep_gpa: score.sleep_gpa,
      sleep_grade: score.sleep_grade,
      confidence: score.confidence,
      data_completeness: score.data_completeness,
      patterns: score.patterns,
    }));

    return NextResponse.json({ scores: response });
  } catch (error) {
    console.error("[Scores] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scores" },
      { status: 500 }
    );
  }
}
