// =============================================================================
// WHOOP Sync — Pull latest data from WHOOP API and store validated readings
// =============================================================================

import { NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";
import { syncAllWhoop } from "@/lib/whoop";
import { validateReading } from "@/lib/validation";
import type { HealthReading } from "@/lib/types";

export async function POST() {
  try {
    const userId = await getUserId();

    // Fetch raw reading from WHOOP API (returns single merged reading for today)
    const singleReading = await syncAllWhoop(userId);
    const rawReadings: HealthReading[] = singleReading ? [singleReading] : [];

    if (rawReadings.length === 0) {
      return NextResponse.json({ synced: 0, outliers: 0 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("health_readings");

    let synced = 0;
    let outliers = 0;

    for (const reading of rawReadings) {
      // Run validation pipeline on each reading (empty history for now)
      const validation = validateReading(reading, []);

      const validatedReading: HealthReading = {
        ...reading,
        userId,
        source: "whoop",
        validated: validation.passed,
        confidence: validation.confidence,
        outlier_flags: validation.outliers,
        updated_at: new Date(),
      };

      if (!validation.passed) {
        outliers++;
      }

      // Upsert by userId + date + source to avoid duplicates
      await collection.updateOne(
        {
          userId,
          date: reading.date,
          source: "whoop",
        },
        {
          $set: validatedReading,
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        { upsert: true }
      );

      synced++;
    }

    return NextResponse.json({ synced, outliers });
  } catch (error) {
    console.error("[WHOOP Sync] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync WHOOP data" },
      { status: 500 }
    );
  }
}
