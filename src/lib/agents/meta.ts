/**
 * Client-safe agent metadata — no tool imports, no mongoose.
 * Import this from client components instead of the main agents index.
 */

export const AGENT_META: Record<string, { name: string; color: string }> = {
  finance: { name: "Finance", color: "#10B981" },
  productivity: { name: "Productivity", color: "#3B82F6" },
  knowledge: { name: "Knowledge", color: "#8B5CF6" },
  communication: { name: "Communication", color: "#F59E0B" },
  utility: { name: "Utility", color: "#6B7280" },
};

export const RIA_AGENT = {
  slug: "ria",
  name: "Ria",
  description: "Your AI Chief of Staff — knows everything, handles everything",
  icon: "Bot",
  color: "#F59E0B",
};
