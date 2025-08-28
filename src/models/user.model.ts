import { Schema, model } from "mongoose";
import type { UserEntity } from "@/types/schema";
import { ROLES } from "@/types/schema";

const UserSchema = new Schema<UserEntity>(
  {
    name: { type: String, required: true },
    idNumber: { type: String, required: true, unique: true },
    role: { type: String, required: true, enum: ROLES },
    email: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

export const UserModel = model<UserEntity>("User", UserSchema);


