
import Anime from "../models/anime";
import { redis } from "../config/redis";
import { load } from "cheerio";
import axios from "axios";
import { findBestMatch } from "string-similarity";
import { connectDB } from "../config/mongo";
import mongoose from "mongoose";

const SERVER_MAP: { [key: string]: string } = {
  "1": "HD-1",
  "4": "HD-2",
  "5": "StreamSB",
  "6": "Streamtape",
};

const REQUESTED_EMBEDS_KEY = "anime:requested-embeds";

// Rate limiting helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get mappings from Redis
async function getMappingsByAnilistId(anilistId: number): Promise<any> {
  try {
    const cached = await redis.get(`mappings:${anilistId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving mappings from Redis:", error);
    return null;
  }
}

// Get best title from anime metadata
function getBestTitle(animeMeta: any): string {
  const titles = [
    animeMeta.title.english,
    animeMeta.title.native,
    animeMeta.title.romaji,
    animeMeta.title.userPreferred,
  ];
  return titles.find((title) => title && title.trim() !== "") || "Unknown";
}

// Generate mappings for anime
async function genMappings(animeMeta: any): Promise<any> {
  const bestTitle = getBestTitle(animeMeta);
  console.log("GENERATING MAPPINGS FOR", bestTitle);

  const url = `https://hianime.to/search/?keyword=${encodeURIComponent(
    bestTitle
  )}`;

  try {
    const response = await safeRequest(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const html = response?.data;
    const $ = load(html);
    const searchResults: any[] = [];

    $("div.film_list-wrap > div.flw-item").each((i, el) => {
      const title = $(el)
        .find("div.film-detail h3.film-name a.dynamic-name")
        .attr("title")!
        .trim()
        .replace(/\\n/g, "");
      const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;

      searchResults.push({ title, id });
    });

    if (searchResults.length === 0) {
      console.warn("No search results found for", bestTitle);
      return null;
    }

    // Find best match using string-similarity
    const bestMatch = findBestMatch(
      bestTitle,
      searchResults.map((result) => result.title)
    );

    console.log(bestMatch);

    if (bestMatch.bestMatch.rating > 0.3) {
      // Only accept matches with decent similarity
      const matchedResult = searchResults[bestMatch.bestMatchIndex];
      const mappingsObject = {
        aniwatch: matchedResult.id,
      };

      console.log("Best match for", bestTitle, "is", matchedResult.title);

      // Save to Redis
      if (animeMeta.idAnilist) {
        try {
          await redis.set(
            `mappings:${animeMeta.idAnilist}`,
            JSON.stringify(mappingsObject)
          );
          console.log(`Saved mapping for anime ${animeMeta.idAnilist}`);
        } catch (error) {
          console.error("Error saving mappings to Redis:", error);
        }
      }

      return mappingsObject;
    }

    console.warn(
      "No good match found for",
      bestTitle,
      "- best rating:",
      bestMatch.bestMatch.rating
    );
    return null;
  } catch (error: any) {
    console.error("Error generating mappings:", error.message);
    return null;
  }
}

export async function safeRequest(url: string, options: any = {}) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sleep(700); // Rate limiting: 700ms between requests
      const response = await axios({
        url,
        ...options,
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...options.headers,
        },
      });
      return response;
    } catch (error: any) {
      lastError = error;
      if (error.response?.status === 429) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`Rate limited, waiting ${backoffDelay}ms...`);
        await sleep(backoffDelay);
        continue;
      }
      if (attempt < maxRetries) {
        await sleep(1000 * attempt);
        continue;
      }
    }
  }
  throw lastError;
}

// Fetch episode count from Kuroiru when episodes is null
async function fetchEpisodeCountFromKuroiru(
  malId: number
): Promise<number | null> {
  try {
    const url = `https://kuroiru.co/anime/${malId}/streams`;
    console.log(`Fetching episode count from Kuroiru for MAL ID: ${malId}`);

    const response = await safeRequest(url, {
      method: "GET",
      headers: {
        "Content-Type": "text/html",
      },
    });

    if (!response?.data) {
      console.warn(`No response data from Kuroiru for MAL ID: ${malId}`);
      return null;
    }

    const html = response.data;

    // Extract animeData from <script> tag
    const scriptRegex = /const\s+animeData\s*=\s*({[\s\S]*?});/;
    const match = html.match(scriptRegex);

    if (!match || !match[1]) {
      console.warn(
        `Could not find animeData in Kuroiru response for MAL ID: ${malId}`
      );
      return null;
    }

    const animeDataString = match[1];
    const animeData = JSON.parse(animeDataString);

    const lastep = animeData.lastep;

    if (typeof lastep === "number" && lastep > 0) {
      console.log(`Found ${lastep} episodes for MAL ID: ${malId}`);
      return lastep;
    }

    console.warn(`Invalid lastep value for MAL ID: ${malId}:`, lastep);
    return null;
  } catch (error: any) {
    console.error(
      `Error fetching episode count from Kuroiru for MAL ID ${malId}:`,
      error.message
    );
    return null;
  }
}

