import axios from "axios";
import { logger } from "../config/logger";
import * as cheerio from "cheerio";
import { cache, redis } from "../config/redis";
import { getOrFetchAnimeByMalId } from "../utils/anilist";
import { connectDB } from "../config/mongo";
import mongoose from "mongoose";

export const processAiringList = async () => {
  try {
    // Ensure database connection is established for this worker
    if (mongoose.connection.readyState !== 1) {
      logger.info("Database not connected in worker, connecting...");
      await connectDB();
    }

    logger.info("🔄 Fetching airing list from kuroiru.co");

    const response = await axios.get("https://kuroiru.co/app", {
      timeout: 10000, // 10 second timeout
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AnimeBot/1.0)",
      },
    });

    if (!response.data) {
      logger.error("Empty response received from kuroiru.co");
      return;
    }

    const $ = cheerio.load(response.data);

    // Find script tags and extract airingList variable
    let airingList: any[] | null = null;
    $("script").each((_, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && scriptContent.includes("var airingList")) {
        // Extract the airingList object from the script
        const match = scriptContent.match(/var airingList\s*=\s*({.*?});/s);
        if (match) {
          try {
            const airingListData = JSON.parse(match[1]);
            airingList = airingListData.airing;
          } catch (parseError: any) {
            logger.error(
              "Failed to parse airingList JSON:",
              parseError?.message || parseError
            );
          }
        }
      }
    });

    if (!airingList || !Array.isArray(airingList)) {
      logger.warn("No airing list found or invalid format");
      return;
    }

    logger.info(`Found ${(airingList as any).length} airing items to process`);

    // Process and augment the airing list
    const augmentedAiringList = [];
    let processedCount = 0;
    let failedCount = 0;
    let dbErrors = 0;

    console.log("airingList:");
    console.log(airingList)

    for (const item of (airingList as any)) {
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
          try {
            // First try to find in DB, then fetch from AniList if not found
            anime = await getOrFetchAnimeByMalId(item.mal_id);

            if (anime) {
              logger.debug(
                `Found/fetched anime for MAL ID ${item.mal_id}: ${
                  anime.title?.romaji || "Unknown"
                }`
              );
            } else {
              logger.warn(
                `Could not find or fetch anime for MAL ID ${item.mal_id}`
              );
            }
          } catch (dbError: any) {
            dbErrors++;
            logger.error(
              `Error fetching anime for MAL ID ${item.mal_id}:`,
              dbError?.message || dbError
            );
          }
        }

        if (anime) {
          const augmentedItem = {
            ...anime.toObject(),
            extras: {
              provider: "kuroiru",
              ...processedItem,
            },
          };
          augmentedAiringList.push(augmentedItem);
          processedCount++;
        } else {
          // If no anime found in DB or AniList, use scraped data
          augmentedAiringList.push({
            ...processedItem,
            extras: {
              provider: "kuroiru",
            },
          });
          processedCount++;
        }
      } catch (error: any) {
        failedCount++;
        logger.warn(
          `Failed to augment airing item "${
            item.title || item.name || "Unknown"
          }":`,
          error?.message || error
        );

        // Add item without extras if processing fails
        try {
          augmentedAiringList.push({
            ...item,
            picture: item.picture
              ? `https://static.kuroiru.co${item.picture}`
              : item.picture,
            extras: {
              provider: "kuroiru",
            },
          });
        } catch (fallbackError: any) {
          logger.error(
            `Critical: Failed to add fallback item:`,
            fallbackError?.message || fallbackError
          );
        }
      }
    }

    // Only update cache if we have complete data (no DB errors)
    if (dbErrors > 0) {
      logger.error(
        `❌ Skipping cache update due to ${dbErrors} database errors. Better to keep old data than incomplete new data.`
      );
      throw new Error(
        `Database errors encountered: ${dbErrors}/${(airingList as any).length} items failed to augment`
      );
    }

    // Append to existing airing list (avoid duplicates using malId + time)
    try {
      // Retrieve existing airing list
      const existingDataStr = await redis.get("airing-list");
      const existingData: any[] = existingDataStr
        ? JSON.parse(existingDataStr)
        : [];

      // Create a Set of unique identifiers from existing data
      const existingIds = new Set(
        existingData.map((item) => {
          const malId = item.extras?.mal_id || item.mal_id;
          const time = item.extras?.time || item.time;
          return `${malId}-${time}`;
        })
      );

      // Filter out duplicates from new data
      const newItems = augmentedAiringList.filter((item) => {
        const malId = item.extras?.mal_id || item.mal_id;
        const time = item.extras?.time || item.time;
        const identifier = `${malId}-${time}`;
        return !existingIds.has(identifier);
      });

      // Append new items to existing data
      const updatedData = [...existingData, ...newItems];

      // Save back to Redis
      await cache("airing-list", updatedData);

      logger.info(
        `✅ Airing list updated: ${newItems.length} new items added, ${updatedData.length} total (${processedCount} processed, ${failedCount} failed)`
      );
    } catch (cacheError: any) {
      logger.error(
        `Failed to cache airing list:`,
        cacheError?.message || cacheError
      );
      throw cacheError;
    }
  } catch (error: any) {
    logger.error(
      `Critical error in processAiringList:`,
      error?.message || error
    );
    throw error;
  }
};
