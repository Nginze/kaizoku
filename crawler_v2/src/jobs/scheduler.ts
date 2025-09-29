import { Queue, Worker } from "bullmq";
import { redis, cache } from "../config/redis";
import { logger } from "../config/logger";
import axios from "axios";
import * as cheerio from "cheerio";
import Anime from "../models/anime";
import { HianimeService } from "../services/hianime.services";
import { AnilistService } from "../services/anilist.services";

// Create a queue for scheduled jobs
const schedulerQueue = new Queue("scheduler", { connection: redis });

// Parse RSS feed and extract relevant data
const parseRSSFeed = async (rssUrl: string) => {
	try {
		const response = await axios.get(rssUrl);
		const $ = cheerio.load(response.data, { xmlMode: true });

		const items: any[] = [];
		$("item").each((_, element) => {
			const title = $(element).find("title").text();
			const link = $(element).find("link").text();
			const description = $(element).find("description").text();
			const enclosureUrl = $(element).find("enclosure").attr("url");
			const pubDate = $(element).find("pubDate").text();

			// Extract malId from link (number in URL)
			const malIdMatch = link.match(/\/(\d+)/);
			const malId = malIdMatch ? malIdMatch[1] : null;

			// Convert pubDate to ISO format
			let formattedPubDate = null;
			if (pubDate) {
				try {
					formattedPubDate = new Date(pubDate).toISOString();
				} catch (error) {
					logger.warn(`Failed to parse pubDate: ${pubDate}`);
				}
			}

			// Extract episode number from epInfo (before the slash)
			let epNo = null;
			if (description) {
				const epMatch = description.match(/EP (\d+)/);
				if (epMatch) {
					epNo = parseInt(epMatch[1], 10);
				}
			}

			if (title && malId) {
				items.push({
					title,
					malId,
					image: enclosureUrl || null,
					epInfo: description,
					pubDate: formattedPubDate,
					epNo,
				});
			}
		});

		// Augment items with database data
		const augmentedItems = [];
		for (const item of items) {
			try {
				// Query MongoDB for anime data using malId
				const anime = await Anime.findOne({ idMal: parseInt(item.malId) });
				
				if (anime) {
					const augmentedItem = {
						...anime.toObject(),
						extras: {
							provider: "kuroiru",
							title: item.title,
							malId: item.malId,
							image: item.image,
							epInfo: item.epInfo,
							pubDate: item.pubDate,
							epNo: item.epNo
						}
					};
					augmentedItems.push(augmentedItem);
				} else {
					// If no anime found in DB, use scraped data as main with empty extras
					augmentedItems.push({
						...item,
						extras: {
							provider: "kuroiru"
						}
					});
				}
			} catch (error) {
				logger.warn(`Failed to augment item ${item.title} with database data:`, error);
				// Add item without extras if database query fails
				augmentedItems.push({
					...item,
					extras: {
						provider: "kuroiru"
					}
				});
			}
		}

		return augmentedItems;
	} catch (error) {
		logger.error("Failed to parse RSS feed:", error);
		throw error;
	}
};

// Process recent releases and get episode embeds
const processRecentReleases = async (feedData: any[]) => {
	const hianimeService = new HianimeService();
	const anilistService = new AnilistService();

	for (const release of feedData) {
		try {
			const { malId, epNo, title } = release;

			if (!malId || !epNo) {
				logger.warn(`Skipping release ${title}: missing malId or epNo`);
				continue;
			}

			// Get anilistId from MongoDB using malId
			let anime = await Anime.findOne({ idMal: parseInt(malId) });
			let anilistId: string;

			if (!anime) {
				logger.warn(
					`Anime not found in DB for MAL ID: ${malId}, trying Anilist API fallback`,
				);

				// Fallback: Get metadata from Anilist API using MAL ID
				try {
					const anilistMeta =
						await anilistService.getAnilistMetaFromMalId(malId);
					if (anilistMeta) {
						anilistId = anilistMeta.idAnilist.toString();
						logger.info(
							`Found anime via Anilist API: ${title} (AnilistID: ${anilistId})`,
						);
					} else {
						logger.warn(`Anime not found in Anilist API for MAL ID: ${malId}`);
						continue;
					}
				} catch (anilistError) {
					logger.error(
						`Anilist API fallback failed for MAL ID ${malId}:`,
						anilistError,
					);
					continue;
				}
			} else {
				anilistId = anime.idAnilist!.toString();
			}

			// logger.info(
			// 	`Processing ${title} - Episode ${epNo} (AnilistID: ${anilistId})`,
			// );
			//
			// // Get episode embeds
			// await hianimeService.getStreamingEpisodeEmbedById(epNo, anilistId);

			logger.info(`✅ Processed embeds for ${title} Episode ${epNo}`);
		} catch (error) {
			// logger.error(`Error processing release ${release.title}:`, error);
			console.log(error);
		}
	}
};

