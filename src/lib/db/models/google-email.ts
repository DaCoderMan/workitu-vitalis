import mongoose, { Schema, models } from "mongoose";

export interface IGoogleEmail {
  userId: string;
  messageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  body?: string;
  labels: string[];
  date: Date;
  isRead: boolean;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleEmailSchema = new Schema<IGoogleEmail>(
  {
    userId: { type: String, required: true, index: true },
    messageId: { type: String, required: true },
    threadId: { type: String },
    from: { type: String, required: true },
    to: [{ type: String }],
    subject: { type: String, required: true },
    snippet: { type: String },
    body: { type: String },
    labels: [{ type: String }],
    date: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GoogleEmailSchema.index({ userId: 1, messageId: 1 }, { unique: true });
GoogleEmailSchema.index({ subject: "text", body: "text", from: "text", snippet: "text" });

export const GoogleEmail =
  models.GoogleEmail || mongoose.model<IGoogleEmail>("GoogleEmail", GoogleEmailSchema);
