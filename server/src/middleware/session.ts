import type { SessionOptions } from "express-session";
import { redis } from "../config/redis";
import { RedisStore } from "connect-redis";

const REDIS_STORE = new RedisStore({
	client: redis,
	prefix: "anidb:",
});

const session: SessionOptions = {
	secret: "secret",
	resave: false,
	store: REDIS_STORE,
	saveUninitialized: true,
	cookie: {
		maxAge: 72 * 60 * 60 * 1000,
	},
};

export { session };
