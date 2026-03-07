import mongoose, { Schema, type Document } from "mongoose";

export interface IAutomation extends Document {
  userId: string;
  name: string;
  schedule: string; // cron expression or "daily", "weekly"
  timezone: string;
  action: "email_report" | "clickup_summary" | "briefing" | "custom";
  config: Record<string, string>;
  lastRunAt?: Date;
  lastRunStatus?: "success" | "failure";
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationSchema = new Schema<IAutomation>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    schedule: { type: String, required: true },
    timezone: { type: String, default: "Asia/Jerusalem" },
    action: {
      type: String,
      required: true,
      enum: ["email_report", "clickup_summary", "briefing", "custom"],
    },
    config: { type: Schema.Types.Mixed, default: {} },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ["success", "failure"] },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Automation =
  mongoose.models.Automation ||
  mongoose.model<IAutomation>("Automation", AutomationSchema);
