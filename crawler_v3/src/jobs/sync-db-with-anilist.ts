import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import Anime from "../models/anime";
import { connectDB, disconnectDB } from "../config/mongo";
import { getAnilistIds, getBatchAnilistMetaFromIds } from "../utils/anilist";
import { logger } from "../config/logger";

const execAsync = promisify(exec);

// Fields from AniList that should be updated
const ANILIST_FIELDS = [
  "idAnilist",
  "idMal",
  "title",
  "coverImage",
  "bannerImage",
  "startDate",
  "endDate",
  "description",
  "season",
  "seasonYear",
  "type",
  "format",
  "status",
  "episodes",
  "duration",
  "chapters",
  "volumes",
  "genres",
  "synonyms",
  "source",
  "isAdult",
  "meanScore",
  "averageScore",
  "popularity",
  "favourites",
  "countryOfOrigin",
  "isLicensed",
  "relations",
  "trailer",
  "tags",
];

// Fields that should NEVER be modified (extra data not from AniList)
const PROTECTED_FIELDS = [
  "_id",
  "__v",
  "embedsSeeded",
  "embedsProgress",
  "createdAt",
  "updatedAt",
];

interface SyncStats {
  totalProcessed: number;
  newAnimeAdded: number;
  existingUpdated: number;
  unchanged: number;
  errors: number;
}

/**
 * Creates a backup of the MongoDB database in the backups folder
 */
async function backupDatabase(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupBaseDir = path.join(process.cwd(), "backups");
  const backupDir = path.join(backupBaseDir, `db-backup-${timestamp}`);

  logger.info(`Creating database backup at: ${backupDir}`);

  try {
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    // Get MongoDB connection details from environment
    const mongoUrl = process.env.MONGO_URL || "";

    // Run mongodump command
    const dumpCommand = `mongodump --uri="${mongoUrl}" --out="${backupDir}"`;

    logger.info("Running mongodump...");
    const { stdout, stderr } = await execAsync(dumpCommand);

    if (stderr && !stderr.includes("writing")) {
      logger.warn(`Backup warnings: ${stderr}`);
    }

    logger.info(`✅ Database backup completed successfully at: ${backupDir}`);
    return backupDir;
  } catch (error: any) {
    logger.error("❌ Database backup failed:", error.message);
    throw new Error(`Failed to backup database: ${error.message}`);
  }
}

/**
 * Extracts only AniList fields from the fetched data
 */
function extractAnilistData(anilistAnime: any): any {
  const extracted: any = {};

  for (const field of ANILIST_FIELDS) {
    if (anilistAnime[field] !== undefined) {
      extracted[field] = anilistAnime[field];
    }
  }

  return extracted;
}

/**
 * Checks if two anime objects have meaningful differences
 */
function hasChanges(existing: any, newData: any): boolean {
  for (const field of ANILIST_FIELDS) {
    const existingValue = JSON.stringify(existing[field]);
    const newValue = JSON.stringify(newData[field]);

    if (existingValue !== newValue) {
      return true;
    }
  }

  return false;
}

/**
 * Processes a batch of anime metadata
 */
