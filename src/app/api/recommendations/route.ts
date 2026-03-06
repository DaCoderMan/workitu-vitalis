import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = await clientPromise;
    const db = client.db();
    const rec = await db.collection("recommendations")
      .findOne({ userId: session.user.id }, { sort: { created_at: -1 } });
    return NextResponse.json({ recommendations: rec || null });
  } catch (error) {
    console.error("[Recommendations] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
