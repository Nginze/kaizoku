import { logger } from "../config/logger";
import { processAiringList } from "./process-airing-schedule";
import { processRecentReleases } from "./process-recent-releases";
import { processRequestedEmbeds } from "./process-requested-embeds";
import { syncMetadata } from "./sync-db-with-anilist";

export interface Job {
  name: string;
  data?: any;
}

/**
 * Handles job execution based on job name
 * Routes to the appropriate job function
 */
export async function handleJob(job: Job): Promise<void> {
  const { name, data } = job;

  logger.info(`= Starting job: ${name}`);
  const startTime = Date.now();

  try {
    switch (name) {
      case "process-airing-schedule":
      case "airing-list-task":
        logger.info("Running airing schedule job...");
        await processAiringList();
        break;

      case "process-recent-releases":
      case "recent-releases-task":
      case "rss-feed-task":
        logger.info("Running recent releases job...");
        await processRecentReleases();
        break;

      case "process-requested-embeds":
      case "requested-embeds-task":
        logger.info("Running requested embeds job...");
        await processRequestedEmbeds(data);
        break;

      case "sync-db-with-anilist":
      case "sync-metadata-task":
        logger.info("Running database sync job...");
        await syncMetadata();
        break;

      default:
        logger.warn(`Unknown job type: ${name}`);
        throw new Error(`Unknown job type: ${name}`);
    }

    const duration = Date.now() - startTime;
    logger.info(` Job completed: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(
      `L Job failed: ${name} (${duration}ms)`,
      error?.message || error
    );
    throw error;
  }
}

/**
 * Export all job functions for direct use
 */
export {
  processAiringList,
  processRecentReleases,
  processRequestedEmbeds,
  syncMetadata,
};
