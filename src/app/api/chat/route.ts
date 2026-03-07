import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { getUser } from "@/lib/auth";
import { getRelevantKnowledge } from "@/lib/knowledge";
import { fastRouteCheck, classifyIntent } from "@/lib/agents/orchestrator";
import { getAgent } from "@/lib/agents";

const deepseek = createOpenAICompatible({
  name: "deepseek",
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const model = deepseek("deepseek-chat");

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json({ error: "AI service not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { messages } = body;
    if (!Array.isArray(messages)) {
      return Response.json({ error: "Invalid request: messages must be an array" }, { status: 400 });
    }

    // Extract the latest user message for routing + knowledge search
    const userMessages = messages.filter(
      (m: { role: string }) => m.role === "user"
    );
    const latestUserMsg = userMessages[userMessages.length - 1];
    const userText =
      latestUserMsg?.content ||
      latestUserMsg?.parts?.find(
        (p: { type: string }) => p.type === "text"
      )?.text ||
      "";

    // Fetch relevant knowledge to inject into context
    let knowledgeContext = "";
    try {
      knowledgeContext = await getRelevantKnowledge(userText);
    } catch {
      // Knowledge base might not be available yet
    }

    // --- Orchestrator: Route to specialist agent(s) ---

    // 1. Try fast keyword routing (~70% of messages, no LLM call)
    const fastRoute = fastRouteCheck(userText);

    let agentSlugs: string[];
    if (fastRoute) {
      agentSlugs = [fastRoute];
    } else {
      // 2. Fall back to LLM classification (~100 tokens)
      const routing = await classifyIntent(model, userText);
      agentSlugs = routing.agents;
    }

    const modelMessages = await convertToModelMessages(messages);

    // --- Stream with agent metadata ---
    const stream = createUIMessageStream({
      async execute({ writer }) {
        // Emit agent metadata so the client can show which agent responded
        const primarySlug = agentSlugs[0];
        writer.write({
          type: "message-metadata" as const,
          messageMetadata: { agentSlug: primarySlug },
        });

        if (agentSlugs.length === 1) {
          // Single agent path (90% of cases)
          const agent = getAgent(primarySlug as Parameters<typeof getAgent>[0]);
          const systemPrompt = agent.systemPrompt + knowledgeContext;

          const result = streamText({
            model,
            system: systemPrompt,
            messages: modelMessages,
            tools: agent.tools,
            stopWhen: stepCountIs(5),
          });

          writer.merge(result.toUIMessageStream());
        } else {
          // Multi-agent path (sequential streaming)
          for (const slug of agentSlugs) {
            const agent = getAgent(slug as Parameters<typeof getAgent>[0]);
            const systemPrompt = agent.systemPrompt + knowledgeContext;

            const result = streamText({
              model,
              system: systemPrompt,
              messages: modelMessages,
              tools: agent.tools,
              stopWhen: stepCountIs(3),
            });

            writer.merge(result.toUIMessageStream());
          }
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
