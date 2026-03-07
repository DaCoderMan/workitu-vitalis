import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Conversation } from "@/lib/db/models/conversation";
import { Transaction } from "@/lib/db/models/transaction";
import { Contact } from "@/lib/db/models/contact";
import { XPEvent } from "@/lib/db/models/gamification";
import { Invoice } from "@/lib/db/models/invoice";
import { HealthEntry } from "@/lib/db/models/health";
import { Feedback } from "@/lib/db/models/feedback";

// GET /api/analytics — aggregate stats across all systems
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisWeek = new Date(now);
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
  thisWeek.setHours(0, 0, 0, 0);

  const [
    totalConversations,
    thisMonthConversations,
    totalContacts,
    contactsByType,
    monthlyIncome,
    lastMonthIncome,
    monthlyExpenses,
    totalXP,
    weekXP,
    invoicesPaid,
    invoicesPending,
    healthEntries,
    feedbackPositive,
    feedbackTotal,
  ] = await Promise.all([
    Conversation.countDocuments({ userId: "admin" }),
    Conversation.countDocuments({ userId: "admin", createdAt: { $gte: thisMonth } }),
    Contact.countDocuments({ userId: "admin", status: "active" }),
    Contact.aggregate([{ $match: { userId: "admin" } }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
    Transaction.aggregate([
      { $match: { userId: "admin", type: "income", date: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: "admin", type: "income", date: { $gte: lastMonth, $lt: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { userId: "admin", type: "expense", date: { $gte: thisMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    XPEvent.aggregate([{ $match: { userId: "admin" } }, { $group: { _id: null, total: { $sum: "$xp" } } }]),
    XPEvent.aggregate([{ $match: { userId: "admin", createdAt: { $gte: thisWeek } } }, { $group: { _id: null, total: { $sum: "$xp" } } }]),
    Invoice.aggregate([{ $match: { userId: "admin", status: "paid" } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    Invoice.aggregate([{ $match: { userId: "admin", status: { $in: ["sent", "draft"] } } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
    HealthEntry.countDocuments({ userId: "admin", date: { $gte: thisWeek } }),
    Feedback.countDocuments({ userId: "admin", rating: "positive" }),
    Feedback.countDocuments({ userId: "admin" }),
  ]);

  const income = monthlyIncome[0]?.total || 0;
  const prevIncome = lastMonthIncome[0]?.total || 0;
  const expenses = monthlyExpenses[0]?.total || 0;

  return NextResponse.json({
    conversations: { total: totalConversations, thisMonth: thisMonthConversations },
    contacts: {
      total: totalContacts,
      byType: Object.fromEntries(contactsByType.map((c: { _id: string; count: number }) => [c._id, c.count])),
    },
    finance: {
      monthlyIncome: income,
      lastMonthIncome: prevIncome,
      monthlyExpenses: expenses,
      net: income - expenses,
      incomeGrowth: prevIncome > 0 ? Math.round(((income - prevIncome) / prevIncome) * 100) : 0,
    },
    invoices: {
      totalPaid: invoicesPaid[0]?.total || 0,
      totalPending: invoicesPending[0]?.total || 0,
    },
    xp: { total: totalXP[0]?.total || 0, thisWeek: weekXP[0]?.total || 0 },
    health: { entriesThisWeek: healthEntries },
    feedback: {
      total: feedbackTotal,
      positive: feedbackPositive,
      satisfactionRate: feedbackTotal > 0 ? Math.round((feedbackPositive / feedbackTotal) * 100) : 0,
    },
  });
}
