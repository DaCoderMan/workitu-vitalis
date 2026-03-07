import type { AgentConfig } from "../types";
import { PRODUCTIVITY_PROMPT } from "../prompts";
import { productivityTools } from "@/lib/tools/productivity";

export const productivityAgent: AgentConfig = {
  slug: "productivity",
  name: "Productivity",
  description: "Tasks, email, calendar, briefings, automations",
  color: "#3B82F6",
  tools: productivityTools,
  systemPrompt: PRODUCTIVITY_PROMPT,
};
