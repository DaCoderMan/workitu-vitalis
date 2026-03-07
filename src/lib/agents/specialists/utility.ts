import type { AgentConfig } from "../types";
import { UTILITY_PROMPT } from "../prompts";
import { utilityTools } from "@/lib/tools/utility";

export const utilityAgent: AgentConfig = {
  slug: "utility",
  name: "Utility",
  description: "Time, health, code gen, web scraping, VPS, general",
  color: "#6B7280",
  tools: utilityTools,
  systemPrompt: UTILITY_PROMPT,
};
