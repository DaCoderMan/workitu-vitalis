import mongoose, { Schema, type Document } from "mongoose";

export interface IHealthEntry extends Document {
  userId: string;
  date: Date;
  type: "workout" | "meal" | "sleep" | "mood" | "weight" | "medication" | "symptom" | "note";
  data: Record<string, unknown>;
  tags: string[];
  notes?: string;
  createdAt: Date;
}

const HealthEntrySchema = new Schema<IHealthEntry>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["workout", "meal", "sleep", "mood", "weight", "medication", "symptom", "note"],
    },
    data: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    notes: { type: String },
  },
  { timestamps: true }
);

HealthEntrySchema.index({ userId: 1, date: -1, type: 1 });

export const HealthEntry =
  mongoose.models.HealthEntry ||
  mongoose.model<IHealthEntry>("HealthEntry", HealthEntrySchema);
