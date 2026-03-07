import { tool } from "ai";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Knowledge } from "@/lib/db/models/knowledge";
import { GoogleFile } from "@/lib/db/models/google-file";
import { GoogleEmail } from "@/lib/db/models/google-email";

export const knowledgeTools = {
  search_knowledge: tool({
    description:
      "Search the knowledge base for information about the user, their business, preferences, or any stored facts. Use this when you need context about the user.",
    inputSchema: z.object({
      query: z.string().describe("What to search for"),
    }),
    execute: async ({ query }) => {
      await connectDB();
      try {
        const results = await Knowledge.find(
          { $text: { $search: query } },
          { score: { $meta: "textScore" } }
        )
          .sort({ score: { $meta: "textScore" } })
          .limit(5)
          .lean();

        if (results.length > 0) {
          return results.map((r) => ({
            category: r.category,
            title: r.title,
            content: r.content,
          }));
        }

        const words = query.split(/\s+/).filter((w) => w.length > 2);
        const regex = words.map((w) => new RegExp(w, "i"));
        const fallback = await Knowledge.find({
          $or: [
            { title: { $in: regex } },
            { content: { $in: regex } },
            { tags: { $in: regex } },
          ],
        })
          .limit(5)
          .lean();

        return fallback.length > 0
          ? fallback.map((r) => ({
              category: r.category,
              title: r.title,
              content: r.content,
            }))
          : "No relevant knowledge found.";
      } catch {
        return "Knowledge search unavailable.";
      }
    },
  }),

  add_knowledge: tool({
    description:
      "Save a new fact, preference, or piece of information to the knowledge base so you can remember it in future conversations.",
    inputSchema: z.object({
      category: z
        .enum([
          "personal",
          "business",
          "finance",
          "health",
          "preferences",
          "contacts",
          "projects",
          "goals",
        ])
        .describe("Category for the knowledge entry"),
      title: z.string().describe("Short title for this entry"),
      content: z.string().describe("The information to remember"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Optional tags for easier search"),
    }),
    execute: async ({ category, title, content, tags }) => {
      await connectDB();
      await Knowledge.create({ category, title, content, tags: tags || [] });
      return `Saved to knowledge base: "${title}" in ${category}`;
    },
  }),

  remember_preference: tool({
    description:
      "Save a user preference or learned behavior to improve future interactions. Use this when you notice a pattern or the user explicitly states a preference.",
    inputSchema: z.object({
      category: z
        .enum(["communication", "workflow", "tools", "schedule", "content", "other"])
        .describe("Preference category"),
      preference: z.string().describe("What was learned about the user"),
      confidence: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe("How confident you are about this preference"),
    }),
    execute: async ({ category, preference, confidence }) => {
      await connectDB();
      await Knowledge.create({
        category: "preferences",
        title: `${category} preference`,
        content: preference,
        tags: ["learned", category, confidence || "medium"],
      });
      return `Preference saved: "${preference}" (${category}, confidence: ${confidence || "medium"})`;
    },
  }),

  search_vault: tool({
    description:
      "Search the Obsidian vault for notes, documents, and knowledge. Use this to find project docs, daily notes, or any stored information.",
    inputSchema: z.object({
      query: z.string().optional().describe("Text to search for in notes"),
      tag: z.string().optional().describe("Filter by tag (e.g. 'project', 'daily')"),
      folder: z.string().optional().describe("Filter by folder path"),
    }),
    execute: async ({ query, tag, folder }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        return await vpsPost("/api/vault/search", {
          query: query || "",
          tag: tag || "",
          folder: folder || "",
        });
      } catch (e) {
        return `Vault error: ${e instanceof Error ? e.message : "VPS not available"}`;
      }
    },
  }),

  read_vault_note: tool({
    description:
      "Read a specific note from the Obsidian vault by its path.",
    inputSchema: z.object({
      path: z.string().describe("Path to the note (e.g. 'projects/my-project.md')"),
    }),
    execute: async ({ path }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        return await vpsPost("/api/vault/read", { path });
      } catch (e) {
        return `Vault error: ${e instanceof Error ? e.message : "VPS not available"}`;
      }
    },
  }),

  create_vault_note: tool({
    description:
      "Create a new note in the Obsidian vault. Use this to save documents, project notes, or any structured content.",
    inputSchema: z.object({
      path: z.string().describe("File path in vault (e.g. 'projects/new-project.md')"),
      content: z.string().describe("Markdown content of the note"),
      title: z.string().optional().describe("Note title (for frontmatter)"),
      tags: z.array(z.string()).optional().describe("Tags for the note"),
    }),
    execute: async ({ path, content, title, tags }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        return await vpsPost("/api/vault/create", { path, content, title, tags });
      } catch (e) {
        return `Vault error: ${e instanceof Error ? e.message : "VPS not available"}`;
      }
    },
  }),

  list_vault_notes: tool({
    description:
      "List notes in a folder of the Obsidian vault.",
    inputSchema: z.object({
      folder: z.string().optional().describe("Folder to list (e.g. 'projects', 'context/daily')"),
      tag: z.string().optional().describe("Filter by tag"),
    }),
    execute: async ({ folder, tag }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        return await vpsPost("/api/vault/list", {
          folder: folder || "",
          tag: tag || "",
          recursive: true,
        });
      } catch (e) {
        return `Vault error: ${e instanceof Error ? e.message : "VPS not available"}`;
      }
    },
  }),

  search_obsidian: tool({
    description:
      "Search the Obsidian vault on the VPS for notes by content, tag, or folder. Similar to search_vault but with more focus on Obsidian-specific features.",
    inputSchema: z.object({
      query: z.string().optional().describe("Search text"),
      tag: z.string().optional().describe("Obsidian tag to filter by"),
      folder: z.string().optional().describe("Vault folder path"),
    }),
    execute: async ({ query, tag, folder }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        return await vpsPost("/api/vault/search", {
          query: query || "",
          tag: tag || "",
          folder: folder || "",
        });
      } catch (e) {
        return `Obsidian error: ${e instanceof Error ? e.message : "VPS not available"}`;
      }
    },
  }),

  search_google_drive: tool({
    description:
      "Search the user's indexed Google Drive files by name or content. Use this to find documents, spreadsheets, presentations, or any files the user has in their Drive.",
    inputSchema: z.object({
      query: z.string().describe("What to search for in Drive files"),
    }),
    execute: async ({ query }) => {
      await connectDB();
      try {
        const results = await GoogleFile.find(
          { userId: "admin", $text: { $search: query } },
          { score: { $meta: "textScore" } }
        )
          .sort({ score: { $meta: "textScore" } })
          .limit(10)
          .lean();

        if (results.length === 0) return "No matching Drive files found.";
        return results.map((f) => ({
          name: f.name,
          type: f.mimeType,
          modified: f.modifiedTime,
          link: f.webViewLink,
          snippet: f.content?.slice(0, 200),
        }));
      } catch {
        return "Google Drive search unavailable. Files may not be synced yet.";
      }
    },
  }),

  search_gmail: tool({
    description:
      "Search the user's indexed Gmail messages by subject, body, or sender. Use this to find emails, threads, or correspondence.",
    inputSchema: z.object({
      query: z.string().describe("What to search for in emails"),
    }),
    execute: async ({ query }) => {
      await connectDB();
      try {
        const results = await GoogleEmail.find(
          { userId: "admin", $text: { $search: query } },
          { score: { $meta: "textScore" } }
        )
          .sort({ score: { $meta: "textScore" } })
          .limit(10)
          .lean();

        if (results.length === 0) return "No matching emails found.";
        return results.map((e) => ({
          from: e.from,
          subject: e.subject,
          date: e.date,
          snippet: e.snippet || e.body?.slice(0, 200),
          isRead: e.isRead,
        }));
      } catch {
        return "Gmail search unavailable. Emails may not be synced yet.";
      }
    },
  }),

  get_email_detail: tool({
    description:
      "Get the full content of a specific email by its subject or a unique search term. Use after search_gmail to read the full email body.",
    inputSchema: z.object({
      subject: z.string().describe("Exact or partial subject line to find"),
    }),
    execute: async ({ subject }) => {
      await connectDB();
      try {
        const email = await GoogleEmail.findOne({
          userId: "admin",
          subject: { $regex: subject, $options: "i" },
        })
          .sort({ date: -1 })
          .lean();

        if (!email) return "Email not found.";
        return {
          from: email.from,
          to: email.to,
          subject: email.subject,
          date: email.date,
          body: email.body?.slice(0, 5000) || email.snippet,
          labels: email.labels,
        };
      } catch {
        return "Could not retrieve email.";
      }
    },
  }),

  create_daily_note: tool({
    description:
      "Create or append to today's daily note in Obsidian. Use this to log activities, thoughts, or session summaries.",
    inputSchema: z.object({
      content: z.string().describe("Content to add to today's daily note"),
    }),
    execute: async ({ content }) => {
      try {
        const { vpsPost } = await import("@/lib/vps-client");
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jerusalem" });
        return await vpsPost("/api/vault/daily", {
          date: today,
          append_content: content,
        });
      } catch (e) {
        return `Obsidian error: ${e instanceof Error ? e.message : "VPS not available"}`;
      }
    },
  }),
};
