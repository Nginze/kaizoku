import axios from "axios";
import { logger } from "../config/logger";
import * as cheerio from "cheerio";
import { cache } from "../config/redis";
import { getOrFetchAnimeByMalId } from "../utils/anilist";

const KUROIRU_BASE_URL = "https://kuroiru.co";
const KUROIRU_APP_URL = "https://kuroiru.co/app";
const KUROIRU_TRENDING_TODAY_URL = "https://kuroiru.co/data/public/quick/trendtoday.json";
const KUROIRU_IMAGE_BASE = "https://static.kuroiru.co";

interface TrendingItem {
  title: string;
  malid: number;
  picture: string;
  members: number;
  score: number | null;
  hits: number;
  change?: number;
}

/**
 * Scrapes weekly trending anime from kuroiru.co/app
 * Extracts the "popular" array from the airingList variable in script tag
 */
async function fetchWeeklyTrending(): Promise<TrendingItem[]> {
  try {
    logger.info("🔄 Fetching weekly trending from kuroiru.co/app");

    const response = await axios.get(KUROIRU_APP_URL, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AnimeBot/1.0)",
      },
    });

    if (!response.data) {
      logger.error("Empty response received from weekly trending endpoint");
      return [];
    }

    // Parse HTML
    const $ = cheerio.load(response.data);

    // Find script tag containing airingList variable
    let airingListData: any = null;
    $("script").each((_, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && scriptContent.includes("var airingList")) {
        // Extract the JSON from the variable declaration
        const match = scriptContent.match(/var airingList\s*=\s*({[\s\S]*?});/);
        if (match && match[1]) {
          try {
            airingListData = JSON.parse(match[1]);
          } catch (parseError: any) {
            logger.error(
              `Failed to parse airingList JSON:`,
              parseError?.message || parseError
            );
          }
        }
      }
    });

    if (!airingListData || !airingListData.popular) {
      logger.warn("Could not find popular array in airingList");
      return [];
    }

    const popularArray = airingListData.popular;
    logger.info(`Found ${popularArray.length} weekly trending items`);

    return popularArray.map((item: TrendingItem) => ({
      ...item,
      picture: `${KUROIRU_IMAGE_BASE}${item.picture}`,
    }));
  } catch (error: any) {
    logger.error(
      `Failed to fetch weekly trending:`,
      error?.message || error
    );
    throw error;
  }
}

/**
 * Fetches daily trending anime from kuroiru.co JSON endpoint
 */
async function fetchDailyTrending(): Promise<TrendingItem[]> {
  try {
    logger.info("🔄 Fetching daily trending from kuroiru.co/data/public/quick/trendtoday.json");

    const response = await axios.get(KUROIRU_TRENDING_TODAY_URL, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AnimeBot/1.0)",
      },
    });

    if (!response.data || !Array.isArray(response.data)) {
      logger.error("Invalid response from daily trending endpoint");
      return [];
    }

    logger.info(`Found ${response.data.length} daily trending items`);

    return response.data.map((item: TrendingItem) => ({
      ...item,
      picture: `${KUROIRU_IMAGE_BASE}${item.picture}`,
    }));
  } catch (error: any) {
    logger.error(
      `Failed to fetch daily trending:`,
      error?.message || error
    );
    throw error;
  }
}

/**
 * Augments trending items with AniList data from database
 */
async function augmentTrendingItems(
  items: TrendingItem[],
  type: "weekly" | "daily"
): Promise<any[]> {
  const augmentedItems = [];
  let processedCount = 0;
  let failedCount = 0;

  for (const item of items) {
    try {
      const { malid, title } = item;

      // Get or fetch anime from database
      let anime = null;
      if (malid) {
        try {
          anime = await getOrFetchAnimeByMalId(malid.toString());

          if (anime) {
            logger.debug(
              `Found/fetched anime for MAL ID ${malid}: ${
                anime.title?.romaji || title
              }`
            );
          } else {
            logger.warn(`Could not find or fetch anime for MAL ID ${malid}`);
          }
        } catch (dbError: any) {
          logger.error(
            `Error fetching anime for MAL ID ${malid}:`,
            dbError?.message || dbError
          );
        }
      }

      // Build augmented item
      if (anime) {
        const augmentedItem = {
          ...anime.toObject(),
          extras: {
            provider: "kuroiru",
            trending: {
              type,
              title: item.title,
              malId: item.malid,
              picture: item.picture,
              members: item.members,
              score: item.score,
              hits: item.hits,
              ...(item.change !== undefined && { change: item.change }),
            },
          },
        };
        augmentedItems.push(augmentedItem);
        processedCount++;
      } else {
        // If no anime found, use scraped data
        augmentedItems.push({
          ...item,
          extras: {
            provider: "kuroiru",
            trending: {
              type,
            },
          },
        });
        processedCount++;
      }
    } catch (error: any) {
      failedCount++;
      logger.warn(
        `Failed to augment trending item "${item.title || "Unknown"}":`,
        error?.message || error
      );

      // Add item without extras if processing fails
      try {
        augmentedItems.push({
          ...item,
          extras: {
            provider: "kuroiru",
            trending: {
              type,
            },
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

  logger.info(
    `Augmented ${type} trending: ${processedCount} processed, ${failedCount} failed`
  );

  return augmentedItems;
}

/**
 * Main job function to process trending releases (both daily and weekly)
 */
export const processTrendingReleases = async () => {
  try {
    logger.info("🚀 Starting trending releases processing job");

    // Fetch both trending lists in parallel
    const [weeklyItems, dailyItems] = await Promise.all([
      fetchWeeklyTrending(),
      fetchDailyTrending(),
    ]);

    // Augment both lists with AniList data
    const [augmentedWeekly, augmentedDaily] = await Promise.all([
      augmentTrendingItems(weeklyItems, "weekly"),
      augmentTrendingItems(dailyItems, "daily"),
    ]);

    // Cache both lists
    await Promise.all([
      cache("trending-releases:weekly", augmentedWeekly),
      cache("trending-releases:daily", augmentedDaily),
    ]);

    logger.info(
      `✅ Trending releases cached successfully: ${augmentedWeekly.length} weekly, ${augmentedDaily.length} daily`
    );
  } catch (error: any) {
    logger.error(
      `Critical error in processTrendingReleases:`,
      error?.message || error
    );
    throw error;
  }
};
