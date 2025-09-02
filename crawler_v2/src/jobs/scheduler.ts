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

		return items;
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

			logger.info(
				`Processing ${title} - Episode ${epNo} (AnilistID: ${anilistId})`,
			);

			// Get episode embeds
			await hianimeService.getStreamingEpisodeEmbedById(epNo, anilistId);

			logger.info(`✅ Processed embeds for ${title} Episode ${epNo}`);
		} catch (error) {
			logger.error(`Error processing release ${release.title}:`, error);
		}
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
				pattern: "* * * * *", // Every hour at minute 0
			},
			removeOnComplete: 10, // Keep only 10 completed jobs
			removeOnFail: 5, // Keep only 5 failed jobs
		},
	);

	logger.info("📅 RSS feed task scheduled successfully");
};

export { schedulerQueue, worker, scheduleHourlyTask };
