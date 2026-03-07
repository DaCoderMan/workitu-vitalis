import mongoose, { Schema, type Document as MongoDoc } from "mongoose";

export interface IDocument extends MongoDoc {
  userId: string;
  title: string;
  path: string; // vault path e.g. "projects/my-project.md"
  content: string;
  tags: string[];
  category: "note" | "project" | "template" | "briefing" | "custom";
  source: "vault" | "manual" | "agent";
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    path: { type: String, required: true },
    content: { type: String, default: "" },
    tags: { type: [String], default: [] },
    category: {
      type: String,
      required: true,
      enum: ["note", "project", "template", "briefing", "custom"],
      default: "note",
    },
    source: {
      type: String,
      enum: ["vault", "manual", "agent"],
      default: "manual",
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

DocumentSchema.index({ title: "text", content: "text", tags: "text" });

export const Document =
  mongoose.models.Document ||
  mongoose.model<IDocument>("Document", DocumentSchema);
