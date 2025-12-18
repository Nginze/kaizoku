import { redis } from "../config/redis";

export const cache = async (key: string, data: any): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(data));
  } catch (error) {
    throw error;
  }
};
