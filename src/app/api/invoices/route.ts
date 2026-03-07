import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { Invoice } from "@/lib/db/models/invoice";

// GET /api/invoices
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = { userId: "admin" };
  if (status) filter.status = status;

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).limit(50).lean();

  const summary = {
    total: invoices.reduce((s, i) => s + i.total, 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
    pending: invoices.filter((i) => ["sent", "draft"].includes(i.status)).reduce((s, i) => s + i.total, 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0),
    count: invoices.length,
  };

  return NextResponse.json({ invoices, summary });
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  try {
    const body = await req.json();
    const items = body.items || [{ description: body.description || "Service", quantity: 1, unitPrice: body.amount || 0 }];
    const subtotal = items.reduce((s: number, i: { quantity: number; unitPrice: number }) => s + i.quantity * i.unitPrice, 0);
    const tax = body.tax || 0;

    // Generate invoice number
    const count = await Invoice.countDocuments({ userId: "admin" });
    const invoiceNumber = body.invoiceNumber || `INV-${String(count + 1).padStart(4, "0")}`;

    const invoice = await Invoice.create({
      userId: "admin",
      invoiceNumber,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      items,
      currency: body.currency || "ILS",
      subtotal,
      tax,
      total: subtotal + tax,
      status: body.status || "draft",
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 86400000),
      notes: body.notes,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
