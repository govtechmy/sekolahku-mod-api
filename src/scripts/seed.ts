import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { connectToDatabase } from "../config/db";
import { UserModel } from "../models/user.model";
import { DocumentModel } from "../models/document.model";

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
    await seedDocuments();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
async function seedDocuments() {
  const users = await UserModel.find({}, { _id: 1 }).lean();
  if (users.length === 0) return;
  const userIds = users.map(u => u._id).filter(Boolean) as mongoose.Types.ObjectId[];
  if (userIds.length === 0) return;

  const sampleTypes = ["report", "memo", "guide", "policy"];
  const sampleTags = ["finance", "hr", "engineering", "legal", "ops"];

  const documents = Array.from({ length: 10 }).map((_, i) => {
    const idx = Math.floor(Math.random() * userIds.length);
    const creator = userIds[idx % userIds.length]!;
    const type = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
    const tagCount = 1 + Math.floor(Math.random() * 3);
    const tags = Array.from({ length: tagCount }).map(
      () => sampleTags[Math.floor(Math.random() * sampleTags.length)]
    );

    return {
      title: `Sample Document ${i + 1}`,
      content: `This is a sample content block for document ${i + 1}.`,
      tags,
      type,
      isApproved: Math.random() > 0.5,
      version: `v${1 + Math.floor(Math.random() * 5)}.0`,
      url: `https://example.com/docs/${i + 1}`,
      createdBy: creator,
    };
  });

  await DocumentModel.insertMany(documents, { ordered: false });
}



