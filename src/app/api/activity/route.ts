import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Activity } from "@/lib/db/models/activity";

// GET /api/activity?unread=true&limit=20
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const filter: Record<string, unknown> = { userId: "admin" };
  if (unreadOnly) filter.read = false;

  const activities = await Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Activity.countDocuments({ userId: "admin", read: false });

  return NextResponse.json({ activities, unreadCount });
}

// PATCH /api/activity — mark all as read
export async function PATCH() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const result = await Activity.updateMany(
    { userId: "admin", read: false },
    { $set: { read: true } }
  );

  return NextResponse.json({ marked: result.modifiedCount });
}
