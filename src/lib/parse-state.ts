import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export interface RiaState {
  revenue: { current: number; target: number };
  xp: { current: number; level: number; levelName: string; toNext: number };
  streaks: { revenue: number; sync: number; target: number };
  carryForward: Array<{
    text: string;
    status: "done" | "pending" | "urgent";
    link?: string;
  }>;
  alerts: string[];
  recentSessions: Array<{ date: string; summary: string }>;
  projectCount: number;
}

function parseInteger(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw.replace(/,/g, ""), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function getFirstIntegerMatch(content: string, pattern: RegExp): number | null {
  const match = content.match(pattern);
  return parseInteger(match?.[1]);
}

function getSection(content: string, title: string): string | null {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionMatch = content.match(
    new RegExp(`## ${escapedTitle}\\r?\\n([\\s\\S]*?)(?=\\r?\\n##|$)`)
  );
  return sectionMatch?.[1] ?? null;
}

export function parseCurrentState(): RiaState {
  const defaults: RiaState = {
    revenue: { current: 0, target: 7000 },
    xp: { current: 0, level: 1, levelName: "Spark", toNext: 500 },
    streaks: { revenue: 0, sync: 0, target: 5 },
    carryForward: [],
    alerts: [],
    recentSessions: [],
    projectCount: 0,
  };

  try {
    const content = readFileSync(
      join(process.cwd(), "context/current-state.md"),
      "utf-8"
    );

    // Revenue
    const currentRevenue = getFirstIntegerMatch(
      content,
      /\*\*Current:\*\*\s*₪([\d,]+)\/mo/
    );
    if (currentRevenue !== null) defaults.revenue.current = currentRevenue;

    const targetRevenue = getFirstIntegerMatch(
      content,
      /\*\*Target:\*\*\s*₪([\d,]+)\/mo/
    );
    if (targetRevenue !== null) defaults.revenue.target = targetRevenue;

    // Revenue streak
    const streakMatch = content.match(
      /\*\*Revenue streak:\*\*\s*(\d+)\/(\d+)/
    );
    if (streakMatch) {
      const revenueStreak = parseInteger(streakMatch[1]);
      const streakTarget = parseInteger(streakMatch[2]);
      if (revenueStreak !== null) defaults.streaks.revenue = revenueStreak;
      if (streakTarget !== null) defaults.streaks.target = streakTarget;
    }

    // Sync streak
    const syncMatch = content.match(/\*\*Sync streak:\*\*\s*(\d+)\/(\d+)/);
    if (syncMatch) {
      const syncStreak = parseInteger(syncMatch[1]);
      if (syncStreak !== null) defaults.streaks.sync = syncStreak;
    }

    // XP
    const currentXP = getFirstIntegerMatch(content, /\*\*XP:\*\*\s*(\d+)/);
    if (currentXP !== null) defaults.xp.current = currentXP;

    const levelMatch = content.match(
      /\*\*Level:\*\*\s*(\d+)\s*—\s*(.+)/
    );
    if (levelMatch) {
      const xpLevel = parseInteger(levelMatch[1]);
      if (xpLevel !== null) defaults.xp.level = xpLevel;
      defaults.xp.levelName = levelMatch[2].trim();
    }

    const xpToNext = getFirstIntegerMatch(
      content,
      /\*\*XP to next level[^:]*:\*\*\s*(\d+)/
    );
    if (xpToNext !== null) defaults.xp.toNext = xpToNext;

    // Carry-forward
    const carryForwardSection = getSection(content, "Active Carry-Forward");
    if (carryForwardSection) {
      const lines = carryForwardSection
        .split("\n")
        .filter((line) => line.startsWith("- "));
      for (const line of lines) {
        const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
        let status: "done" | "pending" | "urgent" = "pending";
        if (line.includes("✅")) status = "done";
        else if (line.includes("🔴")) status = "urgent";

        const text = line
          .replace(/^-\s*/, "")
          .replace(/✅|📌|⚠️|🔴/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/\s*—\s*(COMPLETE|status:.*?)$/i, "")
          .trim();

        defaults.carryForward.push({
          text,
          status,
          link: linkMatch?.[2],
        });
      }
    }

    // Financial alerts
    const alertSection = getSection(content, "Financial Alert");
    if (alertSection) {
      const alertLines = alertSection
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => l.replace(/^-\s*/, "").trim());
      defaults.alerts.push(...alertLines);
    }

    // Recent sessions
    const recentSessionsSection = getSection(content, "Recent Sessions");
    if (recentSessionsSection) {
      const sessLines = recentSessionsSection
        .split("\n")
        .filter((l) => l.startsWith("- **"));
      for (const line of sessLines.slice(0, 5)) {
        const dateMatch = line.match(/\*\*([^*]+)\*\*/);
        const summary = line
          .replace(/^-\s*\*\*[^*]+\*\*:?\s*/, "")
          .substring(0, 120);
        if (dateMatch) {
          defaults.recentSessions.push({
            date: dateMatch[1],
            summary,
          });
        }
      }
    }

    // Project count from bee-config.json
    try {
      const config = JSON.parse(
        readFileSync(join(process.cwd(), "config/bee-config.json"), "utf-8")
      );
      defaults.projectCount = config.deployed_projects?.length ?? 0;
    } catch {
      // ignore
    }

    return defaults;
  } catch {
    return defaults;
  }
}

export function getLatestBriefing(): {
  date: string;
  content: string;
} | null {
  try {
    const dailyDir = join(process.cwd(), "context/daily");
    if (!existsSync(dailyDir)) return null;
    const files = readdirSync(dailyDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    return {
      date: files[0].replace(".md", ""),
      content: readFileSync(join(dailyDir, files[0]), "utf-8"),
    };
  } catch {
    return null;
  }
}
