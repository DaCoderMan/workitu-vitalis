import { getUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let agentConfig = null;
  let infrastructure = null;
  let latestBriefing = null;
  let latestBriefingDate = null;

  try {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "config/bee-config.json"), "utf-8")
    );
    agentConfig = config.autonomous_agent ?? null;
    infrastructure = config.infrastructure?.vps ?? null;
  } catch {
    // ignore
  }

  try {
    const dailyDir = join(process.cwd(), "context/daily");
    if (existsSync(dailyDir)) {
      const files = readdirSync(dailyDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse();
      if (files.length > 0) {
        latestBriefingDate = files[0].replace(".md", "");
        latestBriefing = readFileSync(
          join(dailyDir, files[0]),
          "utf-8"
        );
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    agent: agentConfig,
    infrastructure,
    latestBriefing,
    latestBriefingDate,
  });
}
