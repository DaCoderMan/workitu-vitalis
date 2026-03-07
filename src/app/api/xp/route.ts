import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { XPEvent, getLevelInfo } from "@/lib/db/models/gamification";
import { logActivity } from "@/lib/activity";

// GET /api/xp — get XP summary and recent events
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const events = await XPEvent.find({ userId: "admin" })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const totalResult = await XPEvent.aggregate([
    { $match: { userId: "admin" } },
    { $group: { _id: null, total: { $sum: "$xp" } } },
  ]);
  const totalXP = totalResult[0]?.total || 0;

  // Today's XP
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayResult = await XPEvent.aggregate([
    { $match: { userId: "admin", createdAt: { $gte: todayStart } } },
    { $group: { _id: null, total: { $sum: "$xp" } } },
  ]);
  const todayXP = todayResult[0]?.total || 0;

  // This week's XP
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekResult = await XPEvent.aggregate([
    { $match: { userId: "admin", createdAt: { $gte: weekStart } } },
    { $group: { _id: null, total: { $sum: "$xp" } } },
  ]);
  const weekXP = weekResult[0]?.total || 0;

  const level = getLevelInfo(totalXP);

  return NextResponse.json({
    level,
    todayXP,
    weekXP,
    recentEvents: events,
  });
}

// POST /api/xp — award XP
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const event = await XPEvent.create({
      userId: "admin",
      action: body.action,
      xp: body.xp,
      description: body.description || "",
      category: body.category || "other",
    });

    // Get updated total
    const totalResult = await XPEvent.aggregate([
      { $match: { userId: "admin" } },
      { $group: { _id: null, total: { $sum: "$xp" } } },
    ]);
    const totalXP = totalResult[0]?.total || 0;
    const level = getLevelInfo(totalXP);

    logActivity({
      userId: "admin",
      type: "xp_earned",
      title: `+${body.xp} XP: ${body.action}`,
      description: body.description,
    }).catch(() => {});

    return NextResponse.json({ event, level }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to award XP" },
      { status: 400 }
    );
  }
}
