import "dotenv/config";
import "./config/bull";
import { jobQueue } from "./config/bull";
import { connectDB, disconnectDB } from "./config/mongo";

function main() {
  try {
    connectDB();
    //initialize repeatable jobs
    jobQueue.upsertJobScheduler(
      "airing-schedule-scheduler-id",
      {
        pattern: "0 0 * * *", // Every day at midnight
      },
      {
        name: "process-airing-schedule",
      }
    );
    jobQueue.upsertJobScheduler(
      "recent-releases-scheduler-id",
      {
        pattern: "0 * * * *", // Every hour
      },
      {
        name: "process-recent-releases",
      }
    );
    jobQueue.upsertJobScheduler(
      "requested-embeds-scheduler-id",
      {
        pattern: "*/5 * * * *", // Every 5 minutes
      },
      {
        name: "process-requested-embeds",
      }
    );
    jobQueue.upsertJobScheduler(
      "sync-db-scheduler-id",
      {
        pattern: "0 */6 * * *", // Every 6 hours
      },
      {
        name: "sync-db-with-anilist",
      }
    );
  } catch (error) {
    disconnectDB();
  }
}

main();
