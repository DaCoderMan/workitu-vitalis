import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Transaction } from "@/lib/db/models/transaction";
import { XPEvent } from "@/lib/db/models/gamification";

// GET /api/charts?type=revenue|xp&days=30
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "revenue";
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  if (type === "revenue") {
    return handleRevenue(startDate);
  } else if (type === "xp") {
    return handleXP(startDate);
  }

  return NextResponse.json({ error: "Invalid type. Use 'revenue' or 'xp'" }, { status: 400 });
}

async function handleRevenue(startDate: Date) {
  const [incomeByDay, expensesByDay] = await Promise.all([
    Transaction.aggregate([
      { $match: { userId: "admin", type: "income", date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Transaction.aggregate([
      { $match: { userId: "admin", type: "expense", date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Merge into a single array indexed by date
  const incomeMap = new Map(incomeByDay.map((d) => [d._id, d.total]));
  const expenseMap = new Map(expensesByDay.map((d) => [d._id, d.total]));

  // Build all dates in range
  const allDates = new Set([...incomeMap.keys(), ...expenseMap.keys()]);
  const data = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      income: incomeMap.get(date) || 0,
      expenses: expenseMap.get(date) || 0,
    }));

  return NextResponse.json({ type: "revenue", data });
}

async function handleXP(startDate: Date) {
  const xpByDay = await XPEvent.aggregate([
    { $match: { userId: "admin", createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        daily: { $sum: "$xp" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get total XP before the start date for cumulative calculation
  const priorResult = await XPEvent.aggregate([
    { $match: { userId: "admin", createdAt: { $lt: startDate } } },
    { $group: { _id: null, total: { $sum: "$xp" } } },
  ]);
  let cumulative = priorResult[0]?.total || 0;

  const data = xpByDay.map((d) => {
    cumulative += d.daily;
    return {
      date: d._id,
      daily: d.daily,
      cumulative,
    };
  });

  return NextResponse.json({ type: "xp", data });
}
