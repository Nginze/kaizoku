import mongoose from "mongoose";

export const connectDB = async () => {
	await mongoose.connect(process.env.MONGO_URL as string);
};

export const disconnectDB = async () => {
	await mongoose.disconnect();
};
