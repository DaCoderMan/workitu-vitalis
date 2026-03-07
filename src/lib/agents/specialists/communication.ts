import type { AgentConfig } from "../types";
import { COMMUNICATION_PROMPT } from "../prompts";
import { communicationTools } from "@/lib/tools/communication";

export const communicationAgent: AgentConfig = {
  slug: "communication",
  name: "Communication",
  description: "WhatsApp, contacts, CRM",
  color: "#F59E0B",
  tools: communicationTools,
  systemPrompt: COMMUNICATION_PROMPT,
};
