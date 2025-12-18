import { Queue, Worker } from "bullmq";
import { redis } from "./redis";
import { handleJob } from "../jobs";
import { logger } from "./logger";

const opts = {
  connection: redis,
};

export const jobQueue = new Queue("job-queue", opts);

export const jobWorker = new Worker(
  "job-queue",
  async (job: any) => {
    await handleJob(job);
  },
  { ...opts, concurrency: 3 }
);

jobWorker.on("ready", () => {
  logger.info("Job worker is ready");
});

jobWorker.on("completed", (job) => {
  logger.info(`Job completed: ${job.name} (ID: ${job.id})`);
});

jobWorker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job?.name} (ID: ${job?.id})`);

  console.log(err);
});
