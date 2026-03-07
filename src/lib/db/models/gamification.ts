import mongoose, { Schema, type Document } from "mongoose";

export interface IXPEvent extends Document {
  userId: string;
  action: string;
  xp: number;
  description: string;
  category: "revenue" | "task" | "session" | "client" | "streak" | "other";
  createdAt: Date;
}

const XPEventSchema = new Schema<IXPEvent>(
  {
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    xp: { type: Number, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      required: true,
      enum: ["revenue", "task", "session", "client", "streak", "other"],
    },
  },
  { timestamps: true }
);

XPEventSchema.index({ userId: 1, createdAt: -1 });

export const XPEvent =
  mongoose.models.XPEvent ||
  mongoose.model<IXPEvent>("XPEvent", XPEventSchema);

// XP thresholds and level names
const LEVELS = [
  { level: 1, name: "Spark", threshold: 0 },
  { level: 2, name: "Flame", threshold: 500 },
  { level: 3, name: "Fire", threshold: 1500 },
  { level: 4, name: "Blaze", threshold: 3000 },
  { level: 5, name: "Inferno", threshold: 5000 },
  { level: 6, name: "Supernova", threshold: 8000 },
  { level: 7, name: "Legend", threshold: 12000 },
  { level: 8, name: "Titan", threshold: 18000 },
  { level: 9, name: "Empire", threshold: 25000 },
  { level: 10, name: "Immortal", threshold: 35000 },
];

export function getLevelInfo(totalXP: number) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].threshold) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    totalXP,
    toNextLevel: nextLevel ? nextLevel.threshold - totalXP : 0,
    nextLevelName: nextLevel?.name || "MAX",
    progress: nextLevel
      ? ((totalXP - currentLevel.threshold) /
          (nextLevel.threshold - currentLevel.threshold)) *
        100
      : 100,
  };
}

// XP amounts per action
export const XP_VALUES: Record<string, { xp: number; category: IXPEvent["category"] }> = {
  revenue_action: { xp: 50, category: "revenue" },
  client_call: { xp: 100, category: "client" },
  client_signed: { xp: 300, category: "client" },
  task_shipped: { xp: 20, category: "task" },
  session_completed: { xp: 10, category: "session" },
  streak_bonus: { xp: 50, category: "streak" },
};
