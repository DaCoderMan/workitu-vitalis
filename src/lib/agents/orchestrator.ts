import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { AgentSlug, RoutingResult } from "./types";
import { ORCHESTRATOR_PROMPT } from "./prompts";

const VALID_SLUGS: AgentSlug[] = ["finance", "productivity", "knowledge", "communication", "utility"];

/**
 * Fast keyword-based routing — handles ~70% of messages without an LLM call.
 */
export function fastRouteCheck(text: string): AgentSlug | null {
  const lower = text.toLowerCase();

  if (/\b(invoice|expense|income|transaction|revenue|lead|pipeline|₪|shekel|xp|analytics|billing|paid|payment|arnona|btl)\b/.test(lower))
    return "finance";

  if (/\b(task|clickup|email|gmail|calendar|schedule|meeting|briefing|automation|remind|deadline|agenda)\b/.test(lower))
    return "productivity";

  if (/\b(vault|obsidian|knowledge|note|remember|preference|document)\b/.test(lower))
    return "knowledge";

  if (/\b(whatsapp|contact|crm|phone|call\s+\w+)\b/.test(lower))
    return "communication";

  if (/\b(workout|exercise|sleep|mood|health|weight|medication|code|scrape|vps|server|generate)\b/.test(lower))
    return "utility";

  return null;
}

/**
 * LLM-based intent classification for ambiguous messages.
 * Uses a lightweight generateText call (~100 tokens).
 */
export async function classifyIntent(
  model: LanguageModel,
  userText: string,
): Promise<RoutingResult> {
  try {
    const { text } = await generateText({
      model,
      system: ORCHESTRATOR_PROMPT,
      prompt: `User message: ${userText}`,
      maxOutputTokens: 100,
    });

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { agents: ["utility"], reason: "no JSON in classification response" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const agents = (parsed.agents || [])
      .filter((a: string) => VALID_SLUGS.includes(a as AgentSlug))
      .slice(0, 2) as AgentSlug[];

    if (agents.length === 0) {
      return { agents: ["utility"], reason: parsed.reason || "no valid agents" };
    }

    return { agents, reason: parsed.reason || "" };
  } catch {
    return { agents: ["utility"], reason: "classification failed, using fallback" };
  }
}
