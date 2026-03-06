import { NextResponse } from "next/server";
import { getUserId } from "@/lib/get-user";
import clientPromise from "@/lib/db/client";

export async function GET() {
  try {
    const userId = await getUserId();const client = await clientPromise;
    const db = client.db();
    const rec = await db.collection("recommendations")
      .findOne({ userId: userId }, { sort: { created_at: -1 } });
    return NextResponse.json({ recommendations: rec || null });
  } catch (error) {
    console.error("[Recommendations] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
