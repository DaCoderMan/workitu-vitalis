// =============================================================================
// Health Readings — Fetch readings for authenticated user
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const days = parseInt(searchParams.get("days") || "7", 10);
    const source = searchParams.get("source"); // "whoop" | "apple_watch"

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Build query filter
    const filter: Record<string, unknown> = {
      userId,
      date: { $gte: startDateStr },
    };

    if (source) {
      // Map "apple_watch" query param to "apple_health" source
      const sourceMap: Record<string, string> = {
        apple_watch: "apple_health",
        whoop: "whoop",
        manual: "manual",
      };
      filter.source = sourceMap[source] || source;
    }

    const client = await clientPromise;
    const db = client.db();

    const readings = await db
      .collection("health_readings")
      .find(filter)
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json({ readings });
  } catch (error) {
    console.error("[Readings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch readings" },
      { status: 500 }
    );
  }
}