async function fetchFromHianime(slug: string, episode: number): Promise<any[]> {
  try {
    const aniwatchId = slug.split("-").pop();
    const listUrl = `https://hianime.to/ajax/v2/episode/list/${aniwatchId}`;
    const listRes = await safeRequest(listUrl, { method: "GET" });

    if (!listRes) throw new Error("Failed to fetch episode list");

    const listHtml = listRes?.data?.html ?? listRes?.data ?? "";
    const $ = load(listHtml);

    let targetEpId: string | null = null;
    $("div.ss-list > a.ssl-item.ep-item").each((_, el) => {
      const epId = $(el).attr("data-id");
      const epNo = parseInt($(el).attr("data-number") || "0", 10);
      if (epNo === episode) {
        targetEpId = epId ?? null;
        return false;
      }
    });

    if (!targetEpId) return [];

    const serversUrl = `https://hianime.to/ajax/v2/episode/servers?episodeId=${targetEpId}`;
    const serversRes = await safeRequest(serversUrl, { method: "GET" });

    if (!serversRes) throw new Error("Failed to fetch servers");

    const serversHtml = serversRes?.data?.html ?? serversRes?.data ?? "";
    const $s = load(serversHtml);

    const servers: any[] = [];

    // Get SUB servers
    $s(
      "div.ps_-block.ps_-block-sub.servers-sub > div.ps__-list > div.item.server-item"
    ).each((_, el) => {
      const serverId = $s(el).attr("data-id");
      const serverName =
        SERVER_MAP[$s(el).attr("data-server-id") as keyof typeof SERVER_MAP];
      const type = "SUB";

      servers.push({
        epNo: episode,
        serverName,
        serverId,
        type,
      });
    });

    // Get DUB servers
    $s(
      "div.ps_-block.ps_-block-sub.servers-dub > div.ps__-list > div.item.server-item"
    ).each((_, el) => {
      const serverId = $s(el).attr("data-id");
      const serverName =
        SERVER_MAP[$s(el).attr("data-server-id") as keyof typeof SERVER_MAP];
      const type = "DUB";

      servers.push({
        epNo: episode,
        serverName,
        serverId,
        type,
      });
    });

    if (!servers.length) return [];

    // Get embeds for each server
    const embeds = [];
    for (const server of servers) {
      try {
        const embedUrl = `https://hianime.to/ajax/v2/episode/sources?id=${server.serverId}`;
        const embedResponse = await safeRequest(embedUrl, { method: "GET" });

        if (!embedResponse) {
          console.warn(`Failed to fetch embed for server ${server.serverId}`);
          continue;
        }

        const data = embedResponse?.data;
        const embed = {
          ...server,
          embedLink: data.link,
          serverIdx: data.server,
        };

        embeds.push(embed);
      } catch (err) {
        console.log(`Error fetching embed for server ${server.serverId}:`, err);
        continue;
      }
    }

    return embeds;
  } catch (err: any) {
    console.log(err);
    throw new Error(`hianime fetch error: ${err?.message || err}`);
  }
}

async function saveEmbeds(recordId: string, episode: number, embeds: any[]) {
  await redis.set(`embeds:${recordId}:ep:${episode}`, JSON.stringify(embeds));
}

