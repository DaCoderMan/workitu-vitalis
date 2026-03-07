import type { AgentConfig } from "../types";
import { FINANCE_PROMPT } from "../prompts";
import { financeTools } from "@/lib/tools/finance";

export const financeAgent: AgentConfig = {
  slug: "finance",
  name: "Finance",
  description: "Money, invoices, revenue pipeline, XP, analytics",
  color: "#10B981",
  tools: financeTools,
  systemPrompt: FINANCE_PROMPT,
};
