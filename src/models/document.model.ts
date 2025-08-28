import { Schema, model, Types } from "mongoose";
import type { DocumentEntity } from "@/types/schema";

const DocumentSchema = new Schema<DocumentEntity>(
  {
    title: { type: String, required: true },
    content: { type: String },
    tags: [{ type: String }],
    type: { type: String },
    isApproved: { type: Boolean },
    version: { type: String },
    url: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const DocumentModel = model<DocumentEntity>("Document", DocumentSchema);


