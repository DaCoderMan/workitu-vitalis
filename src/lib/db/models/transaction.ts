import mongoose, { Schema, type Document } from "mongoose";

export interface ITransaction extends Document {
  userId: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: Date;
  recurring: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  tags: string[];
  source?: string; // e.g. "client:acme", "freelance", "arnona"
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["income", "expense"] },
    amount: { type: Number, required: true },
    currency: { type: String, default: "ILS" },
    category: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true, index: true },
    recurring: { type: Boolean, default: false },
    recurringFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
    },
    tags: { type: [String], default: [] },
    source: { type: String },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });

export const Transaction =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
