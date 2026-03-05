// =============================================================================
// Generate AI Insight — Use DeepSeek to produce health recommendations
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";
import type { HealthReading, DailyScore, MoodState } from "@/lib/types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

function buildPrompt(
  readings: HealthReading[],
  scores: DailyScore[],
  currentMoodState: MoodState
): string {
  // Summarize the 7-day data for the prompt
  const readingSummary = readings.map((r) => ({
    date: r.date,
    source: r.source,
    hrv: r.hrv_rmssd || r.hrv_sdnn,
    resting_hr: r.resting_hr,
    sleep_duration: r.sleep_duration
      ? Math.round(r.sleep_duration / 60 * 10) / 10
      : null,
    sleep_efficiency: r.sleep_efficiency,
    spo2: r.spo2,
    steps: r.steps,
    strain: r.strain,
    recovery_score: r.recovery_score,
  }));

  const scoreSummary = scores.map((s) => ({
    date: s.date,
    mood_state: s.mood_state,
    mood_score: s.mood_score,
    body_battery: s.body_battery,
    sleep_gpa: s.sleep_gpa,
    patterns: s.patterns,
  }));

  return `You are Vitalis, a health insights AI specializing in mood stability and biometric analysis for individuals with bipolar disorder.

CURRENT MOOD STATE: ${currentMoodState}

## 7-Day Health Readings
${JSON.stringify(readingSummary, null, 2)}

## 7-Day Mood Scores
${JSON.stringify(scoreSummary, null, 2)}

## Instructions
Based on this biometric data, provide personalized health recommendations. Consider:

1. **Mood Trajectory**: Is the user trending toward depression, mania, or stable (euthymic)?
2. **Sleep Quality**: Analyze duration, efficiency, and consistency patterns.
3. **HRV Trends**: Lower HRV may indicate stress or autonomic dysregulation.
4. **Activity Balance**: Over-activity can signal mania risk; under-activity can signal depression.
5. **Recovery**: WHOOP recovery scores and their trend.

## Response Format (JSON)
Respond with ONLY valid JSON in this exact structure:
{
  "ai_insight": "A 2-3 sentence personalized insight about the user's current state and trajectory.",
  "action_items": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "supplements": [
    {
      "name": "Supplement name",
      "dosage": "Recommended dosage",
      "timing": "When to take it",
      "reason": "Why it's recommended based on the data",
      "evidence": "strong|moderate|emerging|traditional"
    }
  ],
  "diet_tips": [
    "Dietary recommendation based on current state"
  ],
  "lifestyle_tips": [
    "Lifestyle adjustment recommendation"
  ],
  "warnings": [
    "Any clinical warnings or red flags to watch for"
  ],
  "mood_trajectory": "improving|stable|declining|volatile",
  "risk_level": "low|moderate|high"
}`;
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Fetch 7-day readings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDateStr = sevenDaysAgo.toISOString().split("T")[0];

    const readings = (await db
      .collection("health_readings")
      .find({
        userId,
        date: { $gte: startDateStr },
        validated: true,
      })
      .sort({ date: -1 })
      .toArray()) as unknown as HealthReading[];

    // Fetch 7-day scores
    const scores = (await db
      .collection("daily_scores")
      .find({
        userId,
        date: { $gte: startDateStr },
      })
      .sort({ date: -1 })
      .toArray()) as unknown as DailyScore[];

    if (readings.length === 0) {
      return NextResponse.json(
        { error: "No health data available. Sync your device first." },
        { status: 400 }
      );
    }

    // Determine current mood state from most recent score
    const currentMoodState: MoodState =
      scores.length > 0 ? scores[0].mood_state : "euthymic";

    // Build prompt and call DeepSeek
    const prompt = buildPrompt(readings, scores, currentMoodState);

    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a health insights AI. Respond ONLY with valid JSON. No markdown, no code fences, no explanation outside the JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorBody = await deepseekResponse.text();
      console.error("[Insights Generate] DeepSeek API error:", errorBody);
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 }
      );
    }

    const deepseekData = await deepseekResponse.json();
    const rawContent = deepseekData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "Empty response from AI service" },
        { status: 502 }
      );
    }

    // Parse the AI response JSON
    let aiResult;
    try {
      // Strip potential markdown code fences
      const cleaned = rawContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      aiResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error(
        "[Insights Generate] Failed to parse AI response:",
        rawContent
      );
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Store in recommendations collection
    const recommendation = {
      userId,
      date: today,
      moodState: currentMoodState,
      patterns: scores.length > 0 ? scores[0].patterns : [],
      ai_insight: aiResult.ai_insight || "",
      action_items: aiResult.action_items || [],
      supplements: aiResult.supplements || [],
      dietTips: aiResult.diet_tips || [],
      lifestyleTips: aiResult.lifestyle_tips || [],
      warnings: aiResult.warnings || [],
      mood_trajectory: aiResult.mood_trajectory || "stable",
      risk_level: aiResult.risk_level || "low",
      model: "deepseek-chat",
      readings_used: readings.length,
      scores_used: scores.length,
      created_at: new Date(),
    };

    await db.collection("recommendations").insertOne(recommendation);

    return NextResponse.json({ insight: recommendation });
  } catch (error) {
    console.error("[Insights Generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
