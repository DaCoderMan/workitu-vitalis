// =============================================================================
// AI Insights — Fetch latest recommendation for authenticated user
// =============================================================================

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

export async function GET() {
  try {
    const userId = await getUserId();

    const client = await clientPromise;
    const db = client.db();

    // Fetch the most recent recommendation for this user
    const recommendation = await db
      .collection("recommendations")
      .findOne({ userId }, { sort: { created_at: -1 } });

    if (!recommendation) {
      return NextResponse.json(
        { error: "No insights found. Generate one first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      insight: {
        _id: recommendation._id,
        date: recommendation.date,
        moodState: recommendation.moodState,
        patterns: recommendation.patterns,
        ai_insight: recommendation.ai_insight,
        action_items: recommendation.action_items,
        supplements: recommendation.supplements,
        dietTips: recommendation.dietTips,
        lifestyleTips: recommendation.lifestyleTips,
        warnings: recommendation.warnings,
        created_at: recommendation.created_at,
      },
    });
  } catch (error) {
    console.error("[Insights] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
