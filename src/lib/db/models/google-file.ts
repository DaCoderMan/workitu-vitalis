import mongoose, { Schema, models } from "mongoose";

export interface IGoogleFile {
  userId: string;
  googleId: string;
  name: string;
  mimeType: string;
  content?: string;
  parentId?: string;
  webViewLink?: string;
  modifiedTime: Date;
  size?: number;
  shared: boolean;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleFileSchema = new Schema<IGoogleFile>(
  {
    userId: { type: String, required: true, index: true },
    googleId: { type: String, required: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    content: { type: String },
    parentId: { type: String },
    webViewLink: { type: String },
    modifiedTime: { type: Date },
    size: { type: Number },
    shared: { type: Boolean, default: false },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

GoogleFileSchema.index({ userId: 1, googleId: 1 }, { unique: true });
GoogleFileSchema.index({ name: "text", content: "text" });

export const GoogleFile =
  models.GoogleFile || mongoose.model<IGoogleFile>("GoogleFile", GoogleFileSchema);
