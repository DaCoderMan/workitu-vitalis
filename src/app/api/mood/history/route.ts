// =============================================================================
// Mood History — Timeline of mood scores and states
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const days = parseInt(searchParams.get("days") || "30", 10);

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
      .sort({ date: 1 }) // Chronological order for timeline display
      .toArray();

    // Map to mood timeline format
    const timeline = scores.map((score) => ({
      date: score.date,
      mood_score: score.mood_score,
      mood_state: score.mood_state,
      body_battery: score.body_battery,
    }));

    return NextResponse.json({ history: timeline });
  } catch (error) {
    console.error("[Mood History] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mood history" },
      { status: 500 }
    );
  }
}
