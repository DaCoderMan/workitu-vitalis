import { tool } from "ai";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Automation } from "@/lib/db/models/automation";

export const productivityTools = {
  create_clickup_task: tool({
    description:
      "Create a new task in ClickUp. Use this when the user wants to add a task, todo, or action item.",
    inputSchema: z.object({
      name: z.string().describe("Task name"),
      description: z.string().optional().describe("Task description"),
      priority: z
        .enum(["urgent", "high", "normal", "low"])
        .optional()
        .describe("Task priority"),
      due_date: z
        .string()
        .optional()
        .describe("Due date in YYYY-MM-DD format"),
    }),
    execute: async ({ name, description, priority, due_date }) => {
      const token = process.env.CLICKUP_API_TOKEN;
      if (!token) return "ClickUp not configured — no API token.";

      const listId = process.env.CLICKUP_DAILY_TASKS_LIST || "901816199648";
      const priorityMap: Record<string, number> = {
        urgent: 1,
        high: 2,
        normal: 3,
        low: 4,
      };

      try {
        const body: Record<string, unknown> = { name };
        if (description) body.description = description;
        if (priority) body.priority = priorityMap[priority];
        if (due_date) body.due_date = new Date(due_date).getTime();

        const res = await fetch(
          `https://api.clickup.com/api/v2/list/${listId}/task`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          return `Failed to create task: ${err}`;
        }

        const task = await res.json();
        return {
          message: `Task created: "${name}"`,
          id: task.id,
          url: task.url,
        };
      } catch (e) {
        return `ClickUp error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  list_clickup_tasks: tool({
    description:
      "List tasks from ClickUp. Shows overdue, due today, or recent tasks.",
    inputSchema: z.object({
      filter: z
        .enum(["overdue", "due_today", "recent"])
        .optional()
        .describe("Filter type — defaults to recent"),
    }),
    execute: async ({ filter = "recent" }) => {
      const token = process.env.CLICKUP_API_TOKEN;
      if (!token) return "ClickUp not configured — no API token.";

      const teamId = process.env.CLICKUP_TEAM_ID || "90182449313";
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      try {
        let url = `https://api.clickup.com/api/v2/team/${teamId}/task?subtasks=true&include_closed=false&order_by=due_date`;

        if (filter === "overdue") {
          url += `&due_date_lt=${now}&statuses[]=open&statuses[]=in progress`;
        } else if (filter === "due_today") {
          url += `&due_date_gt=${todayStart.getTime()}&due_date_lt=${now + 86400000}`;
        }

        url += "&page=0";

        const res = await fetch(url, {
          headers: { Authorization: token },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          return `ClickUp API error: ${res.status}`;
        }

        const data = await res.json();
        const tasks = (data.tasks || []).slice(0, 10);

        return tasks.map(
          (t: {
            name: string;
            status: { status: string };
            priority: { priority: string } | null;
            due_date: string | null;
            url: string;
          }) => ({
            name: t.name,
            status: t.status?.status,
            priority: t.priority?.priority || "none",
            due: t.due_date
              ? new Date(parseInt(t.due_date)).toLocaleDateString()
              : null,
            url: t.url,
          })
        );
      } catch (e) {
        return `ClickUp error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  send_email: tool({
    description:
      "Send an email or create a draft via Gmail. Use this when the user wants to email someone.",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body text"),
      draft_only: z
        .boolean()
        .optional()
        .describe("If true, creates a draft instead of sending"),
    }),
    execute: async ({ to, subject, body, draft_only }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        const result = await vpsPost("/api/gmail/send", {
          to,
          subject,
          body,
          draft_only: draft_only || false,
        });
        return result;
      } catch (e) {
        return `Email error: ${e instanceof Error ? e.message : "VPS proxy not available"}`;
      }
    },
  }),

  read_emails: tool({
    description:
      "Search and read recent emails from Gmail. Use this to check inbox, find specific emails, or get unread messages.",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Gmail search query (e.g. 'is:unread', 'from:david', 'subject:invoice')"),
      max_results: z
        .number()
        .optional()
        .describe("Maximum number of emails to return (default 5)"),
    }),
    execute: async ({ query, max_results }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        const result = await vpsPost("/api/gmail/search", {
          query: query || "is:unread",
          max_results: max_results || 5,
        });
        return result;
      } catch (e) {
        return `Email error: ${e instanceof Error ? e.message : "VPS proxy not available"}`;
      }
    },
  }),

  list_calendar_events: tool({
    description:
      "List upcoming calendar events. Use this to check today's schedule or upcoming meetings.",
    inputSchema: z.object({
      days_ahead: z
        .number()
        .optional()
        .describe("Number of days ahead to look (default 1 = today)"),
    }),
    execute: async ({ days_ahead }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        const result = await vpsPost("/api/gcal/events", {
          days_ahead: days_ahead || 1,
        });
        return result;
      } catch (e) {
        return `Calendar error: ${e instanceof Error ? e.message : "VPS proxy not available"}`;
      }
    },
  }),

  create_calendar_event: tool({
    description:
      "Create a new calendar event. Use this when the user wants to schedule a meeting or block time.",
    inputSchema: z.object({
      title: z.string().describe("Event title"),
      date: z.string().describe("Date in YYYY-MM-DD format"),
      start_time: z.string().describe("Start time in HH:MM format (24h, Israel time)"),
      end_time: z.string().describe("End time in HH:MM format (24h, Israel time)"),
      description: z.string().optional().describe("Event description"),
      attendees: z
        .array(z.string())
        .optional()
        .describe("List of attendee email addresses"),
    }),
    execute: async ({ title, date, start_time, end_time, description, attendees }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        const result = await vpsPost("/api/gcal/create", {
          title,
          date,
          start_time,
          end_time,
          description,
          attendees,
        });
        return result;
      } catch (e) {
        return `Calendar error: ${e instanceof Error ? e.message : "VPS proxy not available"}`;
      }
    },
  }),

  get_daily_briefing: tool({
    description:
      "Get today's daily briefing generated by the autonomous agent on the VPS. Contains overdue tasks, calendar events, and status updates.",
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const today = new Date().toLocaleDateString("sv-SE", {
          timeZone: "Asia/Jerusalem",
        });
        const url = `https://raw.githubusercontent.com/DaCoderMan/workitu-bee-brain/main/context/daily/${today}.md`;

        const res = await fetch(url);
        if (res.ok) {
          const content = await res.text();
          return { date: today, briefing: content };
        }

        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(
          "sv-SE",
          { timeZone: "Asia/Jerusalem" }
        );
        const yesterdayUrl = `https://raw.githubusercontent.com/DaCoderMan/workitu-bee-brain/main/context/daily/${yesterday}.md`;
        const yesterdayRes = await fetch(yesterdayUrl);
        if (yesterdayRes.ok) {
          const content = await yesterdayRes.text();
          return { date: yesterday, briefing: content, note: "This is yesterday's briefing" };
        }

        return "No recent briefing found. The VPS agent may not have run yet today.";
      } catch {
        return "Could not fetch daily briefing.";
      }
    },
  }),

  create_task: tool({
    description:
      "Create a new task in ClickUp with numeric priority. Use this when the user wants to quickly add a task, todo, or action item.",
    inputSchema: z.object({
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      priority: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .describe("Priority: 1=urgent, 2=high, 3=normal, 4=low"),
      due_date: z
        .string()
        .optional()
        .describe("Due date in YYYY-MM-DD format"),
    }),
    execute: async ({ title, description, priority, due_date }) => {
      const token = process.env.CLICKUP_API_TOKEN;
      if (!token) return "ClickUp not configured — no API token.";

      const listId =
        process.env.CLICKUP_DAILY_TASKS_LIST || "901816199648";

      try {
        const body: Record<string, unknown> = { name: title };
        if (description) body.description = description;
        if (priority) body.priority = priority;
        if (due_date) body.due_date = new Date(due_date).getTime();

        const res = await fetch(
          `https://api.clickup.com/api/v2/list/${listId}/task`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10_000),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          return `Failed to create task: ${err}`;
        }

        const task = await res.json();
        return {
          message: `Task created: "${title}"`,
          id: task.id,
          url: task.url,
        };
      } catch (e) {
        return `ClickUp error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  create_calendar_event_direct: tool({
    description:
      "Create a new Google Calendar event directly via Google API. Use this to schedule meetings, block time, or add events to the calendar.",
    inputSchema: z.object({
      title: z.string().describe("Event title"),
      start_time: z.string().describe("Start time as ISO 8601 string (e.g. 2026-03-05T10:00:00)"),
      end_time: z
        .string()
        .optional()
        .describe("End time as ISO 8601 string. Defaults to start_time + 1 hour if omitted."),
      description: z.string().optional().describe("Event description"),
    }),
    execute: async ({ title, start_time, end_time, description }) => {
      try {
        const { getCalendarClient } = await import("@/lib/google-api");
        const calendar = await getCalendarClient();
        if (!calendar) {
          return "Google Calendar not connected — user not authenticated or missing credentials.";
        }

        const startDate = new Date(start_time);
        let endDate: Date;
        if (end_time) {
          endDate = new Date(end_time);
        } else {
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour
        }

        const res = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: title,
            description: description || "",
            start: { dateTime: startDate.toISOString(), timeZone: "Asia/Jerusalem" },
            end: { dateTime: endDate.toISOString(), timeZone: "Asia/Jerusalem" },
          },
        });

        return {
          message: `Calendar event created: "${title}"`,
          id: res.data.id,
          start: res.data.start?.dateTime || res.data.start?.date,
          end: res.data.end?.dateTime || res.data.end?.date,
          link: res.data.htmlLink,
        };
      } catch (e) {
        return `Calendar error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  draft_email: tool({
    description:
      "Create a Gmail draft. Use this when the user wants to draft an email for later review before sending.",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body text (plain text)"),
    }),
    execute: async ({ to, subject, body }) => {
      try {
        const { getGmailClient } = await import("@/lib/google-api");
        const gmail = await getGmailClient();
        if (!gmail) {
          return "Gmail not connected — user not authenticated or missing credentials.";
        }

        // Build RFC 2822 message
        const message = [
          `To: ${to}`,
          `Subject: ${subject}`,
          "Content-Type: text/plain; charset=utf-8",
          "",
          body,
        ].join("\r\n");

        // Base64url encode
        const raw = Buffer.from(message)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        const res = await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: { raw },
          },
        });

        return {
          message: `Draft created: "${subject}" → ${to}`,
          draftId: res.data.id,
          messageId: res.data.message?.id,
        };
      } catch (e) {
        return `Gmail error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  create_automation: tool({
    description:
      "Create a scheduled automation. Use this when the user wants to set up recurring tasks like daily reports, briefing checks, or summary emails.",
    inputSchema: z.object({
      name: z.string().describe("Name of the automation"),
      schedule: z
        .string()
        .describe("Schedule — cron expression (e.g. '0 8 * * *') or keyword ('daily', 'weekly')"),
      action: z
        .enum(["email_report", "clickup_summary", "briefing", "custom"])
        .describe("Type of action to perform"),
      config: z
        .record(z.string(), z.string())
        .optional()
        .describe("Configuration for the action (e.g. email recipient, report type)"),
    }),
    execute: async ({ name, schedule, action, config }) => {
      await connectDB();
      try {
        const automation = await Automation.create({
          userId: "admin",
          name,
          schedule,
          action,
          config: config || {},
          enabled: true,
        });
        return {
          message: `Automation "${name}" created`,
          id: automation._id,
          schedule,
          action,
        };
      } catch (e) {
        return `Automation error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  list_automations: tool({
    description:
      "List all scheduled automations. Use this when the user asks about their automations or scheduled tasks.",
    inputSchema: z.object({}),
    execute: async () => {
      await connectDB();
      const automations = await Automation.find({ userId: "admin" })
        .sort({ createdAt: -1 })
        .lean();
      return automations.map((a) => ({
        id: a._id,
        name: a.name,
        schedule: a.schedule,
        action: a.action,
        enabled: a.enabled,
        lastRun: a.lastRunAt || null,
        lastStatus: a.lastRunStatus || null,
      }));
    },
  }),

  toggle_automation: tool({
    description:
      "Enable or disable an automation by its ID.",
    inputSchema: z.object({
      id: z.string().describe("Automation ID"),
      enabled: z.boolean().describe("Set to true to enable, false to disable"),
    }),
    execute: async ({ id, enabled }) => {
      await connectDB();
      const result = await Automation.findOneAndUpdate(
        { _id: id, userId: "admin" },
        { $set: { enabled } },
        { new: true }
      );
      if (!result) return "Automation not found.";
      return `Automation "${result.name}" ${enabled ? "enabled" : "disabled"}.`;
    },
  }),
};
