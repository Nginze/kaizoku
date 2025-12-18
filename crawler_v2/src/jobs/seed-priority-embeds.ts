import mongoose from "mongoose";

import Anime from "../models/anime";
import { redis } from "../config/redis";

import { load } from "cheerio";
import { appendFile, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { MappingService } from "../services/mapping.service";
import { SERVER_MAP } from "../constants/misc";
import { safeRequest } from "../utils/safe-request";

const ANILIST_API_URL = "https://graphql.anilist.co";
const ANILIST_GRAPHQL_QUERY = `
query($page:Int = 1 $id:Int $type:MediaType $isAdult:Boolean = false $search:String $format:[MediaFormat]$status:MediaStatus $countryOfOrigin:CountryCode $source:MediaSource $season:MediaSeason $seasonYear:Int $year:String $onList:Boolean $yearLesser:FuzzyDateInt $yearGreater:FuzzyDateInt $episodeLesser:Int $episodeGreater:Int $durationLesser:Int $durationGreater:Int $chapterLesser:Int $chapterGreater:Int $volumeLesser:Int $volumeGreater:Int $licensedBy:[Int]$isLicensed:Boolean $genres:[String]$excludedGenres:[String]$tags:[String]$excludedTags:[String]$minimumTagRank:Int $sort:[MediaSort]=[POPULARITY_DESC,SCORE_DESC]){
  Page(page:$page,perPage:20){
    pageInfo{
      total
      perPage
      currentPage
      lastPage
      hasNextPage
    }
    media(id:$id type:$type season:$season format_in:$format status:$status countryOfOrigin:$countryOfOrigin source:$source search:$search onList:$onList seasonYear:$seasonYear startDate_like:$year startDate_lesser:$yearLesser startDate_greater:$yearGreater episodes_lesser:$episodeLesser episodes_greater:$episodeGreater duration_lesser:$durationLesser duration_greater:$durationGreater chapters_lesser:$chapterLesser chapters_greater:$chapterGreater volumes_lesser:$volumeLesser volumes_greater:$volumeGreater licensedById_in:$licensedBy isLicensed:$isLicensed genre_in:$genres genre_not_in:$excludedGenres tag_in:$tags tag_not_in:$excludedTags minimumTagRank:$minimumTagRank sort:$sort isAdult:$isAdult){
      id
      title{
        userPreferred
      }
      coverImage{
        extraLarge
        large
        color
      }
      startDate{
        year
        month
        day
      }
      endDate{
        year
        month
        day
      }
      bannerImage
      season
      seasonYear
      description
      type
      format
      status(version:2)
      episodes
      duration
      chapters
      volumes
      genres
      isAdult
      averageScore
      popularity
      nextAiringEpisode{
        airingAt
        timeUntilAiring
        episode
      }
      mediaListEntry{
        id
        status
      }
      studios(isMain:true){
        edges{
          isMain
          node{
            id
            name
          }
        }
      }
    }
  }
}
`;

/**
 * Fetches top anime from AniList in batches
 * @param targetCount Total number of anime to fetch (default: 1000)
 * @returns Array of anime IDs from AniList
 */
async function fetchPriorityBatch(
  targetCount: number = 1000
): Promise<number[]> {
  const animeIds: number[] = [];
  const perPage = 50; // AniList supports up to 50 per page
  const totalPages = Math.ceil(targetCount / perPage);

  console.log(
    `Fetching top ${targetCount} anime from AniList (${totalPages} pages)...`
  );

  for (let page = 1; page <= totalPages; page++) {
    try {
      console.log(`Fetching page ${page}/${totalPages}...`);

      const response = await safeRequest(ANILIST_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {
          query: ANILIST_GRAPHQL_QUERY,
          variables: {
            page,
            type: "ANIME",
            sort: "SCORE_DESC",
            perPage,
          },
        },
      });

      if (!response?.data?.data?.Page?.media) {
        console.warn(`No data received for page ${page}`);
        continue;
      }

      const media = response.data.data.Page.media;
      const pageIds = media.map((anime: any) => anime.id); q
      animeIds.push(...pageIds);

      console.log(
        `Fetched ${pageIds.length} anime from page ${page} (total: ${animeIds.length})`
      );

      // Check if we have enough
      if (animeIds.length >= targetCount) {
        break;
      }

      // Rate limiting - wait a bit between requests to avoid overwhelming AniList
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error(`Error fetching page ${page}:`, err?.message || err);
      // Continue with next page even if one fails
      continue;
    }
  }

  console.log(`Successfully fetched ${animeIds.length} anime IDs from AniList`);
  return animeIds.slice(0, targetCount);
}

