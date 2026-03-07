import mongoose, { Schema, type Document } from "mongoose";

export interface IContact extends Document {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  type: "lead" | "client" | "partner" | "personal" | "vendor" | "other";
  status: "active" | "inactive" | "archived";
  notes: string;
  tags: string[];
  lastContactedAt?: Date;
  source?: string; // where did we meet them
  socialLinks?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    role: { type: String },
    type: {
      type: String,
      required: true,
      enum: ["lead", "client", "partner", "personal", "vendor", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    notes: { type: String, default: "" },
    tags: { type: [String], default: [] },
    lastContactedAt: { type: Date },
    source: { type: String },
    socialLinks: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ContactSchema.index({ name: "text", email: "text", company: "text", notes: "text" });

export const Contact =
  mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", ContactSchema);
