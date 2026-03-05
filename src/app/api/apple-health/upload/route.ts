// =============================================================================
// Apple Health Upload — Parse and store Apple Health export data
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";
import { parseAppleHealthExport } from "@/lib/apple-health";
import { validateReading } from "@/lib/validation";
import type { HealthReading } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Upload a ZIP or XML file." },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "application/zip",
      "application/x-zip-compressed",
      "text/xml",
      "application/xml",
    ];
    const isValidType =
      validTypes.includes(file.type) ||
      file.name.endsWith(".zip") ||
      file.name.endsWith(".xml");

    if (!isValidType) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a ZIP or XML file." },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Apple Health export (XML string)
    const xmlString = buffer.toString("utf-8");
    const parsedDays = parseAppleHealthExport(xmlString, userId);

    if (!parsedDays || parsedDays.length === 0) {
      return NextResponse.json(
        { error: "No health data found in the uploaded file." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("health_readings");

    let imported = 0;
    let rejected = 0;

    for (const dayData of parsedDays) {
      // parseAppleHealthExport already returns HealthReading objects
      const reading: HealthReading = {
        ...dayData,
        userId,
        source: "apple_health",
        timestamp: new Date(dayData.date),
      };

      // Validate each reading (pass empty history for initial import)
      const validation = validateReading(reading, []);

      if (!validation.passed) {
        rejected++;
        continue;
      }

      reading.validated = true;
      reading.confidence = validation.confidence;
      reading.outlier_flags = validation.outliers;
      reading.updated_at = new Date();

      // Upsert by userId + date + source to avoid duplicates
      await collection.updateOne(
        {
          userId,
          date: reading.date,
          source: "apple_health",
        },
        {
          $set: reading,
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        { upsert: true }
      );

      imported++;
    }

    return NextResponse.json({ imported, rejected });
  } catch (error) {
    console.error("[Apple Health Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to process Apple Health export" },
      { status: 500 }
    );
  }
}
