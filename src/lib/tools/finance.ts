import { tool } from "ai";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Transaction } from "@/lib/db/models/transaction";
import { Invoice } from "@/lib/db/models/invoice";
import { XPEvent, getLevelInfo, XP_VALUES } from "@/lib/db/models/gamification";

export const financeTools = {
  add_transaction: tool({
    description:
      "Record a financial transaction — income or expense. Use this when the user mentions money coming in or going out.",
    inputSchema: z.object({
      type: z.enum(["income", "expense"]).describe("Transaction type"),
      amount: z.number().describe("Amount in ILS (₪)"),
      category: z
        .string()
        .describe("Category (e.g. 'freelance', 'arnona', 'food', 'client payment', 'rent')"),
      description: z.string().optional().describe("Description of the transaction"),
      date: z.string().optional().describe("Date in YYYY-MM-DD format (defaults to today)"),
      source: z.string().optional().describe("Source (e.g. 'client:acme', 'freelance')"),
    }),
    execute: async ({ type, amount, category, description, date, source }) => {
      await connectDB();
      const transaction = await Transaction.create({
        userId: "admin",
        type,
        amount,
        currency: "ILS",
        category,
        description: description || "",
        date: date ? new Date(date) : new Date(),
        source,
      });
      return {
        message: `${type === "income" ? "Income" : "Expense"} of ₪${amount} recorded`,
        id: transaction._id,
        category,
      };
    },
  }),

  get_finance_summary: tool({
    description:
      "Get a financial summary — income, expenses, and net for the current month or a specific month.",
    inputSchema: z.object({
      month: z
        .string()
        .optional()
        .describe("Month in YYYY-MM format (defaults to current month)"),
    }),
    execute: async ({ month }) => {
      await connectDB();
      const now = new Date();
      const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const start = new Date(`${targetMonth}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const transactions = await Transaction.find({
        userId: "admin",
        date: { $gte: start, $lt: end },
      })
        .sort({ date: -1 })
        .lean();

      const income = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const byCategory: Record<string, number> = {};
      for (const t of transactions) {
        const key = `${t.type}:${t.category}`;
        byCategory[key] = (byCategory[key] || 0) + t.amount;
      }

      return {
        month: targetMonth,
        income,
        expenses,
        net: income - expenses,
        transactionCount: transactions.length,
        breakdown: byCategory,
      };
    },
  }),

  create_invoice: tool({
    description:
      "Create a new invoice for a client. Use this when the user wants to bill someone or generate an invoice.",
    inputSchema: z.object({
      clientName: z.string().describe("Client name"),
      clientEmail: z.string().optional().describe("Client email address"),
      items: z.array(z.object({
        description: z.string().describe("Line item description"),
        quantity: z.number().describe("Quantity"),
        unitPrice: z.number().describe("Unit price in ILS"),
      })).describe("Invoice line items"),
      tax: z.number().optional().describe("Tax percentage (default 17% for Israel VAT)"),
      dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
      notes: z.string().optional().describe("Invoice notes"),
    }),
    execute: async ({ clientName, clientEmail, items, tax, dueDate, notes }) => {
      await connectDB();
      const taxRate = tax ?? 17;
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const count = await Invoice.countDocuments({ userId: "admin" });
      const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

      const invoice = await Invoice.create({
        userId: "admin",
        invoiceNumber,
        clientName,
        clientEmail,
        items,
        subtotal,
        tax: taxAmount,
        total,
        currency: "ILS",
        status: "draft",
        issueDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
        notes,
      });

      return {
        message: `Invoice ${invoiceNumber} created for ${clientName}`,
        id: invoice._id,
        invoiceNumber,
        total: `₪${total.toLocaleString()}`,
        status: "draft",
      };
    },
  }),

  list_invoices: tool({
    description:
      "List invoices with optional filtering by status. Use this when the user asks about invoices or billing.",
    inputSchema: z.object({
      status: z
        .enum(["draft", "sent", "paid", "overdue", "cancelled"])
        .optional()
        .describe("Filter by invoice status"),
    }),
    execute: async ({ status }) => {
      await connectDB();
      const filter: Record<string, unknown> = { userId: "admin" };
      if (status) filter.status = status;

      const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).limit(20).lean();
      const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
      const totalPending = invoices.filter(i => ["sent", "draft"].includes(i.status)).reduce((s, i) => s + i.total, 0);

      return {
        invoices: invoices.map(i => ({
          id: i._id,
          number: i.invoiceNumber,
          client: i.clientName,
          total: `₪${i.total.toLocaleString()}`,
          status: i.status,
          dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString() : null,
        })),
        summary: { totalPaid: `₪${totalPaid}`, totalPending: `₪${totalPending}`, count: invoices.length },
      };
    },
  }),

  update_invoice_status: tool({
    description:
      "Update an invoice's status (mark as sent, paid, overdue, or cancelled).",
    inputSchema: z.object({
      id: z.string().describe("Invoice ID"),
      status: z.enum(["sent", "paid", "overdue", "cancelled"]).describe("New status"),
    }),
    execute: async ({ id, status }) => {
      await connectDB();
      const update: Record<string, unknown> = { status };
      if (status === "paid") update.paidDate = new Date();

      const invoice = await Invoice.findOneAndUpdate(
        { _id: id, userId: "admin" },
        { $set: update },
        { new: true }
      );
      if (!invoice) return "Invoice not found.";
      return `Invoice ${invoice.invoiceNumber} marked as ${status}.`;
    },
  }),

  log_expense: tool({
    description:
      "Log an expense from chat. Use this when the user mentions spending money, paying a bill, or any outgoing cost.",
    inputSchema: z.object({
      amount: z.number().describe("Expense amount in ILS (₪)"),
      description: z.string().describe("What the expense was for"),
      category: z
        .string()
        .optional()
        .describe("Category (e.g. 'food', 'rent', 'arnona', 'software', 'transport'). Defaults to 'general'."),
    }),
    execute: async ({ amount, description, category }) => {
      try {
        await connectDB();
        const transaction = await Transaction.create({
          userId: "admin",
          type: "expense",
          amount,
          currency: "ILS",
          category: category || "general",
          description,
          date: new Date(),
        });
        return {
          message: `Expense logged: ₪${amount} — ${description}`,
          id: transaction._id,
          type: "expense",
          category: category || "general",
        };
      } catch (e) {
        return `Failed to log expense: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  log_income: tool({
    description:
      "Log income from chat. Use this when the user mentions earning money, receiving payment, or any incoming revenue.",
    inputSchema: z.object({
      amount: z.number().describe("Income amount in ILS (₪)"),
      description: z.string().describe("What the income was for"),
      source: z
        .string()
        .optional()
        .describe("Income source (e.g. 'client:acme', 'freelance', 'salary'). Defaults to 'general'."),
    }),
    execute: async ({ amount, description, source }) => {
      try {
        await connectDB();
        const transaction = await Transaction.create({
          userId: "admin",
          type: "income",
          amount,
          currency: "ILS",
          category: source || "general",
          description,
          date: new Date(),
          source: source || undefined,
        });
        return {
          message: `Income logged: ₪${amount} — ${description}`,
          id: transaction._id,
          type: "income",
          source: source || "general",
        };
      } catch (e) {
        return `Failed to log income: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  get_leads: tool({
    description:
      "Get the revenue pipeline — leads, prospects, and potential clients from ClickUp.",
    inputSchema: z.object({
      status: z
        .string()
        .optional()
        .describe("Filter by status (e.g. 'open', 'in progress')"),
    }),
    execute: async ({ status }) => {
      const token = process.env.CLICKUP_API_TOKEN;
      if (!token) return "ClickUp not configured — no API token.";

      const leadsListId = process.env.CLICKUP_LEADS_LIST || "901816199661";

      try {
        let url = `https://api.clickup.com/api/v2/list/${leadsListId}/task?include_closed=false`;
        if (status) url += `&statuses[]=${status}`;

        const res = await fetch(url, {
          headers: { Authorization: token },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) return `ClickUp API error: ${res.status}`;

        const data = await res.json();
        const tasks = (data.tasks || []).slice(0, 20);

        return tasks.map(
          (t: {
            id: string;
            name: string;
            status: { status: string };
            priority: { priority: string } | null;
            due_date: string | null;
            url: string;
            description?: string;
          }) => ({
            id: t.id,
            name: t.name,
            status: t.status?.status,
            priority: t.priority?.priority || "none",
            due: t.due_date
              ? new Date(parseInt(t.due_date)).toLocaleDateString()
              : null,
            url: t.url,
          })
        );
      } catch (e) {
        return `ClickUp error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  update_lead_status: tool({
    description:
      "Update a lead's status in the revenue pipeline. Use this to move leads through the funnel.",
    inputSchema: z.object({
      taskId: z.string().describe("The ClickUp task ID of the lead"),
      status: z.string().describe("New status (e.g. 'in progress', 'proposal sent', 'closed won')"),
      note: z.string().optional().describe("Add a comment about this status change"),
    }),
    execute: async ({ taskId, status, note }) => {
      const token = process.env.CLICKUP_API_TOKEN;
      if (!token) return "ClickUp not configured — no API token.";

      try {
        const statusRes = await fetch(
          `https://api.clickup.com/api/v2/task/${taskId}`,
          {
            method: "PUT",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status }),
            signal: AbortSignal.timeout(10_000),
          }
        );

        if (!statusRes.ok) {
          const err = await statusRes.text();
          return `Failed to update lead: ${err}`;
        }

        if (note) {
          await fetch(
            `https://api.clickup.com/api/v2/task/${taskId}/comment`,
            {
              method: "POST",
              headers: {
                Authorization: token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ comment_text: note }),
              signal: AbortSignal.timeout(10_000),
            }
          );
        }

        return `Lead updated to "${status}"${note ? " with note" : ""}`;
      } catch (e) {
        return `ClickUp error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  get_analytics: tool({
    description:
      "Get cross-system analytics and metrics — conversations, contacts, finance, invoices, XP, health, feedback.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/analytics`);
        if (!res.ok) return `Analytics error: ${res.status}`;
        return await res.json();
      } catch (e) {
        return `Analytics error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  award_xp: tool({
    description:
      "Award XP for an accomplishment. Use this when the user completes a revenue action, ships a task, signs a client, or completes a session.",
    inputSchema: z.object({
      action: z
        .enum(["revenue_action", "client_call", "client_signed", "task_shipped", "session_completed", "streak_bonus"])
        .describe("Type of action"),
      description: z.string().optional().describe("What was accomplished"),
    }),
    execute: async ({ action, description }) => {
      await connectDB();
      const xpInfo = XP_VALUES[action];
      if (!xpInfo) return "Unknown action type.";

      await XPEvent.create({
        userId: "admin",
        action,
        xp: xpInfo.xp,
        description: description || action,
        category: xpInfo.category,
      });

      const totalResult = await XPEvent.aggregate([
        { $match: { userId: "admin" } },
        { $group: { _id: null, total: { $sum: "$xp" } } },
      ]);
      const totalXP = totalResult[0]?.total || 0;
      const level = getLevelInfo(totalXP);

      return {
        awarded: `+${xpInfo.xp} XP`,
        action,
        totalXP,
        level: `Level ${level.level} — ${level.name}`,
        toNextLevel: level.toNextLevel,
        progress: `${Math.round(level.progress)}%`,
      };
    },
  }),

  get_xp_status: tool({
    description:
      "Check current XP, level, and recent achievements. Use this when the user asks about their progress or stats.",
    inputSchema: z.object({}),
    execute: async () => {
      await connectDB();
      const totalResult = await XPEvent.aggregate([
        { $match: { userId: "admin" } },
        { $group: { _id: null, total: { $sum: "$xp" } } },
      ]);
      const totalXP = totalResult[0]?.total || 0;
      const level = getLevelInfo(totalXP);

      const recentEvents = await XPEvent.find({ userId: "admin" })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayResult = await XPEvent.aggregate([
        { $match: { userId: "admin", createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$xp" } } },
      ]);

      return {
        totalXP,
        level: level.level,
        levelName: level.name,
        toNextLevel: level.toNextLevel,
        nextLevelName: level.nextLevelName,
        progress: `${Math.round(level.progress)}%`,
        todayXP: todayResult[0]?.total || 0,
        recentEvents: recentEvents.map((e) => ({
          action: e.action,
          xp: e.xp,
          description: e.description,
          date: e.createdAt,
        })),
      };
    },
  }),
};
