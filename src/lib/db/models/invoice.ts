import mongoose, { Schema, type Document } from "mongoose";

export interface IInvoice extends Document {
  userId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issuedDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
      },
    ],
    currency: { type: String, default: "ILS" },
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    issuedDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ userId: 1, status: 1 });

export const Invoice =
  mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);
