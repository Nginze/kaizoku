import { Worker } from "bullmq";
import { processRequestedEmbeds } from "../jobs/process-requested-embeds";
import { logger } from "../config/logger";
import { redis } from "../config/redis";

const embedWorker = new Worker(
  "embed-queue",
  async (job) => {
    await processRequestedEmbeds(job.data);
  },
  {
    connection: redis,
  }
);

embedWorker.on("completed", (job) => {
  logger.info(`Processed pending embeds for job with id ${job.id}`);
});

embedWorker.on("failed", (job, err) => {
  logger.info(`Job with id ${job?.id} has failed with error ${err.message}`);
});

export default embedWorker;
