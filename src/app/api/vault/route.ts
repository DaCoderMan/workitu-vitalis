import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const VPS_IP = process.env.VPS_IP || "65.109.230.136";
const VPS_PORT = process.env.VPS_PORT || "8000";
const VPS_API_KEY = process.env.VPS_API_KEY;

async function vpsVault(action: string, body: Record<string, unknown>) {
  if (!VPS_API_KEY) throw new Error("VPS_API_KEY not configured");

  const res = await fetch(`http://${VPS_IP}:${VPS_PORT}/api/vault/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": VPS_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`VPS vault error ${res.status}: ${text}`);
  }

  return res.json();
}

// POST /api/vault — proxy to VPS vault API
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, ...params } = await req.json();

    if (!action || !["search", "list", "read", "create", "update", "daily"].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const result = await vpsVault(action, params);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Vault proxy error" },
      { status: 500 }
    );
  }
}
