import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Automation } from "@/lib/db/models/automation";

// GET /api/automations — list all automations
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const automations = await Automation.find({ userId: "admin" })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ automations });
}

// POST /api/automations — create new automation
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const automation = await Automation.create({
      userId: "admin",
      name: body.name,
      schedule: body.schedule,
      timezone: body.timezone || "Asia/Jerusalem",
      action: body.action,
      config: body.config || {},
      enabled: body.enabled !== false,
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create automation" },
      { status: 400 }
    );
  }
}
