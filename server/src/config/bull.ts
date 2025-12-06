import { Queue } from "bullmq";
import { redis } from "./redis";

const opts = {
  connection: redis,
};

export const embedQueue = new Queue("embed-queue", opts);
