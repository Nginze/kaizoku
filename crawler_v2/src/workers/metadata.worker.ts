import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { syncMetadata } from "../jobs/sync-metadata";

const metadataWorker = new Worker(
  "metadata-queue",
  async (job) => {
    await syncMetadata();
  },
  {
    connection: redis,
  }
);
metadataWorker.on("ready", () => {
  console.log("Metadata worker is ready to process jobs");
});

metadataWorker.on("completed", (job) => {
  console.log(`Metadata sync job with id ${job.id} completed`);
});

metadataWorker.on("failed", (job, err) => {
  console.log(
    `Metadata sync job with id ${job?.id} failed with error ${err.message}`
  );
});

export default metadataWorker;
