import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { GoogleEmail } from "@/lib/db/models/google-email";

/**
 * GET /api/gmail?q=searchterm&unread=true&starred=true&limit=30
 *
 * Reads from MongoDB GoogleEmail collection.
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") || "";
  const unread = searchParams.get("unread");
  const starred = searchParams.get("starred");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  await connectDB();

  try {
    const filter: Record<string, unknown> = { userId: user.id };

    if (unread === "true") {
      filter.isRead = false;
    }

    if (starred === "true") {
      filter.labels = "STARRED";
    }

    if (query) {
      filter.$or = [
        { subject: { $regex: query, $options: "i" } },
        { from: { $regex: query, $options: "i" } },
        { snippet: { $regex: query, $options: "i" } },
      ];
    }

    const emails = await GoogleEmail.find(filter)
      .sort({ date: -1 })
      .limit(limit)
      .select("-body") // Exclude body from list view for performance
      .lean();

    const lastSync = emails.length > 0
      ? emails.reduce((latest, e) => {
          const t = new Date(e.lastSyncedAt).getTime();
          return t > latest ? t : latest;
        }, 0)
      : null;

    return Response.json({
      emails: emails.map((e) => ({
        messageId: e.messageId,
        threadId: e.threadId,
        from: e.from,
        to: e.to,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date,
        isRead: e.isRead,
        labels: e.labels,
      })),
      count: emails.length,
      lastSyncedAt: lastSync ? new Date(lastSync).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/gmail] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch emails";
    return Response.json({ error: message, emails: [], count: 0 }, { status: 500 });
  }
}
