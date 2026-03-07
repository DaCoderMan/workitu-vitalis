import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Transaction } from "@/lib/db/models/transaction";
import { logActivity } from "@/lib/activity";

// GET /api/finance — list transactions with optional filters
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // income | expense
  const category = searchParams.get("category");
  const month = searchParams.get("month"); // YYYY-MM
  const limit = parseInt(searchParams.get("limit") || "50");

  const filter: Record<string, unknown> = { userId: "admin" };
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    filter.date = { $gte: start, $lt: end };
  }

  const transactions = await Transaction.find(filter)
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  // Calculate summary
  const allMonth = month
    ? transactions
    : await Transaction.find({
        userId: "admin",
        date: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }).lean();

  const income = allMonth
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = allMonth
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    transactions,
    summary: {
      income,
      expenses,
      net: income - expenses,
      count: transactions.length,
    },
  });
}

// POST /api/finance — create transaction
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const body = await req.json();
    const transaction = await Transaction.create({
      userId: "admin",
      type: body.type,
      amount: body.amount,
      currency: body.currency || "ILS",
      category: body.category,
      description: body.description || "",
      date: body.date ? new Date(body.date) : new Date(),
      recurring: body.recurring || false,
      recurringFrequency: body.recurringFrequency,
      tags: body.tags || [],
      source: body.source,
    });

    logActivity({
      userId: "admin",
      type: "xp_earned",
      title: `${body.type === "income" ? "Income" : "Expense"}: ₪${body.amount}`,
      description: body.description || body.category,
    }).catch(() => {});

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create transaction" },
      { status: 400 }
    );
  }
}
