import { Queue } from "bullmq";
import { redis } from "./redis.js";

const opts = {
  connection: redis,
};

export const embedQueue = new Queue("embed-queue", opts);
