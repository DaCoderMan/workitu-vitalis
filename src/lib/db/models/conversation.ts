import mongoose, { Schema, models } from "mongoose";

export interface IConversation {
  _id: string;
  userId: string;
  agentSlug: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, required: true, index: true },
    agentSlug: { type: String, required: true },
    title: { type: String, required: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, agentSlug: 1 });

export const Conversation =
  models.Conversation || mongoose.model<IConversation>("Conversation", ConversationSchema);
