import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL as string, {
	maxRetriesPerRequest: null,
});

export const cache = async (key: string, data: any): Promise<void> => {
	try {
		await redis.set(key, JSON.stringify(data));
	} catch (error) {
		throw error;
	}
};
