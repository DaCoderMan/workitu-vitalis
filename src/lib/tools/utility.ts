import { tool } from "ai";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { HealthEntry } from "@/lib/db/models/health";

export const utilityTools = {
  get_current_datetime: tool({
    description: "Get the current date and time in Israel timezone.",
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      return {
        date: now.toLocaleDateString("en-IL", {
          timeZone: "Asia/Jerusalem",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: now.toLocaleTimeString("en-IL", {
          timeZone: "Asia/Jerusalem",
          hour: "2-digit",
          minute: "2-digit",
        }),
        iso: now.toISOString(),
      };
    },
  }),

  check_vps_status: tool({
    description:
      "Check if the VPS is online and get agent status. Use this when the user asks about the server or agent.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const { vpsGet } = await import("@/lib/vps-client");
        const health = await vpsGet("/api/vault/health");
        return { status: "online", ...health };
      } catch (e) {
        return {
          status: "offline",
          error: e instanceof Error ? e.message : "Cannot reach VPS",
        };
      }
    },
  }),

  scrape_url: tool({
    description:
      "Scrape a web page and extract its text content. Use this when the user wants to read or analyze a website.",
    inputSchema: z.object({
      url: z.string().describe("URL to scrape"),
    }),
    execute: async ({ url }) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return `Scrape failed: ${res.status}`;
        return await res.json();
      } catch (e) {
        return `Scrape error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  generate_code: tool({
    description:
      "Generate code using AI. Use this when the user asks you to write code, create functions, or generate scripts.",
    inputSchema: z.object({
      prompt: z.string().describe("What code to generate"),
      language: z
        .enum(["typescript", "javascript", "python", "react", "sql", "bash", "css"])
        .optional()
        .describe("Programming language (default: typescript)"),
      framework: z.string().optional().describe("Framework context (e.g. Next.js, Express)"),
    }),
    execute: async ({ prompt, language, framework }) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/codegen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, language: language || "typescript", framework }),
        });
        if (!res.ok) return `Code generation failed: ${res.status}`;
        const data = await res.json();
        return data.code || data.message || "No output";
      } catch (e) {
        return `CodeGen error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  log_health: tool({
    description:
      "Log a health entry — workout, meal, sleep, mood, weight, medication, or symptom. Use this when the user mentions exercise, food, sleep, feelings, or health data.",
    inputSchema: z.object({
      type: z
        .enum(["workout", "meal", "sleep", "mood", "weight", "medication", "symptom", "note"])
        .describe("Type of health entry"),
      data: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Structured data (e.g. {exercise: 'pushups', reps: 20} or {score: 7})"),
      notes: z.string().optional().describe("Notes about this entry"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
    }),
    execute: async ({ type, data, notes, tags }) => {
      await connectDB();
      const entry = await HealthEntry.create({
        userId: "admin",
        type,
        data: data || {},
        notes,
        tags: tags || [],
        date: new Date(),
      });
      return {
        message: `Health entry logged: ${type}`,
        id: entry._id,
        type,
      };
    },
  }),

  get_health_summary: tool({
    description:
      "Get a summary of recent health entries. Use this when the user asks about their health data, workout history, or wellness trends.",
    inputSchema: z.object({
      type: z
        .enum(["workout", "meal", "sleep", "mood", "weight", "medication", "symptom", "note"])
        .optional()
        .describe("Filter by entry type"),
      days: z.number().optional().describe("Number of days to look back (default 7)"),
    }),
    execute: async ({ type, days }) => {
      await connectDB();
      const lookback = days || 7;
      const since = new Date(Date.now() - lookback * 86400000);
      const filter: Record<string, unknown> = {
        userId: "admin",
        date: { $gte: since },
      };
      if (type) filter.type = type;

      const entries = await HealthEntry.find(filter).sort({ date: -1 }).limit(50).lean();

      const byType: Record<string, number> = {};
      for (const e of entries) {
        byType[e.type] = (byType[e.type] || 0) + 1;
      }

      return {
        period: `Last ${lookback} days`,
        totalEntries: entries.length,
        byType,
        entries: entries.slice(0, 10).map(e => ({
          type: e.type,
          data: e.data,
          notes: e.notes,
          date: e.date,
          tags: e.tags,
        })),
      };
    },
  }),
};
