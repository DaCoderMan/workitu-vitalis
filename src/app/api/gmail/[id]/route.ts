import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { GoogleEmail } from "@/lib/db/models/google-email";

/**
 * GET /api/gmail/[id] — Returns full email body from GoogleEmail collection
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  try {
    const email = await GoogleEmail.findOne({
      userId: user.id,
      messageId: id,
    }).lean();

    if (!email) {
      return Response.json({ error: "Email not found" }, { status: 404 });
    }

    return Response.json({
      messageId: email.messageId,
      threadId: email.threadId,
      from: email.from,
      to: email.to,
      subject: email.subject,
      snippet: email.snippet,
      body: email.body ?? "",
      date: email.date,
      isRead: email.isRead,
      labels: email.labels,
    });
  } catch (err) {
    console.error("[api/gmail/id] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch email";
    return Response.json({ error: message }, { status: 500 });
  }
}
