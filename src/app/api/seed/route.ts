import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const client = await clientPromise;
    const db = client.db();

    const readings = [];
    const scores = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const hrvBase = 45 + Math.sin(i / 7) * 10;
      const hrv = Math.round(hrvBase + (Math.random() - 0.5) * 10);
      const rhr = Math.round(58 + (Math.random() - 0.5) * 8);
      const sleepDuration = Math.round(390 + (Math.random() - 0.5) * 120);
      const sleepEfficiency = Math.round(82 + Math.random() * 15);
      const steps = Math.round(5000 + Math.random() * 8000);
      const deep = Math.round(50 + Math.random() * 40);
      const rem = Math.round(60 + Math.random() * 30);
      const light = Math.max(0, sleepDuration - deep - rem - Math.round(Math.random() * 20));
      const awake = Math.round(10 + Math.random() * 20);

      readings.push({
        userId, source: "whoop", date: dateStr,
        metrics: {
          hrv_rmssd: hrv, resting_hr: rhr,
          spo2: Math.round(95 + Math.random() * 4),
          sleep_duration: sleepDuration, sleep_efficiency: sleepEfficiency,
          sleep_stages: { awake, light, deep, rem },
          sleep_midpoint: new Date(date.getTime() + 3.5 * 3600000),
          steps, active_calories: Math.round(200 + Math.random() * 400),
          strain_score: parseFloat((8 + Math.random() * 8).toFixed(1)),
          recovery_score: Math.round(50 + Math.random() * 45),
        },
        validation: { passed: true, outliers: [], confidence: Math.round(75 + Math.random() * 20), data_completeness: Math.round(80 + Math.random() * 20) },
        createdAt: date,
      });

      const moodScore = parseFloat((Math.sin(i / 7) * 0.8 + (Math.random() - 0.5) * 0.6).toFixed(2));
      const moodState = moodScore > 1.5 ? "mania_risk" : moodScore > 0.5 ? "elevated" : moodScore > -0.5 ? "euthymic" : moodScore > -1.5 ? "low" : "depression_risk";
      scores.push({
        userId, date: dateStr, mood_score: moodScore, mood_state: moodState,
        body_battery: Math.round(50 + Math.random() * 45),
        sleep_gpa: parseFloat((2.5 + Math.random() * 1.5).toFixed(1)),
        confidence: Math.round(75 + Math.random() * 20),
        patterns: [], createdAt: date,
      });
    }

    await db.collection("health_readings").deleteMany({ userId });
    await db.collection("daily_scores").deleteMany({ userId });
    await db.collection("recommendations").deleteMany({ userId });
    if (readings.length) await db.collection("health_readings").insertMany(readings);
    if (scores.length) await db.collection("daily_scores").insertMany(scores);
    await db.collection("recommendations").insertOne({
      userId, date: new Date().toISOString().split("T")[0], type: "daily",
      ai_insight: "Your HRV has been trending upward over the past week, indicating improved recovery. Sleep efficiency averaged 91% — excellent. Your circadian rhythm is well-aligned with consistent sleep midpoints. Overall, your autonomic nervous system shows strong parasympathetic tone.",
      action_items: [
        "Maintain your current bedtime — it's driving great recovery",
        "Consider a morning walk to capitalize on your high HRV window",
        "Monitor your midweek stress patterns and consider a deload",
        "Your sleep architecture supports high-intensity training today",
      ],
      supplements: [
        { name: "Magnesium Glycinate", dosage: "400 mg", timing: "Before bed", reason: "Supports deep sleep onset", evidence_level: "strong" },
        { name: "Omega-3 (EPA/DHA)", dosage: "2g EPA + 1g DHA", timing: "With meals", reason: "HRV improvement support", evidence_level: "strong" },
        { name: "Vitamin D3", dosage: "4,000 IU", timing: "Morning with food", reason: "Circadian rhythm support", evidence_level: "strong" },
      ],
      dietTips: ["Increase tryptophan-rich foods in evening meals", "Add fermented foods daily for gut-brain axis"],
      lifestyleTips: ["Morning sunlight within 30 min of waking", "Reduce screen brightness after 8 PM"],
      warnings: [], moodState: "euthymic", generated_by: "demo-seed", created_at: new Date(),
    });

    return NextResponse.json({ success: true, readings: readings.length, scores: scores.length });
  } catch (error) {
    console.error("[Seed] Error:", error);
    return NextResponse.json({ error: "Failed to seed" }, { status: 500 });
  }
}
