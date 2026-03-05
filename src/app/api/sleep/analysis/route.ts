// =============================================================================
// Sleep Analysis — Sleep readings with grades from calculateSleepGPA
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";
import { calculateSleepGPA, calculateBaseline } from "@/lib/mood-engine";
import type { HealthReading } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const days = parseInt(searchParams.get("days") || "7", 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const client = await clientPromise;
    const db = client.db();

    // Fetch readings that have sleep data
    const readings = (await db
      .collection("health_readings")
      .find({
        userId,
        date: { $gte: startDateStr },
        validated: true,
        sleep_duration: { $exists: true, $gt: 0 },
      })
      .sort({ date: -1 })
      .toArray()) as unknown as HealthReading[];

    // Calculate baseline for consistency metric
    const baseline = calculateBaseline(readings);
    const baselineDuration = baseline.metrics.sleep_duration?.mean;

    // Calculate sleep grade for each reading
    const analysis = readings.map((reading) => {
      const sleepGrade = calculateSleepGPA(
        reading.sleep_stages,
        reading.sleep_duration ?? 0,
        reading.sleep_efficiency ?? 0,
        baselineDuration
      );

      return {
        date: reading.date,
        source: reading.source,
        sleep_duration: reading.sleep_duration,
        sleep_efficiency: reading.sleep_efficiency,
        sleep_stages: reading.sleep_stages,
        sleep_onset: reading.sleep_onset,
        sleep_wake: reading.sleep_wake,
        grade: sleepGrade,
      };
    });

    // Calculate aggregate stats
    const totalNights = analysis.length;
    const avgGPA =
      totalNights > 0
        ? analysis.reduce((sum, a) => sum + a.grade.overall.gpa, 0) /
          totalNights
        : 0;
    const avgDuration =
      totalNights > 0
        ? analysis.reduce((sum, a) => sum + (a.sleep_duration || 0), 0) /
          totalNights
        : 0;
    const avgEfficiency =
      totalNights > 0
        ? analysis.reduce((sum, a) => sum + (a.sleep_efficiency || 0), 0) /
          totalNights
        : 0;

    return NextResponse.json({
      nights: analysis,
      summary: {
        total_nights: totalNights,
        avg_gpa: Math.round(avgGPA * 100) / 100,
        avg_grade: gpaToGrade(avgGPA),
        avg_duration_minutes: Math.round(avgDuration),
        avg_efficiency: Math.round(avgEfficiency * 10) / 10,
      },
    });
  } catch (error) {
    console.error("[Sleep Analysis] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sleep analysis" },
      { status: 500 }
    );
  }
}

/** Convert GPA to letter grade */
function gpaToGrade(gpa: number): string {
  if (gpa >= 3.7) return "A";
  if (gpa >= 3.3) return "A-";
  if (gpa >= 3.0) return "B+";
  if (gpa >= 2.7) return "B";
  if (gpa >= 2.3) return "B-";
  if (gpa >= 2.0) return "C+";
  if (gpa >= 1.7) return "C";
  if (gpa >= 1.3) return "C-";
  if (gpa >= 1.0) return "D";
  return "F";
}