export default async function seedPriorityEmbeds() {
  // State tracking configuration
  const configPath = path.join(process.cwd(), "priority-embed-seed-state.json");
  let isShuttingDown = false;

  // Simple state management functions
  let stateCache: any = null;

  async function loadState(): Promise<{
    isRunning: boolean;
    currentOffset: number;
    processedRecords: string[];
    failedRecords: string[];
    lastProcessedRecord?: string;
    priorityIds?: number[];
  }> {
    const defaultState = {
      isRunning: false,
      currentOffset: 0,
      processedRecords: [],
      failedRecords: [],
      priorityIds: [],
    };

    if (!existsSync(configPath)) {
      try {
        await writeFile(configPath, JSON.stringify(defaultState, null, 2));
        stateCache = defaultState;
        return defaultState;
      } catch (err) {
        console.warn("Failed to create state file, using defaults:", err);
        return defaultState;
      }
    }

    try {
      const data = await readFile(configPath, "utf-8");
      const loadedState = { ...defaultState, ...JSON.parse(data) };
      stateCache = loadedState;
      return loadedState;
    } catch (err) {
      console.warn("Failed to load state, using defaults:", err);
      stateCache = defaultState;
      return defaultState;
    }
  }

  async function saveState(updates: any): Promise<void> {
    const current = stateCache || {
      isRunning: false,
      currentOffset: 0,
      processedRecords: [],
      failedRecords: [],
      priorityIds: [],
    };

    const newState = { ...current, ...updates, lastUpdated: new Date() };

    try {
      await writeFile(configPath, JSON.stringify(newState, null, 2));
      stateCache = newState;
    } catch (err) {
      console.error("Failed to save state:", err);
    }
  }

  async function markRecordAsStarted(recordId: string): Promise<void> {
    await Anime.findOneAndUpdate(
      { idAnilist: recordId },
      {
        $set: {
          "embedsProgress.status": "in_progress",
          "embedsProgress.startedAt": new Date(),
          "embedsProgress.lastUpdated": new Date(),
        },
      }
    );
  }

  async function markEpisodeCompleted(
    recordId: string,
    episode: number
  ): Promise<void> {
    await Anime.findOneAndUpdate(
      { idAnilist: recordId },
      {
        $addToSet: { "embedsProgress.completedEpisodes": episode },
        $pull: { "embedsProgress.failedEpisodes": episode },
        $set: {
          "embedsProgress.lastProcessedEpisode": episode,
          "embedsProgress.lastUpdated": new Date(),
        },
      }
    );
  }

  async function markEpisodeFailed(
    recordId: string,
    episode: number
  ): Promise<void> {
    await Anime.findOneAndUpdate(
      { idAnilist: recordId },
      {
        $addToSet: { "embedsProgress.failedEpisodes": episode },
        $set: {
          "embedsProgress.lastProcessedEpisode": episode,
          "embedsProgress.lastUpdated": new Date(),
        },
      }
    );
  }

  async function markRecordCompleted(recordId: string): Promise<void> {
    await Anime.findOneAndUpdate(
      { idAnilist: recordId },
      {
        $set: {
          embedsSeeded: true,
          "embedsProgress.status": "completed",
          "embedsProgress.completedAt": new Date(),
          "embedsProgress.lastUpdated": new Date(),
        },
      }
    );

    const state = await loadState();
    await saveState({
      processedRecords: [...state.processedRecords, recordId],
      failedRecords: state.failedRecords.filter((id) => id !== recordId),
    });
  }

  async function markRecordFailed(recordId: string): Promise<void> {
    await Anime.findOneAndUpdate(
      { idAnilist: recordId },
      {
        $set: {
          "embedsProgress.status": "failed",
          "embedsProgress.lastUpdated": new Date(),
        },
      }
    );

    const state = await loadState();
    await saveState({
      failedRecords: [...new Set([...state.failedRecords, recordId])],
      processedRecords: state.processedRecords.filter((id) => id !== recordId),
    });
  }

  async function getNextEpisodeToProcess(
    recordId: string,
    totalEpisodes: number
  ): Promise<number> {
    const record = await Anime.findOne({ idAnilist: recordId });
    if (!record?.embedsProgress) return 1;

    const { completedEpisodes = [], failedEpisodes = [] } =
      record.embedsProgress;

    for (let ep = 1; ep <= totalEpisodes; ep++) {
      if (!completedEpisodes.includes(ep) && !failedEpisodes.includes(ep)) {
        return ep;
      }
    }
    return -1;
  }

  async function isRecordCompleted(recordId: string): Promise<boolean> {
    const record = await Anime.findOne({ idAnilist: recordId });
    return (
      record?.embedsSeeded === true ||
      record?.embedsProgress?.status === "completed"
    );
  }

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;

    console.log(`\nReceived ${signal}. Gracefully shutting down...`);
    isShuttingDown = true;

    await saveState({ isRunning: false });

    console.log(
      "Priority embed seeding process stopped safely. Progress has been saved."
    );
    process.exit(0);
  };

  // Listen for shutdown signals
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

  try {
    const batchSize = 10; // Process 10 anime at a time

    async function checkDbConnection(): Promise<boolean> {
      return mongoose.connections.some((conn) => conn.readyState === 1);
    }

    async function fetchRecordsBatch(
      priorityIds: number[],
      offset: number,
      limitCount: number
    ): Promise<any[]> {
      const idsToFetch = priorityIds.slice(offset, offset + limitCount);

      if (!idsToFetch.length) return [];

      const batch = await Anime.find({
        idAnilist: { $in: idsToFetch },
        $and: [
          { embedsSeeded: { $ne: true } },
          {
            $or: [
              { "embedsProgress.status": { $exists: false } },
              { "embedsProgress.status": "pending" },
              { "embedsProgress.status": "in_progress" },
              { "embedsProgress.status": "failed" },
            ],
          },
        ],
      });

      return batch;
    }

    async function saveEmbeds(
      recordId: string,
      episode: number,
      embeds: string[]
    ) {
      await redis.set(
        `embeds:${recordId}:ep:${episode}`,
        JSON.stringify(embeds)
      );
    }

    async function saveFailedEpisode(
      recordId: string,
      episode: number,
      reason: string
    ) {
      const logPath = path.join(process.cwd(), "failed-priority-embeds.log");
      const timestamp = new Date().toISOString();
      const entry =
        JSON.stringify({ timestamp, recordId, episode, reason }) + "\n";
      try {
        await appendFile(logPath, entry, { encoding: "utf8" });
      } catch (err: any) {
        console.warn(
          `Failed to write failed-priority-embeds.log: ${err?.message || err}`
        );
      }
      console.warn(`Failed ${recordId} ep ${episode}: ${reason}`);
    }

    async function fetchFromHianime(
      slug: string,
      episode: number
    ): Promise<any[]> {
      try {
        const aniwatchId = slug.split("-").pop();

        const listUrl = `https://hianime.to/ajax/v2/episode/list/${aniwatchId}`;
        const listRes = await safeRequest(listUrl, {
          method: "GET",
        });

        if (!listRes) {
          throw new Error("Failed to fetch episode list");
        }

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
        const serversRes = await safeRequest(serversUrl, {
          method: "GET",
        });

        if (!serversRes) {
          throw new Error("Failed to fetch servers");
        }

        const serversHtml = serversRes?.data?.html ?? serversRes?.data ?? "";
        const $s = load(serversHtml);

        const servers: any[] = [];

        // Get SUB servers
        $s(
          "div.ps_-block.ps_-block-sub.servers-sub > div.ps__-list > div.item.server-item"
        ).each((_, el) => {
          const serverId = $s(el).attr("data-id");
          const serverName =
            SERVER_MAP[
              $s(el).attr("data-server-id") as keyof typeof SERVER_MAP
            ];
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
            SERVER_MAP[
              $s(el).attr("data-server-id") as keyof typeof SERVER_MAP
            ];
          const type = "DUB";

          servers.push({
            epNo: episode,
            serverName,
            serverId,
            type,
          });
        });

        if (!servers.length) return [];

        const embeds = [];
        for (const server of servers) {
          try {
            const embedUrl = `https://hianime.to/ajax/v2/episode/sources?id=${server.serverId}`;
            const embedResponse = await safeRequest(embedUrl, {
              method: "GET",
            });

            if (!embedResponse) {
              console.warn(
                `Failed to fetch embed for server ${server.serverId}`
              );
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
            console.log(
              `Error fetching embed for server ${server.serverId}:`,
              err
            );
            continue;
          }
        }

        return embeds;
      } catch (err: any) {
        console.log(err);
        throw new Error(`hianime fetch error: ${err?.message || err}`);
      }
    }

    async function fetchFromGogo(
      slug: string,
      episode: number
    ): Promise<string[]> {
      return [];
    }

    async function fetchFromAnimepahe(
      slug: string,
      episode: number
    ): Promise<string[]> {
      return [];
    }

    if (!(await checkDbConnection())) {
      console.error("DB connection failed - aborting seedPriorityEmbeds");
      return;
    }

    // Initialize state tracking
    let state = await loadState();

    console.log("Starting priority embed seeding process...");

    // Fetch priority anime IDs if not already cached
    let priorityIds = state.priorityIds || [];
    if (!priorityIds.length) {
      console.log("Fetching top 1000 anime from AniList...");
      priorityIds = await fetchPriorityBatch(1000);
      await saveState({ priorityIds });
      console.log(`Cached ${priorityIds.length} priority anime IDs`);
    } else {
      console.log(`Using cached ${priorityIds.length} priority anime IDs`);
    }

    let offset = state.currentOffset || 0;
    let totalProcessed = state.processedRecords.length;
    const mappingService = new MappingService();

    while (offset < priorityIds.length) {
      if (isShuttingDown) {
        console.log("Shutdown requested, stopping processing...");
        break;
      }

      const records = await fetchRecordsBatch(priorityIds, offset, batchSize);

      if (!records.length) {
        // No records found for this batch, move to next batch
        offset += batchSize;
        await saveState({ currentOffset: offset });
        continue;
      }

      for (const record of records) {
        if (isShuttingDown) {
          console.log("Shutdown requested, stopping record processing...");
          break;
        }

        try {
          const recordId = record.idAnilist.toString();
          console.log(
            `Processing record ${recordId} (${
              record.title?.romaji || "Unknown"
            })`
          );

          if (await isRecordCompleted(recordId)) {
            console.log(`Skipping already completed record ${recordId}`);
            continue;
          }

          await markRecordAsStarted(recordId);

          let slug = (
            await mappingService.getMappingsByAnilistId(record.idAnilist)
          )?.aniwatch;

          if (!slug) {
            slug = (await mappingService.genMappings(record))?.aniwatch;
          }

          if (!slug) {
            console.warn("Mapping not found for anilist id", record.idAnilist);
            await saveFailedEpisode(
              record.idAnilist,
              0,
              "mapping not found for anilist id"
            );
            await markRecordFailed(recordId);
            continue;
          }

          const totalEpisodes = Math.max(0, record.episodes);
          let hasAnySuccess = false;

          while (true) {
            const nextEp = await getNextEpisodeToProcess(
              recordId,
              totalEpisodes
            );

            if (nextEp === -1 || nextEp > totalEpisodes) {
              break;
            }

            try {
              console.log(
                `Processing episode ${nextEp}/${totalEpisodes} for record ${recordId}`
              );

              const [hianime, gogo, pahe] = await Promise.allSettled([
                fetchFromHianime(slug, nextEp).catch(() => []),
                fetchFromGogo(slug, nextEp).catch(() => []),
                fetchFromAnimepahe(slug, nextEp).catch(() => []),
              ]);

              const embeds: string[] = [];
              for (const r of [hianime, gogo, pahe]) {
                if (r.status === "fulfilled" && Array.isArray(r.value))
                  embeds.push(...r.value);
              }

              if (embeds.length) {
                await saveEmbeds(record.idAnilist, nextEp, embeds);
                await markEpisodeCompleted(recordId, nextEp);
                hasAnySuccess = true;
              } else {
                await saveFailedEpisode(
                  record.idAnilist,
                  nextEp,
                  "no embeds found"
                );
                await markEpisodeFailed(recordId, nextEp);
              }
            } catch (err: any) {
              await saveFailedEpisode(
                record.idAnilist,
                nextEp,
                err?.message || "unknown error"
              );
              await markEpisodeFailed(recordId, nextEp);
            }
          }

          const recordData = await Anime.findOne({ idAnilist: recordId });
          const completedEpisodes =
            recordData?.embedsProgress?.completedEpisodes?.length || 0;

          if (completedEpisodes === totalEpisodes) {
            await markRecordCompleted(recordId);
            console.log(
              `Completed record ${recordId} with all ${totalEpisodes} episodes`
            );
          } else if (hasAnySuccess) {
            console.log(
              `Partially completed record ${recordId}: ${completedEpisodes}/${totalEpisodes} episodes`
            );
          } else {
            await markRecordFailed(recordId);
          }

          await saveState({
            currentOffset: offset,
            lastProcessedRecord: recordId,
          });
        } catch (err: any) {
          console.error(
            `Failed to process record ${record.idAnilist}:`,
            err?.message || err
          );
          await saveFailedEpisode(
            record.idAnilist,
            0,
            `record processing failed: ${err?.message || "unknown error"}`
          );
          await markRecordFailed(record.idAnilist.toString());
          continue;
        }
      }

      totalProcessed += records.length;
      offset += batchSize;
      console.log(
        `Processed batch, total records processed: ${totalProcessed}, offset: ${offset}/${priorityIds.length}`
      );
    }

    console.log("seedPriorityEmbeds finished");

    await saveState({ isRunning: false });
  } catch (err: any) {
    console.error("Critical error in seedPriorityEmbeds:", err?.message || err);

    await saveState({ isRunning: false });
  }
}
