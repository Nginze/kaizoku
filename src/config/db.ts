import Redis from "ioredis";
import mongoose from "mongoose";

export const redis = new Redis(process.env.REDIS_URL as string);

export const connectDB = async () => {
  console.log(process.env.MONGO_URL);
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
  } catch (error) {
    console.log(error);
  }
};
