import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/mongodb.js";
import userModel from "../models/userModel.js";

const email = process.argv[2]?.trim().toLowerCase();

const promoteUserToAdmin = async () => {
  if (!email) {
    throw new Error("Usage: npm run make-admin -- user@example.com");
  }

  await connectDB();

  const user = await userModel.findOneAndUpdate(
    { email },
    { $set: { role: 'admin' } },
    { new: true }
  ).select('name email role');

  if (!user) {
    throw new Error(`No user found for ${email}`);
  }

  console.log(`Admin role granted to ${user.email}`);
};

promoteUserToAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
