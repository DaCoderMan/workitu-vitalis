import mongoose, { Schema, type Document } from "mongoose";

export interface IActivity extends Document {
  userId: string;
  type:
    | "xp_earned"
    | "task_completed"
    | "invoice_paid"
    | "contact_added"
    | "health_logged"
    | "google_synced"
    | "system";
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "xp_earned",
        "task_completed",
        "invoice_paid",
        "contact_added",
        "health_logged",
        "google_synced",
        "system",
      ],
    },
    title: { type: String, required: true },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ActivitySchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Activity =
  mongoose.models.Activity ||
  mongoose.model<IActivity>("Activity", ActivitySchema);