export async function processRequestedEmbeds(data?: any) {
  console.log("[ProcessRequestedEmbeds] Starting job...");

  try {
    // Ensure database connection is established for this worker
    if (mongoose.connection.readyState !== 1) {
      console.log("Database not connected in worker, connecting...");
      await connectDB();
    }

    // Get all anime IDs from the Redis set
    const animeIds = await redis.smembers(REQUESTED_EMBEDS_KEY);

    if (!animeIds || animeIds.length === 0) {
      console.log("[ProcessRequestedEmbeds] No anime IDs to process");
      return;
    }

    console.log(
      `[ProcessRequestedEmbeds] Found ${animeIds.length} anime(s) to process`
    );

    for (const anilistId of animeIds) {
      try {
        console.log(`[ProcessRequestedEmbeds] Processing anime ${anilistId}`);

        // Fetch anime data from MongoDB
        const anime = await Anime.findOne({ idAnilist: parseInt(anilistId) });

        if (!anime) {
          console.warn(
            `[ProcessRequestedEmbeds] Anime ${anilistId} not found in database`
          );
          await redis.srem(REQUESTED_EMBEDS_KEY, anilistId);
          continue;
        }

        let totalEpisodes = anime.episodes || 0;

        // If episodes is null/0, try fetching from Kuroiru
        if (totalEpisodes === 0 && anime.idMal) {
          console.log(
            `[ProcessRequestedEmbeds] Episodes count is null for anime ${anilistId}, fetching from Kuroiru...`
          );
          const fetchedEpisodes = await fetchEpisodeCountFromKuroiru(
            anime.idMal
          );

          if (fetchedEpisodes && fetchedEpisodes > 0) {
            totalEpisodes = fetchedEpisodes;
            console.log(
              `[ProcessRequestedEmbeds] Using ${totalEpisodes} episodes from Kuroiru for anime ${anilistId}`
            );
          }
        }

        if (totalEpisodes === 0) {
          console.warn(
            `[ProcessRequestedEmbeds] Anime ${anilistId} has no episodes (even after Kuroiru check)`
          );
          await redis.srem(REQUESTED_EMBEDS_KEY, anilistId);
          continue;
        }

        // Check if we already have embeds
        const pattern = `embeds:${anilistId}:ep:*`;
        const existingKeys = await redis.keys(pattern);

        if (existingKeys.length > 0) {
          console.log(
            `[ProcessRequestedEmbeds] Anime ${anilistId} already has ${existingKeys.length} episodes with embeds`
          );

          // Check if there are new episodes from Kuroiru
          let kuroiruEpisodeCount = 0;
          if (anime.idMal) {
            kuroiruEpisodeCount =
              (await fetchEpisodeCountFromKuroiru(anime.idMal)) || 0;
          }

          // Use existing cached episodes count as the baseline
          const cachedEpisodeCount = existingKeys.length;

          if (kuroiruEpisodeCount <= cachedEpisodeCount) {
            console.log(
              `[ProcessRequestedEmbeds] No new episodes for anime ${anilistId} (cached: ${cachedEpisodeCount}, Kuroiru: ${kuroiruEpisodeCount}), removing from queue`
            );
            await redis.srem(REQUESTED_EMBEDS_KEY, anilistId);
            continue;
          }

          console.log(
            `[ProcessRequestedEmbeds] Found new episodes for anime ${anilistId}: Kuroiru has ${kuroiruEpisodeCount} vs ${cachedEpisodeCount} cached`
          );

          // Update totalEpisodes to Kuroiru count for scraping new episodes
          totalEpisodes = kuroiruEpisodeCount;
        }

        // Get or generate mapping
        let mappings = await getMappingsByAnilistId(parseInt(anilistId));
        let slug = mappings?.aniwatch;

        if (!slug) {
          console.log(
            `[ProcessRequestedEmbeds] No cached mapping found, generating for ${anilistId}`
          );
          mappings = await genMappings(anime);
          slug = mappings?.aniwatch;
        }

        if (!slug) {
          console.warn(
            `[ProcessRequestedEmbeds] Could not find or generate aniwatch mapping for ${anilistId}`
          );
          await redis.srem(REQUESTED_EMBEDS_KEY, anilistId);
          continue;
        }

        // Get list of already scraped episodes
        const scrapedEpisodes = new Set<number>();
        for (const key of existingKeys) {
          const match = key.match(/:ep:(\d+)$/);
          if (match) {
            scrapedEpisodes.add(parseInt(match[1]));
          }
        }

        // Process only episodes that haven't been scraped yet
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        for (let ep = 1; ep <= totalEpisodes; ep++) {
          // Skip if already scraped
          if (scrapedEpisodes.has(ep)) {
            skippedCount++;
            console.log(
              `[ProcessRequestedEmbeds] Skipping episode ${ep} (already scraped)`
            );
            continue;
          }

          try {
            console.log(
              `[ProcessRequestedEmbeds] Fetching episode ${ep}/${totalEpisodes} for anime ${anilistId}`
            );

            const embeds = await fetchFromHianime(slug, ep);

            if (embeds.length > 0) {
              await saveEmbeds(anilistId, ep, embeds);
              successCount++;
              console.log(
                `[ProcessRequestedEmbeds] Saved ${embeds.length} embeds for episode ${ep}`
              );
            } else {
              failedCount++;
              console.warn(
                `[ProcessRequestedEmbeds] No embeds found for episode ${ep}`
              );
            }

            await sleep(500);
          } catch (error: any) {
            failedCount++;
            console.error(
              `[ProcessRequestedEmbeds] Error processing episode ${ep}:`,
              error.message
            );
          }
        }

        // Remove from requested set after processing
        await redis.srem(REQUESTED_EMBEDS_KEY, anilistId);

        console.log(
          `[ProcessRequestedEmbeds] Completed anime ${anilistId}: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`
        );
      } catch (error: any) {
        console.error(
          `[ProcessRequestedEmbeds] Error processing anime ${anilistId}:`,
          error.message
        );
        continue;
      }
    }

    console.log("[ProcessRequestedEmbeds] Job completed");
  } catch (error: any) {
    console.error("[ProcessRequestedEmbeds] Job failed:", error);
    throw error;
  }
}