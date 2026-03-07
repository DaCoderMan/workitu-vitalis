import { connectDB } from "@/lib/db/connect";
import { Knowledge } from "@/lib/db/models/knowledge";

/**
 * Search the knowledge base for entries relevant to the user's message.
 * Returns formatted context string to inject into the system prompt.
 */
export async function getRelevantKnowledge(
  userMessage: string
): Promise<string> {
  await connectDB();

  // Extract keywords from the message (simple approach)
  const words = userMessage
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (words.length === 0) {
    // Just return all knowledge if message is short
    const all = await Knowledge.find({}).sort({ updatedAt: -1 }).limit(20).lean();
    if (all.length === 0) return "";
    return formatKnowledge(all);
  }

  // Try text search first
  try {
    const textResults = await Knowledge.find(
      { $text: { $search: words.join(" ") } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10)
      .lean();

    if (textResults.length > 0) {
      return formatKnowledge(textResults);
    }
  } catch {
    // Text index might not exist yet, fall through
  }

  // Fallback: regex search on tags and content
  const regexPattern = words.map((w) => new RegExp(w, "i"));
  const results = await Knowledge.find({
    $or: [
      { tags: { $in: regexPattern } },
      { content: { $in: regexPattern } },
      { title: { $in: regexPattern } },
    ],
  })
    .limit(10)
    .lean();

  if (results.length > 0) {
    return formatKnowledge(results);
  }

  // Last resort: return recent entries for general context
  const recent = await Knowledge.find({}).sort({ updatedAt: -1 }).limit(10).lean();
  return formatKnowledge(recent);
}

function formatKnowledge(
  entries: Array<{ category: string; title: string; content: string }>
): string {
  if (entries.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(`${entry.title}: ${entry.content}`);
  }

  let context = "\n\n--- KNOWLEDGE BASE ---\n";
  for (const [category, items] of Object.entries(grouped)) {
    context += `\n[${category.toUpperCase()}]\n`;
    for (const item of items) {
      context += `- ${item}\n`;
    }
  }
  context += "--- END KNOWLEDGE ---";

  return context;
}
