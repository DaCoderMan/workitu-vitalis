import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { connectDB } from "@/lib/db/connect";
import { getDriveClient } from "@/lib/google-api";
import { GoogleFile } from "@/lib/db/models/google-file";

/**
 * GET /api/drive?folderId=root&q=searchterm
 *
 * Returns file list from MongoDB cache first, falls back to live Drive API.
 */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const folderId = searchParams.get("folderId") || "root";
  const query = searchParams.get("q") || "";

  await connectDB();

  // Try MongoDB cache first
  try {
    const filter: Record<string, unknown> = { userId: user.id };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } },
      ];
    } else {
      // If browsing a folder, filter by parentId
      // "root" means top-level files (parentId is the root Drive folder ID or null)
      if (folderId !== "root") {
        filter.parentId = folderId;
      }
    }

    const cached = await GoogleFile.find(filter)
      .sort({ mimeType: 1, name: 1 }) // folders first, then alphabetical
      .limit(100)
      .lean();

    if (cached.length > 0) {
      const lastSync = cached.reduce((latest, f) => {
        const t = new Date(f.lastSyncedAt).getTime();
        return t > latest ? t : latest;
      }, 0);

      return Response.json({
        files: cached.map((f) => ({
          id: f.googleId,
          name: f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime,
          size: f.size ?? null,
          webViewLink: f.webViewLink ?? null,
          shared: f.shared,
          parentId: f.parentId ?? null,
        })),
        count: cached.length,
        source: "cache",
        lastSyncedAt: new Date(lastSync).toISOString(),
      });
    }
  } catch (err) {
    console.error("[api/drive] Cache read error:", err);
  }

  // Fall back to live Drive API
  try {
    const drive = await getDriveClient();
    if (!drive) {
      return Response.json({
        files: [],
        count: 0,
        source: "none",
        error: "Google Drive not connected",
      });
    }

    let driveQuery = "trashed = false";
    if (query) {
      driveQuery += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    } else if (folderId) {
      driveQuery += ` and '${folderId}' in parents`;
    }

    const res = await drive.files.list({
      pageSize: 100,
      fields:
        "files(id, name, mimeType, parents, webViewLink, modifiedTime, size, shared)",
      q: driveQuery,
      orderBy: "folder,name",
    });

    const files = (res.data.files ?? []).map((f) => ({
      id: f.id,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "application/octet-stream",
      modifiedTime: f.modifiedTime ?? null,
      size: f.size ? Number(f.size) : null,
      webViewLink: f.webViewLink ?? null,
      shared: f.shared ?? false,
      parentId: f.parents?.[0] ?? null,
    }));

    return Response.json({
      files,
      count: files.length,
      source: "live",
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/drive] Live API error:", err);
    const message = err instanceof Error ? err.message : "Drive API failed";
    return Response.json({ error: message, files: [], count: 0 }, { status: 500 });
  }
}
