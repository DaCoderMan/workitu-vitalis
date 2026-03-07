import type { AgentConfig } from "../types";
import { KNOWLEDGE_PROMPT } from "../prompts";
import { knowledgeTools } from "@/lib/tools/knowledge";

export const knowledgeAgent: AgentConfig = {
  slug: "knowledge",
  name: "Knowledge",
  description: "Knowledge base, Obsidian vault, preferences",
  color: "#8B5CF6",
  tools: knowledgeTools,
  systemPrompt: KNOWLEDGE_PROMPT,
};
