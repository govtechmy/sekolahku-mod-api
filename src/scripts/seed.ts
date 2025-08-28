import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectToDatabase } from "../config/db";
import { UserModel } from "../models/user.model";

async function seedUsers() {
  const users = [
    { name: "Alice Johnson", idNumber: "U1001", role: "admin", username: "alice", password: await bcrypt.hash("password123", 10) },
    { name: "Bob Smith", idNumber: "U1002", role: "editor", username: "bob", password: await bcrypt.hash("password123", 10) },
    { name: "Charlie Davis", idNumber: "U1003", role: "viewer", username: "charlie", password: await bcrypt.hash("password123", 10) },
  ];

  for (const user of users) {
    await UserModel.updateOne(
      { idNumber: user.idNumber },
      { $setOnInsert: user },
      { upsert: true }
    );
  }
}

async function main() {
  try {
    await connectToDatabase();
    await seedUsers();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();



