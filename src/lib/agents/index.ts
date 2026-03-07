import type { AgentConfig, AgentSlug } from "./types";
import { financeAgent } from "./specialists/finance";
import { productivityAgent } from "./specialists/productivity";
import { knowledgeAgent } from "./specialists/knowledge";
import { communicationAgent } from "./specialists/communication";
import { utilityAgent } from "./specialists/utility";

export type { AgentSlug, AgentConfig, RoutingResult } from "./types";
export { AGENT_META, RIA_AGENT } from "./meta";

export const AGENT_REGISTRY: Record<AgentSlug, AgentConfig> = {
  finance: financeAgent,
  productivity: productivityAgent,
  knowledge: knowledgeAgent,
  communication: communicationAgent,
  utility: utilityAgent,
};

export function getAgent(slug: AgentSlug): AgentConfig {
  return AGENT_REGISTRY[slug] || AGENT_REGISTRY.utility;
}
