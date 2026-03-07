import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const VPS_IP = process.env.VPS_IP || "65.109.230.136";
const VPS_PORT = process.env.VPS_PORT || "8000";
const VPS_API_KEY = process.env.VPS_API_KEY;

// GET /api/obsidian/sync — get sync status and vault stats
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VPS_API_KEY) {
    return NextResponse.json({
      status: "not_configured",
      message: "VPS_API_KEY not set",
    });
  }

  try {
    // Check vault health
    const healthRes = await fetch(
      `http://${VPS_IP}:${VPS_PORT}/api/vault/health`,
      {
        headers: { "X-API-Key": VPS_API_KEY },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!healthRes.ok) {
      return NextResponse.json({
        status: "offline",
        message: "VPS vault API not reachable",
      });
    }

    const health = await healthRes.json();

    // Get vault listing for stats
    const listRes = await fetch(
      `http://${VPS_IP}:${VPS_PORT}/api/vault/list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": VPS_API_KEY,
        },
        body: JSON.stringify({ folder: "", recursive: true }),
      }
    );

    let noteCount = 0;
    let folders: string[] = [];
    if (listRes.ok) {
      const listing = await listRes.json();
      const items = Array.isArray(listing) ? listing : listing.files || listing.notes || [];
      noteCount = items.filter((f: { path?: string }) => f.path?.endsWith(".md")).length;
      folders = [...new Set(
        items
          .map((f: { path?: string }) => f.path?.split("/").slice(0, -1).join("/"))
          .filter((f: string | undefined): f is string => !!f && f.length > 0)
      )] as string[];
    }

    return NextResponse.json({
      status: "connected",
      health,
      stats: {
        noteCount,
        folderCount: folders.length,
        folders: folders.slice(0, 20),
      },
    });
  } catch (e) {
    return NextResponse.json({
      status: "error",
      message: e instanceof Error ? e.message : "Sync check failed",
    });
  }
}

// POST /api/obsidian/sync — trigger a sync action
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VPS_API_KEY) {
    return NextResponse.json({ error: "VPS not configured" }, { status: 500 });
  }

  try {
    const { action, path, content } = await req.json();

    if (action === "create_daily") {
      // Create today's daily note
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
      const res = await fetch(
        `http://${VPS_IP}:${VPS_PORT}/api/vault/daily`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": VPS_API_KEY,
          },
          body: JSON.stringify({
            date: today,
            append_content: content || "",
          }),
        }
      );

      const data = await res.json();
      return NextResponse.json({ action: "create_daily", date: today, result: data });
    }

    if (action === "push_note" && path && content) {
      const res = await fetch(
        `http://${VPS_IP}:${VPS_PORT}/api/vault/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": VPS_API_KEY,
          },
          body: JSON.stringify({ path, content }),
        }
      );

      const data = await res.json();
      return NextResponse.json({ action: "push_note", path, result: data });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: create_daily, push_note" },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync error" },
      { status: 500 }
    );
  }
}
