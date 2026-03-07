import type { ToolSet } from "ai";

export type AgentSlug = "finance" | "productivity" | "knowledge" | "communication" | "utility";

export interface AgentConfig {
  slug: AgentSlug;
  name: string;
  description: string;
  color: string;
  tools: ToolSet;
  systemPrompt: string;
}

export interface RoutingResult {
  agents: AgentSlug[];
  reason: string;
}
