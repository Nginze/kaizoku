import { Worker } from "bullmq";
import { processRequestedEmbeds } from "../jobs/process-requested-embeds.js";
import { logger } from "../config/logger.js";
import { bullMQConnection } from "../config/redis.js";

const embedWorker = new Worker(
  "embed-queue",
  async (job) => {
    await processRequestedEmbeds(job.data);
  },
  {
    connection: bullMQConnection,
  }
);

embedWorker.on("completed", (job) => {
  logger.info(`Processed pending embeds for job with id ${job.id}`);
});

embedWorker.on("failed", (job, err) => {
  logger.info(`Job with id ${job?.id} has failed with error ${err.message}`);
});

export default embedWorker;
