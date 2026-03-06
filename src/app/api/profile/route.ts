import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();
    await db.collection("user_profiles").updateOne(
      { userId: session.user.id },
      { $set: { ...body, userId: session.user.id, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Profile] Error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = await clientPromise;
    const db = client.db();
    const profile = await db.collection("user_profiles").findOne({ userId: session.user.id });
    return NextResponse.json({ profile: profile || {} });
  } catch (error) {
    console.error("[Profile] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
