import mongoose, { Schema, models } from "mongoose";

export interface ISubscription {
  _id: string;
  userId: string;
  plan: "free" | "pro";
  status: "active" | "cancelled" | "expired";
  paypalSubscriptionId?: string;
  currentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    plan: { type: String, required: true, default: "free", enum: ["free", "pro"] },
    status: {
      type: String,
      required: true,
      default: "active",
      enum: ["active", "cancelled", "expired"],
    },
    paypalSubscriptionId: { type: String },
    currentPeriodEnd: { type: Date },
  },
  { timestamps: true }
);

export const Subscription =
  models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
