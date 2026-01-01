import "dotenv/config";
import "./config/bull";
import { jobQueue } from "./config/bull";
import { connectDB, disconnectDB } from "./config/mongo";

async function main() {
  try {
    await connectDB();

    // Job schedule patterns - configurable via environment variables with defaults
    const AIRING_SCHEDULE_CRON =
      process.env.AIRING_SCHEDULE_CRON || "0 0 * * *"; // Every day at midnight
    const RECENT_RELEASES_CRON =
      process.env.RECENT_RELEASES_CRON || "0 * * * *"; // Every hour
    const REQUESTED_EMBEDS_CRON =
      process.env.REQUESTED_EMBEDS_CRON || "*/5 * * * *"; // Every 5 minutes
    const SYNC_DB_CRON = process.env.SYNC_DB_CRON || "0 */6 * * *"; // Every 6 hours
    const TRENDING_RELEASES_CRON =
      process.env.TRENDING_RELEASES_CRON || "0 * * * *"; // Every hour

    console.log("📅 Job Schedules:");
    console.log(`  - Airing Schedule: ${AIRING_SCHEDULE_CRON}`);
    console.log(`  - Recent Releases: ${RECENT_RELEASES_CRON}`);
    console.log(`  - Requested Embeds: ${REQUESTED_EMBEDS_CRON}`);
    console.log(`  - Sync Database: ${SYNC_DB_CRON}`);
    console.log(`  - Trending Releases: ${TRENDING_RELEASES_CRON}\n`);

    //initialize repeatable jobs
    jobQueue.upsertJobScheduler(
      "airing-schedule-scheduler-id",
      {
        pattern: AIRING_SCHEDULE_CRON,
      },
      {
        name: "process-airing-schedule",
      }
    );
    jobQueue.upsertJobScheduler(
      "recent-releases-scheduler-id",
      {
        pattern: RECENT_RELEASES_CRON,
      },
      {
        name: "process-recent-releases",
      }
    );
    jobQueue.upsertJobScheduler(
      "requested-embeds-scheduler-id",
      {
        pattern: REQUESTED_EMBEDS_CRON,
      },
      {
        name: "process-requested-embeds",
      }
    );
    jobQueue.upsertJobScheduler(
      "sync-db-scheduler-id",
      {
        pattern: SYNC_DB_CRON,
      },
      {
        name: "sync-db-with-anilist",
      }
    );
    jobQueue.upsertJobScheduler(
      "trending-releases-scheduler-id",
      {
        pattern: TRENDING_RELEASES_CRON,
      },
      {
        name: "process-trending-releases",
      }
    );
  } catch (error) {
    await disconnectDB();
  }
}

main();
