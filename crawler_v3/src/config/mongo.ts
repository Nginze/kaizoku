import mongoose from "mongoose";

export const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URL as string);

  console.log("✅ Connected to MongoDB");
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log("✅ Disconnected from MongoDB");
};
