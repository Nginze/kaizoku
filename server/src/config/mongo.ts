import mongoose from "mongoose";

export const connectDB = async () => {
  console.log(process.env.MONGO_URL);
  try {
    await mongoose.connect(process.env.MONGO_URL as string);
  } catch (error) {
    throw error;
  }
};
