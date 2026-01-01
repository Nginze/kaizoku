import axios from "axios";
import { logger } from "../config/logger";
import * as cheerio from "cheerio";
import { cache, redis } from "../config/redis";
import { getOrFetchAnimeByMalId } from "../utils/anilist";

const RSS_URL = "https://kuroiru.co/feeds/kuroiruanime.xml";
const REQUESTED_EMBEDS_KEY = "anime:requested-embeds";

export const processRecentReleases = async () => {
  try {
    logger.info("🔄 Fetching recent releases RSS feed from kuroiru.co");

    // Fetch RSS feed
    const response = await axios.get(RSS_URL, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AnimeBot/1.0)",
      },
    });

    if (!response.data) {
      logger.error("Empty response received from RSS feed");
      return;
    }

    // Parse RSS feed
    const $ = cheerio.load(response.data, { xmlMode: true });

    const items: any[] = [];
    $("item").each((_, element) => {
      const title = $(element).find("title").text();
      const link = $(element).find("link").text();
      const description = $(element).find("description").text();
      const enclosureUrl = $(element).find("enclosure").attr("url");
      const pubDate = $(element).find("pubDate").text();

      // Extract malId from link
      const malIdMatch = link.match(/\/(\d+)/);
      const malId = malIdMatch ? malIdMatch[1] : null;

      // Convert pubDate to ISO format
      let formattedPubDate = null;
      if (pubDate) {
        try {
          formattedPubDate = new Date(pubDate).toISOString();
        } catch (error: any) {
          logger.warn(`Failed to parse pubDate: ${pubDate}`);
        }
      }

      // Extract episode number from description
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

    if (!items.length) {
      logger.warn("No items found in RSS feed");
      return;
    }

    logger.info(`Found ${items.length} recent releases to process`);

    // Augment items with database data and queue embed processing
    const augmentedItems = [];
    let processedCount = 0;
    let failedCount = 0;
    let queuedForEmbeds = 0;

    console.log("items")
    console.log(items)

    for (const item of items) {
      try {
        const { malId, epNo, title } = item;

        // Get or fetch anime from database
        let anime = null;
        if (malId) {
          try {
            anime = await getOrFetchAnimeByMalId(malId);

            if (anime) {
              logger.debug(
                `Found/fetched anime for MAL ID ${malId}: ${
                  anime.title?.romaji || title
                }`
              );
            } else {
              logger.warn(`Could not find or fetch anime for MAL ID ${malId}`);
            }
          } catch (dbError: any) {
            logger.error(
              `Error fetching anime for MAL ID ${malId}:`,
              dbError?.message || dbError
            );

            console.log(dbError);
          }
        }

        // Build augmented item
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
              epNo: item.epNo,
            },
          };
          augmentedItems.push(augmentedItem);

          // Queue this anime for embed processing if we have episode number
          if (anime.idAnilist && epNo) {
            try {
              await redis.sadd(
                REQUESTED_EMBEDS_KEY,
                anime.idAnilist.toString()
              );
              queuedForEmbeds++;
              logger.info(
                `Queued anime ${anime.idAnilist} (${
                  anime.title?.romaji || title
                }) for embed processing`
              );
            } catch (queueError: any) {
              logger.error(
                `Failed to queue anime ${anime.idAnilist} for embeds:`,
                queueError?.message || queueError
              );
            }
          }

          processedCount++;
        } else {
          // If no anime found, use scraped data
          augmentedItems.push({
            ...item,
            extras: {
              provider: "kuroiru",
            },
          });
          processedCount++;
        }
      } catch (error: any) {
        failedCount++;
        logger.warn(
          `Failed to augment recent release "${item.title || "Unknown"}":`,
          error?.message || error
        );

        // Add item without extras if processing fails
        try {
          augmentedItems.push({
            ...item,
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
      await cache("recent-releases", augmentedItems);
      logger.info(
        `✅ Recent releases cached: ${augmentedItems.length} items (${processedCount} processed, ${failedCount} failed, ${queuedForEmbeds} queued for embeds)`
      );
    } catch (cacheError: any) {
      logger.error(
        `Failed to cache recent releases:`,
        cacheError?.message || cacheError
      );
      throw cacheError;
    }
  } catch (error: any) {
    logger.error(
      `Critical error in processRecentReleases:`,
      error?.message || error
    );
    throw error;
  }
};
