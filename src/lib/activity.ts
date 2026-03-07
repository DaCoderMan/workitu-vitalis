import { connectDB } from "@/lib/db/connect";
import { Activity, type IActivity } from "@/lib/db/models/activity";

interface LogActivityInput {
  userId: string;
  type: IActivity["type"];
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity/notification for the user.
 * Lightweight helper — connects to DB and creates the document.
 */
export async function logActivity({
  userId,
  type,
  title,
  description,
  metadata,
}: LogActivityInput) {
  await connectDB();

  return Activity.create({
    userId,
    type,
    title,
    description,
    metadata,
    read: false,
  });
}
