import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { GoogleFile } from "@/lib/db/models/google-file";
import { GoogleEmail } from "@/lib/db/models/google-email";

interface SearchResult {
  type: "drive" | "gmail";
  title: string;
  snippet: string;
  date: Date | null;
  link: string | null;
  score: number;
}

const RESULT_LIMIT = 20;

/**
 * GET /api/google/search?q=term&type=all|drive|gmail
 *
 * Unified search across indexed Google Drive files and Gmail messages.
 * Uses MongoDB $text search for relevance-ranked results.
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "Query param 'q' is required" }, { status: 400 });
  }

  const type = req.nextUrl.searchParams.get("type") ?? "all";
  if (!["all", "drive", "gmail"].includes(type)) {
    return Response.json(
      { error: "Query param 'type' must be 'all', 'drive', or 'gmail'" },
      { status: 400 }
    );
  }

  await connectDB();

  const results: SearchResult[] = [];

  // Search Drive files
  if (type === "all" || type === "drive") {
    const files = await GoogleFile.find(
      { userId: user.id, $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(RESULT_LIMIT)
      .lean();

    for (const file of files) {
      results.push({
        type: "drive",
        title: file.name,
        snippet: file.content
          ? file.content.substring(0, 200)
          : file.mimeType,
        date: file.modifiedTime ?? null,
        link: file.webViewLink ?? null,
        score: (file as Record<string, unknown>).score as number,
      });
    }
  }

  // Search Gmail messages
  if (type === "all" || type === "gmail") {
    const emails = await GoogleEmail.find(
      { userId: user.id, $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(RESULT_LIMIT)
      .lean();

    for (const email of emails) {
      results.push({
        type: "gmail",
        title: email.subject,
        snippet: email.snippet || (email.body ? email.body.substring(0, 200) : ""),
        date: email.date ?? null,
        link: `https://mail.google.com/mail/u/0/#inbox/${email.messageId}`,
        score: (email as Record<string, unknown>).score as number,
      });
    }
  }

  // Sort combined results by relevance score descending, then limit
  results.sort((a, b) => b.score - a.score);
  const limited = results.slice(0, RESULT_LIMIT);

  return Response.json({
    query: q,
    type,
    count: limited.length,
    results: limited,
  });
}
