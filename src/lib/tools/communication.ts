import { tool } from "ai";
import { z } from "zod";
import { connectDB } from "@/lib/db/connect";
import { Contact } from "@/lib/db/models/contact";
import { Conversation } from "@/lib/db/models/conversation";

export const communicationTools = {
  send_whatsapp: tool({
    description:
      "Send a WhatsApp message to a phone number. Use this when the user wants to message someone on WhatsApp.",
    inputSchema: z.object({
      to: z.string().describe("Phone number with country code (e.g. +972501234567)"),
      message: z.string().describe("Message text to send"),
    }),
    execute: async ({ to, message }) => {
      const token = process.env.WHATSAPP_API_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_ID;
      if (!token || !phoneId) return "WhatsApp not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_ID.";

      try {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/${phoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { body: message },
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          return `WhatsApp error: ${err.error?.message || "Unknown"}`;
        }

        const data = await res.json();
        return { status: "sent", messageId: data.messages?.[0]?.id };
      } catch (e) {
        return `WhatsApp error: ${e instanceof Error ? e.message : "unknown"}`;
      }
    },
  }),

  add_contact: tool({
    description:
      "Add a new contact to the CRM. Use this when the user mentions a new person, lead, or client.",
    inputSchema: z.object({
      name: z.string().describe("Contact name"),
      email: z.string().optional().describe("Email address"),
      phone: z.string().optional().describe("Phone number"),
      company: z.string().optional().describe("Company name"),
      role: z.string().optional().describe("Role/title"),
      type: z
        .enum(["lead", "client", "partner", "personal", "vendor", "other"])
        .optional()
        .describe("Contact type (default: other)"),
      notes: z.string().optional().describe("Notes about this contact"),
      source: z.string().optional().describe("Where you met them"),
    }),
    execute: async ({ name, email, phone, company, role, type, notes, source }) => {
      await connectDB();
      const contact = await Contact.create({
        userId: "admin",
        name,
        email,
        phone,
        company,
        role,
        type: type || "other",
        notes: notes || "",
        source,
      });
      return {
        message: `Contact "${name}" added`,
        id: contact._id,
        type: contact.type,
      };
    },
  }),

  search_contacts: tool({
    description:
      "Search contacts by name, email, company, or type. Use this to find people in the CRM.",
    inputSchema: z.object({
      query: z.string().optional().describe("Search term (name, email, or company)"),
      type: z
        .enum(["lead", "client", "partner", "personal", "vendor", "other"])
        .optional()
        .describe("Filter by contact type"),
    }),
    execute: async ({ query, type }) => {
      await connectDB();
      const filter: Record<string, unknown> = { userId: "admin" };
      if (type) filter.type = type;

      let contacts;
      if (query) {
        contacts = await Contact.find({
          ...filter,
          $or: [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
            { company: { $regex: query, $options: "i" } },
          ],
        })
          .limit(10)
          .lean();
      } else {
        contacts = await Contact.find(filter).sort({ updatedAt: -1 }).limit(10).lean();
      }

      return contacts.map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        type: c.type,
        notes: c.notes?.substring(0, 100),
      }));
    },
  }),

  update_contact: tool({
    description:
      "Update a contact's information. Use this to change contact details, add notes, or change their type/status.",
    inputSchema: z.object({
      id: z.string().describe("Contact ID"),
      updates: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        role: z.string().optional(),
        type: z.enum(["lead", "client", "partner", "personal", "vendor", "other"]).optional(),
        status: z.enum(["active", "inactive", "archived"]).optional(),
        notes: z.string().optional(),
      }).describe("Fields to update"),
    }),
    execute: async ({ id, updates }) => {
      await connectDB();
      const contact = await Contact.findOneAndUpdate(
        { _id: id, userId: "admin" },
        { $set: updates },
        { new: true }
      );
      if (!contact) return "Contact not found.";
      return `Contact "${contact.name}" updated.`;
    },
  }),

  count_conversations: tool({
    description: "Check how many conversations have been had with Ria.",
    inputSchema: z.object({}),
    execute: async () => {
      await connectDB();
      const count = await Conversation.countDocuments({ userId: "admin" });
      return { totalConversations: count };
    },
  }),
};
