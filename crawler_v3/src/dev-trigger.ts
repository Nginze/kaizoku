#!/usr/bin/env tsx
/**
 * Development script to manually trigger jobs
 *
 * Usage:
 *   pnpm dev:job recent-releases
 *   pnpm dev:job airing-schedule
 *   pnpm dev:job requested-embeds
 *   pnpm dev:job sync-db
 */

import "dotenv/config";
import { connectDB, disconnectDB } from "./config/mongo";
import { handleJob } from "./jobs";
import { logger } from "./config/logger";

const jobNameMap: Record<string, string> = {
  "recent-releases": "process-recent-releases",
  "airing-schedule": "process-airing-schedule",
  "requested-embeds": "process-requested-embeds",
  "sync-db": "sync-db-with-anilist",
  "trending-releases": "process-trending-releases",
};

async function main() {
  const jobArg = process.argv[2];

  if (!jobArg) {
    console.log(`
🚀 Job Trigger - Available Jobs:

  pnpm dev:job recent-releases    - Fetch and cache recent anime releases
  pnpm dev:job airing-schedule    - Update airing schedule
  pnpm dev:job requested-embeds   - Process requested embeds queue
  pnpm dev:job sync-db            - Sync database with AniList
  pnpm dev:job trending-releases  - Fetch daily and weekly trending anime

Example: pnpm dev:job recent-releases
    `);
    process.exit(0);
  }

  const jobName = jobNameMap[jobArg] || jobArg;

  logger.info(`🎯 Manually triggering job: ${jobName}`);

  try {
    await connectDB();
    await handleJob({ name: jobName });
    logger.info(`✅ Job completed successfully`);
  } catch (error: any) {
    logger.error(`❌ Job failed:`, error?.message || error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

main();
