import mongoose from "mongoose";
// import pLimit from "p-limit";

import Anime from "../models/anime";
import { redis } from "../config/redis";

import { load } from "cheerio";
import { appendFile, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { MappingService } from "../services/mapping.service";
import { SERVER_MAP } from "../constants/misc";
import { safeRequest } from "../utils/safe-request";

export default async function seedEmbeds() {
  // State tracking configuration
  const configPath = path.join(process.cwd(), "embed-seed-state.json");
  let isShuttingDown = false;

  // Simple state management functions
  let stateCache: any = null;

  async function loadState(): Promise<{
    isRunning: boolean;
    currentOffset: number;
    processedRecords: string[];
    failedRecords: string[];
    lastProcessedRecord?: string;
  }> {
    const defaultState = {
      isRunning: false,
      currentOffset: 0,
      processedRecords: [],
      failedRecords: [],
    };

    if (!existsSync(configPath)) {
      // Create file with default state directly
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
    // Use cached state or default state, don't call loadState()
    const current = stateCache || {
      isRunning: false,
      currentOffset: 0,
      processedRecords: [],
      failedRecords: [],
    };

    const newState = { ...current, ...updates, lastUpdated: new Date() };

    try {
      await writeFile(configPath, JSON.stringify(newState, null, 2));
      stateCache = newState; // Update cache
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

    const { completedEpisodes = [], failedEpisodes = [] } = record.embedsProgress;

    for (let ep = 1; ep <= totalEpisodes; ep++) {
      // Skip if already completed OR failed
      if (!completedEpisodes.includes(ep) && !failedEpisodes.includes(ep)) {
        return ep;
      }
    }
    return -1; // All episodes completed or failed
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
      "Embed seeding process stopped safely. Progress has been saved."
    );
    process.exit(0);
  };

  // Listen for shutdown signals
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

  try {
    const concurrency = 8;
    //   const limit = pLimit(concurrency);
    const batchSize = 50;

    async function checkDbConnection(): Promise<boolean> {
      return mongoose.connections.some((conn) => conn.readyState === 1);
    }

    async function fetchRecordsBatch(
      offset: number,
      limitCount: number
    ): Promise<any> {
      const batch = await Anime.find({
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
      })
        .skip(offset)
        .limit(limitCount);

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
      const logPath = path.join(process.cwd(), "failed-embeds.log");
      const timestamp = new Date().toISOString();
      const entry =
        JSON.stringify({ timestamp, recordId, episode, reason }) + "\n";
      try {
        await appendFile(logPath, entry, { encoding: "utf8" });
      } catch (err: any) {
        console.warn(
          `Failed to write failed-embeds.log: ${err?.message || err}`
        );
      }
      console.warn(`Failed ${recordId} ep ${episode}: ${reason}`);
    }

    // Basic provider fetchers - adapt selectors/urls to real providers
    async function fetchFromHianime(
      slug: string,
      episode: number
    ): Promise<any[]> {
      try {
        // Extract anime ID from slug (slug format: "title-xxxxx" where xxxxx is the ID)
        const aniwatchId = slug.split("-").pop();

        // Fetch episode list for the show
        const listUrl = `https://hianime.to/ajax/v2/episode/list/${aniwatchId}`;
        const listRes = await safeRequest(listUrl, {
          method: "GET",
        });

        if (!listRes) {
          throw new Error("Failed to fetch episode list");
        }

        const listHtml = listRes?.data?.html ?? listRes?.data ?? "";
        const $ = load(listHtml);

        // Find the episode id for the requested episode number
        let targetEpId: string | null = null;
        $("div.ss-list > a.ssl-item.ep-item").each((_, el) => {
          const epId = $(el).attr("data-id");
          const epNo = parseInt($(el).attr("data-number") || "0", 10);
          if (epNo === episode) {
            targetEpId = epId ?? null;
            return false; // break
          }
        });

        if (!targetEpId) return [];

        // Fetch servers for that episode id
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

        // Get embeds for each server
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
            // Ignore individual server failures and continue
            continue;
          }
        }

        return embeds;
      } catch (err: any) {
        console.log(err);
        // Bubble up error to caller which will log via saveFailedEpisode
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
      console.error("DB connection failed - aborting seedEmbeds");
      return;
    }

    // Initialize state tracking
    const state = await loadState();

    // console.log("Current embed seeding state:", state);

    // // Check if another instance is running
    // if (state.isRunning === true) {
    //   console.warn(
    //     "Another instance appears to be running. If this is not the case, manually edit embed-seed-state.json and set isRunning to false."
    //   );
    //   return;
    // }

    // Mark as running and save state
    // await saveState({ isRunning: true });
    console.log("Starting embed seeding process...");

    let offset = state.currentOffset || 0;
    let totalProcessed = state.processedRecords.length;
    const mappingService = new MappingService();
    while (true) {
      // Check for shutdown signal
      if (isShuttingDown) {
        console.log("Shutdown requested, stopping processing...");
        break;
      }

      const records = await fetchRecordsBatch(offset, batchSize);
      if (!records.length) break;

      const tasks: Promise<void>[] = [];

      for (const record of records) {
        // Check for shutdown signal before processing each record
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

          // Skip if already completed
          if (await isRecordCompleted(recordId)) {
            console.log(`Skipping already completed record ${recordId}`);
            continue;
          }

          // Mark record as started
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
          let completedCount = 0;

          // Process episodes from where we left off
          while (true) {
            const nextEp = await getNextEpisodeToProcess(
              recordId,
              totalEpisodes
            );

            if (nextEp === -1 || nextEp > totalEpisodes) {
              // All episodes completed or no more episodes
              break;
            }

            try {
              console.log(
                `Processing episode ${nextEp}/${totalEpisodes} for record ${recordId}`
              );

              // try multiple providers in parallel but keep overall concurrency limited by pLimit
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
                completedCount++;
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

          // Check if record is fully processed
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

          // Save checkpoint periodically
          await saveState({
            currentOffset: offset,
            lastProcessedRecord: recordId,
          });
        } catch (err: any) {
          // Catch any unexpected errors for this record and log them
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

      // await Promise.all(tasks);
      totalProcessed += records.length;
      offset += records.length;
      console.log(
        `Processed batch, total records processed: ${totalProcessed}`
      );
    }

    console.log("seedEmbeds finished");

    // Mark as not running
    await saveState({ isRunning: false });
  } catch (err: any) {
    console.error("Critical error in seedEmbeds:", err?.message || err);

    // Mark as not running even on error
    await saveState({ isRunning: false });

    // Don't rethrow - just log and continue
  }
}
