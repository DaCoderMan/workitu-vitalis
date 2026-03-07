import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { HealthEntry } from "@/lib/db/models/health";
import { logActivity } from "@/lib/activity";

// GET /api/health — list health entries
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const days = parseInt(searchParams.get("days") || "7");

  const filter: Record<string, unknown> = {
    userId: "admin",
    date: { $gte: new Date(Date.now() - days * 86400000) },
  };
  if (type) filter.type = type;

  const entries = await HealthEntry.find(filter).sort({ date: -1 }).limit(100).lean();

  // Summary
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEntries = entries.filter((e) => new Date(e.date) >= today);

  return NextResponse.json({
    entries,
    summary: {
      total: entries.length,
      today: todayEntries.length,
      types: [...new Set(entries.map((e) => e.type))],
    },
  });
}

// POST /api/health — log a health entry
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  try {
    const body = await req.json();
    const entry = await HealthEntry.create({
      userId: "admin",
      date: body.date ? new Date(body.date) : new Date(),
      type: body.type,
      data: body.data || {},
      tags: body.tags || [],
      notes: body.notes,
    });
    logActivity({
      userId: "admin",
      type: "health_logged",
      title: `Health: ${body.type}`,
      description: body.notes,
    }).catch(() => {});

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
