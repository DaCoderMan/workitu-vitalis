import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Feedback } from "@/lib/db/models/feedback";

// GET /api/feedback — get feedback stats
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const total = await Feedback.countDocuments({ userId: "admin" });
  const positive = await Feedback.countDocuments({ userId: "admin", rating: "positive" });
  const negative = await Feedback.countDocuments({ userId: "admin", rating: "negative" });

  const recentNegative = await Feedback.find({ userId: "admin", rating: "negative" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Category breakdown
  const categories = await Feedback.aggregate([
    { $match: { userId: "admin" } },
    { $group: { _id: { rating: "$rating", category: "$category" }, count: { $sum: 1 } } },
  ]);

  return NextResponse.json({
    total,
    positive,
    negative,
    satisfactionRate: total > 0 ? Math.round((positive / total) * 100) : 0,
    categories,
    recentNegative,
  });
}

// POST /api/feedback — submit feedback
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const feedback = await Feedback.create({
      userId: "admin",
      messageId: body.messageId,
      conversationId: body.conversationId || "",
      rating: body.rating,
      category: body.category,
      comment: body.comment,
      toolUsed: body.toolUsed,
      userQuery: body.userQuery || "",
      assistantResponse: body.assistantResponse || "",
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Feedback error" },
      { status: 400 }
    );
  }
}
