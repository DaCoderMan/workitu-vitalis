import { connectDB } from "@/lib/db/connect";
import mongoose, { Schema, models } from "mongoose";

interface IUsage {
  userId: string;
  date: string;
  count: number;
}

const UsageSchema = new Schema<IUsage>({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  count: { type: Number, default: 0 },
});

UsageSchema.index({ userId: 1, date: 1 }, { unique: true });

const Usage = models.Usage || mongoose.model<IUsage>("Usage", UsageSchema);

const FREE_DAILY_LIMIT = 20;

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function checkUsage(
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  await connectDB();

  // TODO: check subscription status for Pro users (unlimited)
  const date = todayString();
  const record = await Usage.findOne({ userId, date });
  const used = record?.count ?? 0;

  return {
    allowed: used < FREE_DAILY_LIMIT,
    used,
    limit: FREE_DAILY_LIMIT,
  };
}

export async function incrementUsage(userId: string): Promise<void> {
  await connectDB();
  const date = todayString();

  await Usage.findOneAndUpdate(
    { userId, date },
    { $inc: { count: 1 } },
    { upsert: true }
  );
}
