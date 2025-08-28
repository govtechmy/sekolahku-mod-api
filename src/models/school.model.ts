import { Schema, model } from "mongoose";
import type { SchoolEntity } from "@/types/schema";

const GeoPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

const SchoolSchema = new Schema<SchoolEntity>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    level: { type: String },
    typeLabel: { type: String },
    admin: {
      state: { type: String },
      ppd: { type: String },
      parliament: { type: String },
      dun: { type: String },
    },
    mailingAddress: {
      line: { type: String },
      postcode: { type: String },
      city: { type: String },
      state: { type: String },
    },
    contacts: {
      phones: [{ type: String }],
      fax: [{ type: String }],
      emails: [{ type: String }],
    },
    grade: { type: String },
    assistance: { type: String },
    sessions: {
      count: { type: Number },
      labels: [{ type: String }],
    },
    enrolment: {
      preschool: { type: Number },
      total: { type: Number },
      specialNeeds: { type: Number },
    },
    staffing: {
      teachers: { type: Number },
    },
    facilities: {
      hasPreschool: { type: Boolean },
      integration: { type: Boolean },
    },
    geo: { type: GeoPointSchema },
    skmLe150: { type: Boolean },
    meta: {
      raw: { type: Schema.Types.Mixed },
      sourceRowId: { type: String },
      ingestedAt: { type: Date },
    },
  },
  { timestamps: true }
);

SchoolSchema.index({ code: 1 }, { unique: true });
SchoolSchema.index({ geo: "2dsphere" });

export const SchoolModel = model<SchoolEntity>("School", SchoolSchema);


