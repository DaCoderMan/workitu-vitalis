import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import clientPromise from "@/lib/db/client";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const client = await clientPromise;
    const db = client.db();
    await Promise.all([
      db.collection("health_readings").deleteMany({ userId }),
      db.collection("daily_scores").deleteMany({ userId }),
      db.collection("recommendations").deleteMany({ userId }),
      db.collection("user_profiles").deleteMany({ userId }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Delete] Error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
