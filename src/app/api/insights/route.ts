import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Transaction } from "@/lib/db/models/transaction";
import { XPEvent } from "@/lib/db/models/gamification";
import { Invoice } from "@/lib/db/models/invoice";
import { Contact } from "@/lib/db/models/contact";
import { HealthEntry } from "@/lib/db/models/health";

interface Insight {
  text: string;
  type: "positive" | "warning" | "neutral";
}

// In-memory cache with 1hr TTL
const cache = new Map<string, { data: Insight[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// GET /api/insights — AI-generated insights from aggregated data
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check cache
  const cacheKey = `insights:${user.id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ insights: cached.data });
  }

  await connectDB();

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeek = new Date(now);
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
  thisWeek.setHours(0, 0, 0, 0);

  const [
    monthlyIncome,
    monthlyExpenses,
    totalXPResult,
    weekXPResult,
    overdueInvoices,
    contactsCount,
    healthWeek,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: "admin", type: "income", date: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: "admin", type: "expense", date: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    XPEvent.aggregate([
      { $match: { userId: "admin" } },
      { $group: { _id: null, total: { $sum: "$xp" } } },
    ]),
    XPEvent.aggregate([
      { $match: { userId: "admin", createdAt: { $gte: thisWeek } } },
      { $group: { _id: null, total: { $sum: "$xp" } } },
    ]),
    Invoice.countDocuments({ userId: "admin", status: "overdue" }),
    Contact.countDocuments({ userId: "admin", status: "active" }),
    HealthEntry.countDocuments({ userId: "admin", date: { $gte: thisWeek } }),
  ]);

  const income = monthlyIncome[0]?.total || 0;
  const expenses = monthlyExpenses[0]?.total || 0;
  const totalXP = totalXPResult[0]?.total || 0;
  const weekXP = weekXPResult[0]?.total || 0;

  const summary = [
    `Monthly income: ${income} ILS`,
    `Monthly expenses: ${expenses} ILS`,
    `Net: ${income - expenses} ILS`,
    `Total XP: ${totalXP}, this week: ${weekXP}`,
    `Overdue invoices: ${overdueInvoices}`,
    `Active contacts: ${contactsCount}`,
    `Health entries this week: ${healthWeek}`,
  ].join("\n");

  // Call DeepSeek for insights
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // Fallback: generate static insights without AI
    const insights = generateFallbackInsights(income, expenses, totalXP, weekXP, overdueInvoices, healthWeek);
    cache.set(cacheKey, { data: insights, timestamp: Date.now() });
    return NextResponse.json({ insights });
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              'You are a business analytics AI. Given user metrics, generate 3-5 short actionable insights. Reply as a JSON array of objects: [{"text": "insight", "type": "positive|warning|neutral"}]. No markdown, no explanation, just the JSON array.',
          },
          {
            role: "user",
            content: `Here are my current metrics:\n${summary}\n\nGenerate 3-5 brief, actionable insights.`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim() || "[]";

    // Parse the JSON response
    let insights: Insight[];
    try {
      insights = JSON.parse(content);
      // Validate structure
      insights = insights
        .filter((i) => i.text && i.type)
        .map((i) => ({
          text: String(i.text),
          type: ["positive", "warning", "neutral"].includes(i.type) ? i.type : "neutral",
        }));
    } catch {
      insights = generateFallbackInsights(income, expenses, totalXP, weekXP, overdueInvoices, healthWeek);
    }

    cache.set(cacheKey, { data: insights, timestamp: Date.now() });
    return NextResponse.json({ insights });
  } catch (err) {
    console.error("[insights] AI call failed:", err);
    const insights = generateFallbackInsights(income, expenses, totalXP, weekXP, overdueInvoices, healthWeek);
    cache.set(cacheKey, { data: insights, timestamp: Date.now() });
    return NextResponse.json({ insights });
  }
}

function generateFallbackInsights(
  income: number,
  expenses: number,
  totalXP: number,
  weekXP: number,
  overdueInvoices: number,
  healthWeek: number
): Insight[] {
  const insights: Insight[] = [];

  if (income > expenses) {
    insights.push({ text: `Net positive this month: +${income - expenses} ILS`, type: "positive" });
  } else if (expenses > income) {
    insights.push({ text: `Expenses exceed income by ${expenses - income} ILS this month`, type: "warning" });
  }

  if (overdueInvoices > 0) {
    insights.push({ text: `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? "s" : ""} need attention`, type: "warning" });
  }

  if (weekXP > 0) {
    insights.push({ text: `Earned ${weekXP} XP this week (${totalXP} total)`, type: "positive" });
  } else {
    insights.push({ text: "No XP earned this week -- take some action!", type: "warning" });
  }

  if (healthWeek === 0) {
    insights.push({ text: "No health entries this week -- log sleep or exercise", type: "neutral" });
  } else {
    insights.push({ text: `${healthWeek} health entries logged this week`, type: "positive" });
  }

  return insights.slice(0, 5);
}
