import type { SessionOptions } from "express-session";
import { redis } from "../config/redis.js";
import { RedisStore } from "connect-redis";

const REDIS_STORE = new RedisStore({
	client: redis,
	prefix: "anidb:",
	ttl: 72 * 60 * 60, // 72 hours in seconds (not milliseconds)
});

const session: SessionOptions = {
	secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
	resave: false,
	store: REDIS_STORE,
	saveUninitialized: false,
	cookie: {
		maxAge: 72 * 60 * 60 * 1000, // 72 hours in milliseconds
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
	},
};

export { session };
