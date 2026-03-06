import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();const body = await request.json();
    const client = await clientPromise;
    const db = client.db();
    await db.collection("user_profiles").updateOne(
      { userId: userId },
      { $set: { ...body, userId: userId, updatedAt: new Date() } },
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
    const userId = await getUserId();const client = await clientPromise;
    const db = client.db();
    const profile = await db.collection("user_profiles").findOne({ userId: userId });
    return NextResponse.json({ profile: profile || {} });
  } catch (error) {
    console.error("[Profile] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
