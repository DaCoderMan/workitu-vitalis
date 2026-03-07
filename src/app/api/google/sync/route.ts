import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { getDriveClient, getGmailClient } from "@/lib/google-api";
import { GoogleFile } from "@/lib/db/models/google-file";
import { GoogleEmail } from "@/lib/db/models/google-email";
import type { drive_v3, gmail_v1 } from "googleapis";

const MAX_CONTENT_BYTES = 50 * 1024; // 50KB limit per file content

// Google Workspace MIME types that can be exported as plain text
const EXPORT_MIME_MAP: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

/**
 * GET /api/google/sync — Return sync status
 */
export async function GET() {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const [fileCount, emailCount, lastFile, lastEmail] = await Promise.all([
    GoogleFile.countDocuments({ userId: user.id }),
    GoogleEmail.countDocuments({ userId: user.id }),
    GoogleFile.findOne({ userId: user.id }).sort({ lastSyncedAt: -1 }).select("lastSyncedAt").lean(),
    GoogleEmail.findOne({ userId: user.id }).sort({ lastSyncedAt: -1 }).select("lastSyncedAt").lean(),
  ]);

  return Response.json({
    drive: {
      count: fileCount,
      lastSyncedAt: lastFile?.lastSyncedAt ?? null,
    },
    gmail: {
      count: emailCount,
      lastSyncedAt: lastEmail?.lastSyncedAt ?? null,
    },
  });
}

/**
 * POST /api/google/sync?type=drive|gmail — Trigger sync
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const syncType = req.nextUrl.searchParams.get("type");
  if (!syncType || !["drive", "gmail"].includes(syncType)) {
    return Response.json(
      { error: "Query param 'type' must be 'drive' or 'gmail'" },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    if (syncType === "drive") {
      const result = await syncDrive(user.id);
      return Response.json({ ok: true, type: "drive", ...result });
    } else {
      const result = await syncGmail(user.id);
      return Response.json({ ok: true, type: "gmail", ...result });
    }
  } catch (err) {
    console.error(`[google/sync] ${syncType} sync error:`, err);
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Drive Sync
// ---------------------------------------------------------------------------

async function syncDrive(userId: string) {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google Drive not connected. Please re-authenticate with Google.");
  }

  let synced = 0;
  let errors = 0;
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      pageSize: 100,
      pageToken,
      fields:
        "nextPageToken, files(id, name, mimeType, parents, webViewLink, modifiedTime, size, shared)",
      q: "trashed = false",
    });

    const files = res.data.files ?? [];
    if (files.length === 0) break;

    const ops = await Promise.allSettled(
      files.map((file) => buildDriveUpsert(drive, userId, file))
    );

    const bulkOps = ops
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof buildDriveUpsert>>>>).value);

    errors += ops.filter((r) => r.status === "rejected").length;

    if (bulkOps.length > 0) {
      const result = await GoogleFile.bulkWrite(bulkOps);
      synced += result.upsertedCount + result.modifiedCount;
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return { synced, errors };
}

async function buildDriveUpsert(
  drive: drive_v3.Drive,
  userId: string,
  file: drive_v3.Schema$File
) {
  let content: string | undefined;

  const exportMime = EXPORT_MIME_MAP[file.mimeType ?? ""];
  if (exportMime) {
    // Google Workspace file — export as text
    try {
      const exported = await drive.files.export(
        { fileId: file.id!, mimeType: exportMime },
        { responseType: "text" }
      );
      content = truncateContent(String(exported.data));
    } catch {
      // Export failed (e.g. too large) — skip content
    }
  } else if (
    file.mimeType?.startsWith("text/") &&
    Number(file.size ?? 0) < MAX_CONTENT_BYTES
  ) {
    // Plain text file small enough to download
    try {
      const downloaded = await drive.files.get(
        { fileId: file.id!, alt: "media" },
        { responseType: "text" }
      );
      content = truncateContent(String(downloaded.data));
    } catch {
      // Download failed — skip content
    }
  }

  return {
    updateOne: {
      filter: { userId, googleId: file.id },
      update: {
        $set: {
          name: file.name ?? "Untitled",
          mimeType: file.mimeType ?? "application/octet-stream",
          content,
          parentId: file.parents?.[0] ?? null,
          webViewLink: file.webViewLink ?? null,
          modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : null,
          size: file.size ? Number(file.size) : null,
          shared: file.shared ?? false,
          lastSyncedAt: new Date(),
        },
        $setOnInsert: { userId, googleId: file.id },
      },
      upsert: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Gmail Sync
// ---------------------------------------------------------------------------

async function syncGmail(userId: string) {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Gmail not connected. Please re-authenticate with Google.");
  }

  let synced = 0;
  let errors = 0;
  let pageToken: string | undefined;
  let fetched = 0;
  const MAX_MESSAGES = 500;

  // Step 1: Collect message IDs (paginated)
  const messageIds: string[] = [];

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      maxResults: Math.min(100, MAX_MESSAGES - fetched),
      pageToken,
    });

    const messages = res.data.messages ?? [];
    for (const msg of messages) {
      if (msg.id) messageIds.push(msg.id);
    }

    fetched += messages.length;
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && fetched < MAX_MESSAGES);

  // Step 2: Fetch full messages in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((id) => fetchAndBuildEmailUpsert(gmail, userId, id))
    );

    const bulkOps = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof fetchAndBuildEmailUpsert>>>>).value);

    errors += results.filter((r) => r.status === "rejected").length;

    if (bulkOps.length > 0) {
      const result = await GoogleEmail.bulkWrite(bulkOps);
      synced += result.upsertedCount + result.modifiedCount;
    }
  }

  return { synced, errors };
}

async function fetchAndBuildEmailUpsert(
  gmail: gmail_v1.Gmail,
  userId: string,
  messageId: string
) {
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = msg.data.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  const from = getHeader("From");
  const to = getHeader("To")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const subject = getHeader("Subject") || "(no subject)";
  const dateStr = getHeader("Date");
  const date = dateStr ? new Date(dateStr) : new Date();

  const body = truncateContent(extractBody(msg.data.payload));
  const labels = msg.data.labelIds ?? [];
  const isRead = !labels.includes("UNREAD");

  return {
    updateOne: {
      filter: { userId, messageId },
      update: {
        $set: {
          threadId: msg.data.threadId ?? null,
          from,
          to,
          subject,
          snippet: msg.data.snippet ?? "",
          body,
          labels,
          date,
          isRead,
          lastSyncedAt: new Date(),
        },
        $setOnInsert: { userId, messageId },
      },
      upsert: true,
    },
  };
}

/**
 * Extract the text body from a Gmail message payload.
 * Walks the MIME parts tree to find text/plain or text/html.
 */
function extractBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";

  // Direct body on this part
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    if (payload.mimeType === "text/plain") return decoded;
    if (payload.mimeType === "text/html") return stripHtml(decoded);
  }

  // Recurse into parts — prefer text/plain
  if (payload.parts) {
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain) return extractBody(plain);

    const html = payload.parts.find((p) => p.mimeType === "text/html");
    if (html) return extractBody(html);

    // Try multipart children
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }

  return "";
}

/** Naive HTML tag stripper for email bodies */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate string content to MAX_CONTENT_BYTES */
function truncateContent(text: string): string {
  if (Buffer.byteLength(text, "utf-8") <= MAX_CONTENT_BYTES) return text;
  // Slice by bytes — cut at a safe point
  const buf = Buffer.from(text, "utf-8");
  return buf.subarray(0, MAX_CONTENT_BYTES).toString("utf-8");
}
