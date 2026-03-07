import { getUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const VPS_IP = process.env.VPS_IP || "65.109.230.136";
const VPS_PORT = process.env.VPS_PORT || "8000";
const VPS_API_KEY = process.env.VPS_API_KEY;

// Allowed commands whitelist — prevents arbitrary code execution
const ALLOWED_COMMANDS: Record<string, string> = {
  agent_logs: "tail -50 /var/log/bee-agent.log",
  agent_status: "systemctl is-active bee-agent.timer 2>/dev/null || echo 'not found'; cat /var/www/bee-brain/agent/config.json 2>/dev/null || echo '{}'",
  run_agent: "cd /var/www/bee-brain && python3 agent/bee_agent.py --dry-run 2>&1 | tail -100",
  disk_usage: "df -h / | tail -1",
  uptime: "uptime",
  services: "systemctl list-units --type=service --state=running --no-pager | grep -E 'bee|n8n|nginx|node' || echo 'No matching services'",
};

// POST /api/vps/execute — run whitelisted command on VPS via API
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VPS_API_KEY) {
    return NextResponse.json(
      { error: "VPS_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const { command } = await req.json();

    if (!command || !ALLOWED_COMMANDS[command]) {
      return NextResponse.json(
        {
          error: `Invalid command. Allowed: ${Object.keys(ALLOWED_COMMANDS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Try VPS API endpoint if available, otherwise return the command for reference
    try {
      const res = await fetch(
        `http://${VPS_IP}:${VPS_PORT}/api/vault/health`,
        {
          headers: { "X-API-Key": VPS_API_KEY },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (res.ok) {
        return NextResponse.json({
          command: command,
          label: ALLOWED_COMMANDS[command],
          status: "vps_online",
          note: "VPS API is reachable. SSH execution requires server-side agent.",
        });
      }
    } catch {
      // VPS not reachable
    }

    return NextResponse.json({
      command: command,
      label: ALLOWED_COMMANDS[command],
      status: "vps_offline",
      note: "VPS API is not reachable. Run the command manually via SSH.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Execute error" },
      { status: 500 }
    );
  }
}
