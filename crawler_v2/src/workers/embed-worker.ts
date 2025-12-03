import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { HianimeService } from "../services/hianime.services";
import { MappingService } from "../services/mapping.service";
import { BulkEmbedScraperService, AnimeJobData } from "../services/bulk-embed-scraper.service";
import Anime from "../models/anime";

export class EmbedWorker {
  private worker: Worker;
  private hianimeService: HianimeService;
  private mappingService: MappingService;
  private bulkScraperService: BulkEmbedScraperService;
  private readonly WORKER_NAME: string;

  constructor(concurrency: number = 1, workerId: string = "default") {
    this.WORKER_NAME = `embed-worker-${workerId}`;
    this.hianimeService = new HianimeService();
    this.mappingService = new MappingService();
    this.bulkScraperService = new BulkEmbedScraperService();

    // Create worker with specified concurrency
    this.worker = new Worker(
      "bulk-embed-scraping",
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency,
        removeOnComplete: 100,
        removeOnFail: 50,
        maxStalledCount: 3,
        stalledInterval: 30000, // 30 seconds
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process individual anime job
   */
  private async processJob(job: Job<AnimeJobData>): Promise<void> {
    const startTime = Date.now();
    const { animeId, anilistId, title } = job.data;

    logger.info(`🎬 Processing anime: ${title} (ID: ${anilistId})`, {
      jobId: job.id,
      worker: this.WORKER_NAME,
      progress: `${job.data.retryCount || 0}/3 retries`
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Step 1: Get anime data from MongoDB
      const anime = await this.getAnimeData(animeId);
      if (!anime) {
        throw new Error(`Anime not found in database: ${animeId}`);
      }

      await job.updateProgress(20);

      // Step 2: Check/Generate mappings
      let mappings = await this.mappingService.getMappingsByAnilistId(anilistId);
      if (!mappings || !mappings.aniwatch) {
        logger.info(`🔗 Generating mappings for ${title}`);
        mappings = await this.mappingService.genMappings(anime);
        
        if (!mappings || !mappings.aniwatch) {
          throw new Error(`Failed to generate mappings for anime: ${title}`);
        }
      }

      await job.updateProgress(40);

      // Step 3: Check if we already have embeds (checkpoint system)
      const existingEmbeds = await this.checkExistingEmbeds(anilistId);
      if (existingEmbeds.hasCompleteData) {
        logger.info(`✅ Anime ${title} already has complete embed data, skipping`);
        await this.bulkScraperService.updateProgress(true, Date.now() - startTime);
        return;
      }

      await job.updateProgress(50);

      // Step 4: Get streaming episode embeds
      logger.info(`📡 Scraping embeds for ${title}`);
      await this.hianimeService.getStreamingEpisodeEmbeds(anilistId.toString());

      await job.updateProgress(80);

      // Step 5: Verify embed data was stored
      const verificationResult = await this.verifyEmbedStorage(anilistId);
      if (!verificationResult.success) {
        throw new Error(`Embed verification failed: ${verificationResult.reason}`);
      }

      await job.updateProgress(100);

      // Step 6: Update progress tracking
      const processingTime = Date.now() - startTime;
      await this.bulkScraperService.updateProgress(true, processingTime);

      logger.info(`✅ Successfully processed ${title}`, {
        anilistId,
        processingTime: `${processingTime}ms`,
        embedsFound: verificationResult.embedCount
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      await this.handleJobError(job, error, processingTime);
    }
  }

  /**
   * Get anime data from MongoDB
   */
  private async getAnimeData(animeId: string): Promise<any> {
    try {
      return await Anime.findById(animeId).lean();
    } catch (error) {
      logger.error(`Error fetching anime data for ${animeId}:`, error);
      throw error;
    }
  }

  /**
   * Check existing embeds for an anime
   */
  private async checkExistingEmbeds(anilistId: number): Promise<{
    hasCompleteData: boolean;
    subEpisodes: number;
    dubEpisodes: number;
    totalEmbeds: number;
  }> {
    try {
      const pattern = `anime:${anilistId}:*:*`;
      const keys = await redis.keys(pattern);

      const subKeys = keys.filter(key => key.includes(':SUB:'));
      const dubKeys = keys.filter(key => key.includes(':DUB:'));

      // Get unique episode numbers
      const subEpisodes = new Set(subKeys.map(key => key.split(':')[3])).size;
      const dubEpisodes = new Set(dubKeys.map(key => key.split(':')[3])).size;

      // Consider complete if we have at least 1 episode with both SUB and DUB
      // or if we have substantial embed data (5+ episodes of any type)
      const hasCompleteData = (subEpisodes > 0 && dubEpisodes > 0) || 
                             (subEpisodes + dubEpisodes >= 5);

      return {
        hasCompleteData,
        subEpisodes,
        dubEpisodes,
        totalEmbeds: keys.length
      };
    } catch (error) {
      logger.error(`Error checking existing embeds for ${anilistId}:`, error);
      return {
        hasCompleteData: false,
        subEpisodes: 0,
        dubEpisodes: 0,
        totalEmbeds: 0
      };
    }
  }

  /**
   * Verify that embed data was properly stored
   */
  private async verifyEmbedStorage(anilistId: number): Promise<{
    success: boolean;
    reason?: string;
    embedCount: number;
  }> {
    try {
      // Wait a bit for Redis operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pattern = `anime:${anilistId}:*:*`;
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        return {
          success: false,
          reason: "No embed data found in Redis",
          embedCount: 0
        };
      }

      // Verify at least one embed contains valid data
      const sampleKey = keys[0];
      const sampleData = await redis.get(sampleKey);
      
      if (!sampleData) {
        return {
          success: false,
          reason: "Embed data is empty",
          embedCount: keys.length
        };
      }

      // Try to parse the data to ensure it's valid
      try {
        const parsed = JSON.parse(sampleData);
        const actualData = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        
        if (!Array.isArray(actualData) || actualData.length === 0) {
          return {
            success: false,
            reason: "Invalid embed data structure",
            embedCount: keys.length
          };
        }

        // Check if embed data has required fields
        const firstEmbed = actualData[0];
        if (!firstEmbed.embedLink || !firstEmbed.serverName) {
          return {
            success: false,
            reason: "Embed data missing required fields",
            embedCount: keys.length
          };
        }

        return {
          success: true,
          embedCount: keys.length
        };

      } catch (parseError) {
        return {
          success: false,
          reason: "Failed to parse embed data",
          embedCount: keys.length
        };
      }

    } catch (error) {
      logger.error(`Error verifying embed storage for ${anilistId}:`, error);
      return {
        success: false,
        reason: `Verification error: ${error.message}`,
        embedCount: 0
      };
    }
  }

  /**
   * Handle job errors with categorization and retry logic
   */
  private async handleJobError(job: Job<AnimeJobData>, error: any, processingTime: number): Promise<void> {
    const { title, anilistId } = job.data;
    const errorMessage = error.message || error.toString();
    
    // Categorize the error
    let errorType = "unknown";
    if (errorMessage.includes("Rate limit") || errorMessage.includes("429")) {
      errorType = "rate_limit";
    } else if (errorMessage.includes("mappings")) {
      errorType = "mapping_failed";
    } else if (errorMessage.includes("not found")) {
      errorType = "not_found";
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
      errorType = "network_error";
    } else if (errorMessage.includes("parse") || errorMessage.includes("JSON")) {
      errorType = "parse_error";
    }

    // Record the error
    await this.bulkScraperService.recordError(errorType);
    await this.bulkScraperService.updateProgress(false, processingTime);

    // Log the error with context
    logger.error(`❌ Failed to process ${title}`, {
      anilistId,
      errorType,
      error: errorMessage,
      processingTime: `${processingTime}ms`,
      attempt: `${(job.data.retryCount || 0) + 1}/3`,
      jobId: job.id
    });

    // For certain errors, we might want to handle them differently
    if (errorType === "rate_limit") {
      // For rate limit errors, add extra delay before retry
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else if (errorType === "not_found") {
      // For not found errors, don't retry
      logger.warn(`🚫 Anime ${title} not found, skipping retries`);
      throw new Error(`SKIP_RETRY: ${errorMessage}`);
    }

    // Re-throw the error for BullMQ's retry mechanism
    throw error;
  }

  /**
   * Setup event handlers for the worker
   */
  private setupEventHandlers(): void {
    this.worker.on("completed", (job) => {
      logger.debug(`Job ${job.id} completed`, {
        worker: this.WORKER_NAME,
        anime: job.data.title
      });
    });

    this.worker.on("failed", (job, err) => {
      if (job) {
        logger.error(`Job ${job.id} failed`, {
          worker: this.WORKER_NAME,
          anime: job.data.title,
          error: err.message,
          attempts: job.attemptsMade
        });
      }
    });

    this.worker.on("stalled", (jobId) => {
      logger.warn(`Job ${jobId} stalled`, {
        worker: this.WORKER_NAME
      });
    });

    this.worker.on("error", (err) => {
      logger.error(`Worker ${this.WORKER_NAME} error:`, err);
    });

    this.worker.on("ready", () => {
      logger.info(`Worker ${this.WORKER_NAME} is ready`);
    });

    this.worker.on("closing", () => {
      logger.info(`Worker ${this.WORKER_NAME} is closing`);
    });
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(): Promise<{
    processed: number;
    failed: number;
    active: number;
    waiting: number;
  }> {
    return {
      processed: await this.worker.getMetrics().then(m => m.processed.count),
      failed: await this.worker.getMetrics().then(m => m.failed.count),
      active: await this.worker.getMetrics().then(m => m.active.count),
      waiting: await this.worker.getMetrics().then(m => m.waiting.count),
    };
  }

  /**
   * Pause the worker
   */
  async pause(): Promise<void> {
    await this.worker.pause();
    logger.info(`Worker ${this.WORKER_NAME} paused`);
  }

  /**
   * Resume the worker
   */
  async resume(): Promise<void> {
    await this.worker.resume();
    logger.info(`Worker ${this.WORKER_NAME} resumed`);
  }

  /**
   * Close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    logger.info(`Worker ${this.WORKER_NAME} closed`);
  }

  /**
   * Get the worker instance
   */
  getWorker(): Worker {
    return this.worker;
  }
}