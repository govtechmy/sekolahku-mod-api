import mongoose from "mongoose";
import { env } from "./env";

export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
}


