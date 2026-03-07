import mongoose, { Schema, models } from "mongoose";

export interface IKnowledge {
  _id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeSchema = new Schema<IKnowledge>(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
  },
  { timestamps: true }
);

// Text index for search
KnowledgeSchema.index({ title: "text", content: "text", tags: "text" });

export const Knowledge =
  models.Knowledge ||
  mongoose.model<IKnowledge>("Knowledge", KnowledgeSchema);