async function processBatch(
  anilistBatch: any[],
  stats: SyncStats
): Promise<void> {
  const operations = [];

  for (const anilistAnime of anilistBatch) {
    try {
      if (!anilistAnime || !anilistAnime.idAnilist) {
        logger.warn("Skipping invalid anime data");
        stats.errors++;
        continue;
      }

      // Extract only AniList fields
      const anilistData = extractAnilistData(anilistAnime);

      // Find existing anime in database
      const existingAnime = await Anime.findOne({
        idAnilist: anilistAnime.idAnilist,
      }).lean();

      if (!existingAnime) {
        // New anime - insert with AniList data only
        operations.push({
          insertOne: {
            document: {
              ...anilistData,
              // Initialize protected fields for new anime
              embedsSeeded: false,
              embedsProgress: {
                lastProcessedEpisode: 0,
                failedEpisodes: [],
                completedEpisodes: [],
                status: "pending",
                lastUpdated: new Date(),
              },
            },
          },
        });
        stats.newAnimeAdded++;
      } else {
        // Existing anime - check if update is needed
        if (hasChanges(existingAnime, anilistData)) {
          // Preserve protected fields from existing document
          const protectedData: any = {};
          for (const field of PROTECTED_FIELDS) {
            if ((existingAnime as any)[field] !== undefined) {
              protectedData[field] = (existingAnime as any)[field];
            }
          }

          operations.push({
            updateOne: {
              filter: { idAnilist: anilistAnime.idAnilist },
              update: {
                $set: {
                  ...anilistData,
                  ...protectedData,
                },
              },
            },
          });
          stats.existingUpdated++;
        } else {
          stats.unchanged++;
        }
      }

      stats.totalProcessed++;
    } catch (error: any) {
      logger.error(
        `Error processing anime ${anilistAnime?.idAnilist}:`,
        error.message
      );
      stats.errors++;
    }
  }

  // Execute batch operations
  if (operations.length > 0) {
    try {
      await Anime.bulkWrite(operations, { ordered: false });
      logger.info(`✅ Processed batch: ${operations.length} operations`);
    } catch (error: any) {
      logger.error("Error executing bulk operations:", error.message);
      stats.errors += operations.length;
    }
  }
}

/**
 * Main sync metadata function
 */
export async function syncMetadata() {
  const startTime = Date.now();
  logger.info("=== Starting Metadata Sync ===");
  logger.info(`Started at: ${new Date().toISOString()}\n`);

  const stats: SyncStats = {
    totalProcessed: 0,
    newAnimeAdded: 0,
    existingUpdated: 0,
    unchanged: 0,
    errors: 0,
  };

  let backupPath: string | null = null;

  try {
    // Step 1: Backup database
    logger.info("Step 1/4: Backing up database...");
    backupPath = await backupDatabase();
    logger.info("");

    // Step 2: Connect to database
    logger.info("Step 2/4: Connecting to database...");
    await connectDB();
    logger.info("✅ Connected to MongoDB\n");

    // Step 3: Fetch AniList data
    logger.info("Step 3/4: Fetching data from AniList...");

    // Get all AniList IDs
    const anilistIds = await getAnilistIds();
    logger.info(`Found ${anilistIds.length} anime IDs from AniList\n`);

    // Step 4: Process in batches
    logger.info("Step 4/4: Processing and syncing metadata...");

    const BATCH_SIZE = 50; // AniList batch size

    // Fetch and process in batches
    for (let i = 0; i < anilistIds.length; i += BATCH_SIZE) {
      const idBatch = anilistIds.slice(i, i + BATCH_SIZE);
      const progress = ((i / anilistIds.length) * 100).toFixed(2);

      logger.info(
        `\nFetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          anilistIds.length / BATCH_SIZE
        )} (${progress}%)`
      );

      try {
        // Fetch batch from AniList
        const anilistBatch = await getBatchAnilistMetaFromIds(
          idBatch,
          BATCH_SIZE
        );

        // Process and update database
        await processBatch(anilistBatch, stats);

        // Small delay to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.error(`Error processing batch:`, error.message);
        stats.errors += idBatch.length;
      }
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    logger.info("\n=== Metadata Sync Complete ===");
    logger.info(`Duration: ${duration} minutes`);
    logger.info(`\nResults:`);
    logger.info(`  Total Processed: ${stats.totalProcessed}`);
    logger.info(`  New Anime Added: ${stats.newAnimeAdded}`);
    logger.info(`  Existing Updated: ${stats.existingUpdated}`);
    logger.info(`  Unchanged: ${stats.unchanged}`);
    logger.info(`  Errors: ${stats.errors}`);
    logger.info(`\nBackup Location: ${backupPath}`);
    logger.info("\n✅ All operations completed successfully!");
  } catch (error: any) {
    logger.error("\n❌ Metadata sync failed:", error.message);
    logger.error("\nStack trace:", error.stack);

    if (backupPath) {
      logger.info(`\nDatabase backup is available at: ${backupPath}`);
      logger.info("You can restore using: mongorestore <backup-path>");
    }

    throw error;
  } finally {
    // Cleanup
    await disconnectDB();
    logger.info("\n✅ Disconnected from MongoDB");
  }
}
