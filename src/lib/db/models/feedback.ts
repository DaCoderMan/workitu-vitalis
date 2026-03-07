import mongoose, { Schema, type Document } from "mongoose";

export interface IFeedback extends Document {
  userId: string;
  messageId: string;
  conversationId: string;
  rating: "positive" | "negative";
  category?: "helpful" | "accurate" | "creative" | "wrong" | "unhelpful" | "other";
  comment?: string;
  toolUsed?: string;
  userQuery: string;
  assistantResponse: string;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, required: true, index: true },
    messageId: { type: String, required: true },
    conversationId: { type: String, required: true },
    rating: { type: String, required: true, enum: ["positive", "negative"] },
    category: {
      type: String,
      enum: ["helpful", "accurate", "creative", "wrong", "unhelpful", "other"],
    },
    comment: { type: String },
    toolUsed: { type: String },
    userQuery: { type: String, default: "" },
    assistantResponse: { type: String, default: "" },
  },
  { timestamps: true }
);

FeedbackSchema.index({ userId: 1, createdAt: -1 });

export const Feedback =
  mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);