const processAiringList = async () => {
	try {
		logger.info("🔄 Fetching airing list from kuroiru.co");

		const response = await axios.get("https://kuroiru.co/app");
		const $ = cheerio.load(response.data);

		// Find script tags and extract airingList variable
		let airingList = null;
		$("script").each((_, element) => {
			const scriptContent = $(element).html();
			if (scriptContent && scriptContent.includes("var airingList")) {
				// Extract the airingList object from the script
				const match = scriptContent.match(/var airingList\s*=\s*({.*?});/s);
				if (match) {
					try {
						const airingListData = JSON.parse(match[1]);
						airingList = airingListData.airing;
					} catch (parseError) {
						logger.error("Failed to parse airingList JSON:", parseError);
					}
				}
			}
		});

		if (!airingList || !Array.isArray(airingList)) {
			logger.warn("No airing list found or invalid format");
			return;
		}

		// Process and augment the airing list
		const augmentedAiringList = [];
		for (const item of airingList) {
			try {
				// Process picture URL
				const processedItem = {
					...item,
					picture: item.picture
						? `https://static.kuroiru.co${item.picture}`
						: item.picture,
				};

				// Query MongoDB for anime data using malId if available
				let anime = null;
				if (item.mal_id) {
					anime = await Anime.findOne({ idMal: parseInt(item.mal_id) });
				}

				if (anime) {
					const augmentedItem = {
						...anime.toObject(),
						extras: {
							provider: "kuroiru",
							...processedItem
						}
					};
					augmentedAiringList.push(augmentedItem);
				} else {
					// If no anime found in DB, use scraped data as main with empty extras
					augmentedAiringList.push({
						...processedItem,
						extras: {
							provider: "kuroiru"
						}
					});
				}
			} catch (error) {
				logger.warn(`Failed to augment airing item ${item.title || item.name} with database data:`, error);
				// Add item without extras if database query fails
				augmentedAiringList.push({
					...item,
					picture: item.picture
						? `https://static.kuroiru.co${item.picture}`
						: item.picture,
					extras: {
						provider: "kuroiru"
					}
				});
			}
		}

		// Store in Redis cache
		await cache("airing-list", augmentedAiringList);
		logger.info(`✅ Airing list cached: ${augmentedAiringList.length} items`);
	} catch (error) {
		logger.error("Failed to process airing list:", error);
		throw error;
	}
};

// Job processor function
const processScheduledJob = async (job: any) => {
	const { name, data } = job;

	switch (name) {
		case "rss-feed-task":
			logger.info("🔄 Running RSS feed fetch task");
			try {
				const rssUrl =
					data.rssUrl || "https://kuroiru.co/feeds/kuroiruanime.xml";
				const feedData = await parseRSSFeed(rssUrl);

				if (feedData && feedData.length > 0) {
					await cache("recent-releases", feedData);
					logger.info(
						`✅ RSS feed parsed and cached: ${feedData.length} items`,
					);

					// Process recent releases to get episode embeds
					logger.info(
						"🔄 Starting to process recent releases for episode embeds",
					);
					await processRecentReleases(feedData);
					logger.info("✅ Finished processing recent releases");
				} else {
					logger.warn("No data from RSS feed, keeping existing cache");
				}
			} catch (error) {
				console.log(error);
				logger.error("RSS feed task failed, keeping existing cache:", error);
			}
			break;

		case "airing-list-task":
			logger.info("🔄 Running airing list fetch task");
			try {
				await processAiringList();
			} catch (error) {
				logger.error("Airing list task failed:", error);
			}
			break;

		default:
			logger.warn(`Unknown job type: ${name}`);
	}
};

// Create worker
const worker = new Worker("scheduler", processScheduledJob, {
	connection: redis,
});

// Worker event listeners
worker.on("completed", (job) => {
	logger.info(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
	logger.error(`Job ${job?.id} failed: ${err.message}`);
});

// Schedule the RSS feed task to run every hour
const scheduleHourlyTask = async () => {
	await schedulerQueue.add(
		"rss-feed-task",
		{ rssUrl: "https://kuroiru.co/feeds/kuroiruanime.xml" },
		{
			repeat: {
				pattern: "*/30 * * * *", // Every hour at minute 0
			},
			removeOnComplete: 10, // Keep only 10 completed jobs
			removeOnFail: 5, // Keep only 5 failed jobs
		},
	);

	logger.info("📅 RSS feed task scheduled successfully");

	await schedulerQueue.add("airing-list-task", null, {
		repeat: {
			pattern: "*/30 * * * *",
		},
		removeOnComplete: 10,
		removeOnFail: 5,
	});

	logger.info("Airing list task scheduled successfully");
};

export { schedulerQueue, worker, scheduleHourlyTask };
