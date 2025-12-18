import axios from "axios";
import { logger } from "../config/logger";
import * as cheerio from "cheerio";
import { cache } from "../config/redis";
import { getOrFetchAnimeByMalId } from "../utils/anilist";

export const processAiringList = async () => {
  try {
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

    // Store in Redis cache
    try {
      await cache("airing-list", augmentedAiringList);
      logger.info(
        `✅ Airing list cached: ${augmentedAiringList.length} items (${processedCount} processed, ${failedCount} failed)`
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
