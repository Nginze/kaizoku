import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { AnilistService } from "../services/anilist.services";
import Anime from "../models/anime";
import { connectDB, disconnectDB } from "../config/mongo";

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
 * Creates a backup of the MongoDB database
 */
async function backupDatabase(): Promise<string> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const backupDir = path.join(process.cwd(), `db-backup-${timestamp}`);

	console.log(`Creating database backup at: ${backupDir}`);

	try {
		// Ensure backup directory exists
		await fs.mkdir(backupDir, { recursive: true });

		// Get MongoDB connection details from environment
		const mongoUrl = process.env.MONGO_URL || "";
		const dbName = mongoUrl.split("/").pop()?.split("?")[0] || "anidb";

		// Run mongodump command
		const dumpCommand = `mongodump --uri="${mongoUrl}" --out="${backupDir}"`;

		console.log("Running mongodump...");
		const { stdout, stderr } = await execAsync(dumpCommand);

		if (stderr && !stderr.includes("writing")) {
			console.warn("Backup warnings:", stderr);
		}

		console.log(` Database backup completed successfully at: ${backupDir}`);
		return backupDir;
	} catch (error: any) {
		console.error(" Database backup failed:", error.message);
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
				console.warn("Skipping invalid anime data");
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
						if (existingAnime[field] !== undefined) {
							protectedData[field] = existingAnime[field];
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
			console.error(
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
			console.log(` Processed batch: ${operations.length} operations`);
		} catch (error: any) {
			console.error("Error executing bulk operations:", error.message);
			stats.errors += operations.length;
		}
	}
}

/**
 * Main sync metadata function
 */
export async function syncMetadata() {
	const startTime = Date.now();
	console.log("=== Starting Metadata Sync ===");
	console.log(`Started at: ${new Date().toISOString()}\n`);

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
		console.log("Step 1/4: Backing up database...");
		backupPath = await backupDatabase();
		console.log();

		// Step 2: Connect to database
		console.log("Step 2/4: Connecting to database...");
		await connectDB();
		console.log(" Connected to MongoDB\n");

		// Step 3: Fetch AniList data
		console.log("Step 3/4: Fetching data from AniList...");
		const anilistService = new AnilistService();

		// Get all AniList IDs
		const anilistIds = await anilistService.getAnilistIds();
		console.log(`Found ${anilistIds.length} anime IDs from AniList\n`);

		// Step 4: Process in batches
		console.log("Step 4/4: Processing and syncing metadata...");

		const BATCH_SIZE = 50; // AniList batch size
		const PROCESS_BATCH_SIZE = 50; // How many to process before database write

		// Fetch and process in batches
		for (let i = 0; i < anilistIds.length; i += BATCH_SIZE) {
			const idBatch = anilistIds.slice(i, i + BATCH_SIZE);
			const progress = ((i / anilistIds.length) * 100).toFixed(2);

			console.log(
				`\nFetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(anilistIds.length / BATCH_SIZE)} (${progress}%)`
			);

			try {
				// Fetch batch from AniList
				const anilistBatch = await anilistService.getBatchAnilistMetaFromIds(
					idBatch,
					BATCH_SIZE
				);

				// Process and update database
				await processBatch(anilistBatch, stats);

				// Small delay to avoid overwhelming the system
				await new Promise((resolve) => setTimeout(resolve, 100));
			} catch (error: any) {
				console.error(`Error processing batch:`, error.message);
				stats.errors += idBatch.length;
			}
		}

		// Final summary
		const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

		console.log("\n=== Metadata Sync Complete ===");
		console.log(`Duration: ${duration} minutes`);
		console.log(`\nResults:`);
		console.log(`  Total Processed: ${stats.totalProcessed}`);
		console.log(`  New Anime Added: ${stats.newAnimeAdded}`);
		console.log(`  Existing Updated: ${stats.existingUpdated}`);
		console.log(`  Unchanged: ${stats.unchanged}`);
		console.log(`  Errors: ${stats.errors}`);
		console.log(`\nBackup Location: ${backupPath}`);
		console.log("\n All operations completed successfully!");
	} catch (error: any) {
		console.error("\n Metadata sync failed:", error.message);
		console.error("\nStack trace:", error.stack);

		if (backupPath) {
			console.log(
				`\nDatabase backup is available at: ${backupPath}`
			);
			console.log("You can restore using: mongorestore <backup-path>");
		}

		throw error;
	} finally {
		// Cleanup
		await disconnectDB();
		console.log("\n Disconnected from MongoDB");
	}
}

// Run if executed directly
if (require.main === module) {
	syncMetadata()
		.then(() => {
			console.log("\nSync completed successfully");
			process.exit(0);
		})
		.catch((error) => {
			console.error("\nSync failed:", error);
			process.exit(1);
		});
}
