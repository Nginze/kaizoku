import { Queue } from "bullmq";
import { bullMQConnection } from "./redis.js";

const opts = {
  connection: bullMQConnection,
};

export const embedQueue = new Queue("embed-queue", opts);
