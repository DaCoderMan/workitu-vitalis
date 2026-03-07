import mongoose, { Schema, models } from "mongoose";

export interface IMessage {
  _id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["user", "assistant"] },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const Message =
  models.Message || mongoose.model<IMessage>("Message", MessageSchema);
