import { Queue, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import Anime from "../models/anime";
import { MappingService } from "./mapping.service";

export interface AnimeJobData {
  animeId: string;
  anilistId: number;
  title: string;
  episodes?: number;
  priority: number;
  retryCount?: number;
}

export interface BulkScrapingProgress {
  totalAnime: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  startTime: number;
  estimatedCompletion?: number;
  successRate: number;
}

export interface BulkScrapingStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgProcessingTime: number;
  topErrors: { [key: string]: number };
}

export class BulkEmbedScraperService {
  private queue: Queue;
  private mappingService: MappingService;
  private readonly QUEUE_NAME = "bulk-embed-scraping";
  private readonly PROGRESS_KEY = "bulk-scraping:progress";
  private readonly STATS_KEY = "bulk-scraping:stats";
  private readonly CHECKPOINT_KEY = "bulk-scraping:checkpoint";

  constructor() {
    this.queue = new Queue(this.QUEUE_NAME, { 
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
      }
    });
    this.mappingService = new MappingService();
  }

  /**
   * Initialize and start the bulk scraping process
   */
  async startBulkScraping(options: {
    resumeFromCheckpoint?: boolean;
    prioritizeRecent?: boolean;
    maxConcurrency?: number;
  } = {}): Promise<void> {
    const { resumeFromCheckpoint = true, prioritizeRecent = true, maxConcurrency = 3 } = options;

    logger.info("🚀 Starting bulk embed scraping process", { options });

    // Check if we should resume from checkpoint
    if (resumeFromCheckpoint) {
      const checkpoint = await this.getCheckpoint();
      if (checkpoint && checkpoint.inProgress) {
        logger.info("📍 Resuming from previous checkpoint", { 
          completed: checkpoint.completed,
          total: checkpoint.totalAnime 
        });
        return;
      }
    }

    // Get all anime from database
    const allAnime = await this.getAllAnimeForScraping();
    logger.info(`📊 Found ${allAnime.length} anime to process`);

    // Initialize progress tracking
    await this.initializeProgress(allAnime.length);

    // Create jobs with priorities
    const jobs = await this.createPrioritizedJobs(allAnime, prioritizeRecent);
    
    // Add jobs to queue in batches to avoid memory issues
    await this.addJobsInBatches(jobs, 500);

    logger.info(`✅ Created ${jobs.length} jobs in queue`);
  }

  /**
   * Get all anime that need embed scraping
   */
  private async getAllAnimeForScraping(): Promise<any[]> {
    try {
      // Get anime that are RELEASING or have high popularity
      const anime = await Anime.find({
        $and: [
          { idAnilist: { $exists: true, $ne: null } },
          {
            $or: [
              { status: "RELEASING" },
              { popularity: { $gte: 1000 } },
              { averageScore: { $gte: 70 } }
            ]
          }
        ]
      }).select('_id idAnilist title episodes status popularity averageScore').lean();

      // Filter out anime that already have complete embed data
      const animeNeedingScraping = [];
      
      for (const a of anime) {
        const hasCompleteEmbeds = await this.checkExistingEmbeds(a.idAnilist);
        if (!hasCompleteEmbeds) {
          animeNeedingScraping.push(a);
        }
      }

      return animeNeedingScraping;
    } catch (error) {
      logger.error("Error getting anime for scraping:", error);
      throw error;
    }
  }

  /**
   * Check if anime already has complete embed data
   */
  private async checkExistingEmbeds(anilistId: number): Promise<boolean> {
    try {
      const pattern = `anime:${anilistId}:*:*`;
      const keys = await redis.keys(pattern);
      
      // If anime has both SUB and DUB embeds for multiple episodes, consider it complete
      const subKeys = keys.filter(key => key.includes(':SUB:'));
      const dubKeys = keys.filter(key => key.includes(':DUB:'));
      
      return subKeys.length > 0 && dubKeys.length > 0;
    } catch (error) {
      logger.warn(`Error checking existing embeds for ${anilistId}:`, error);
      return false;
    }
  }

  /**
   * Create prioritized jobs based on anime metadata
   */
  private async createPrioritizedJobs(anime: any[], prioritizeRecent: boolean): Promise<AnimeJobData[]> {
    const jobs: AnimeJobData[] = anime.map(a => {
      let priority = 0;
      
      // Higher priority for currently releasing anime
      if (a.status === "RELEASING") priority += 100;
      
      // Higher priority for popular anime
      if (a.popularity > 10000) priority += 50;
      else if (a.popularity > 5000) priority += 30;
      else if (a.popularity > 1000) priority += 10;
      
      // Higher priority for high-rated anime
      if (a.averageScore > 85) priority += 30;
      else if (a.averageScore > 75) priority += 20;
      else if (a.averageScore > 65) priority += 10;
      
      // Add some randomness to prevent always processing the same anime first
      priority += Math.floor(Math.random() * 10);

      const title = a.title?.romaji || a.title?.english || a.title?.native || "Unknown";

      return {
        animeId: a._id.toString(),
        anilistId: a.idAnilist,
        title,
        episodes: a.episodes,
        priority,
        retryCount: 0
      };
    });

    // Sort by priority (higher first)
    jobs.sort((a, b) => b.priority - a.priority);

    return jobs;
  }

  /**
   * Add jobs to queue in batches to manage memory
   */
  private async addJobsInBatches(jobs: AnimeJobData[], batchSize: number): Promise<void> {
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      const queueJobs = batch.map(job => ({
        name: `scrape-anime-${job.anilistId}`,
        data: job,
        opts: {
          priority: job.priority,
          jobId: `anime-${job.anilistId}`, // Prevent duplicate jobs
        }
      }));

      await this.queue.addBulk(queueJobs);
      
      logger.debug(`Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)}`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Initialize progress tracking
   */
  private async initializeProgress(totalAnime: number): Promise<void> {
    const progress: BulkScrapingProgress = {
      totalAnime,
      completed: 0,
      failed: 0,
      inProgress: 0,
      pending: totalAnime,
      startTime: Date.now(),
      successRate: 0
    };

    await redis.set(this.PROGRESS_KEY, JSON.stringify(progress));
    
    const stats: BulkScrapingStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgProcessingTime: 0,
      topErrors: {}
    };

    await redis.set(this.STATS_KEY, JSON.stringify(stats));
  }

  /**
   * Update progress after job completion
   */
  async updateProgress(success: boolean, processingTime?: number): Promise<void> {
    try {
      const progressData = await redis.get(this.PROGRESS_KEY);
      if (!progressData) return;

      const progress: BulkScrapingProgress = JSON.parse(progressData);
      
      if (success) {
        progress.completed++;
      } else {
        progress.failed++;
      }
      
      progress.pending = progress.totalAnime - progress.completed - progress.failed;
      progress.successRate = progress.totalAnime > 0 ? 
        (progress.completed / (progress.completed + progress.failed)) * 100 : 0;

      // Calculate ETA
      if (progress.completed > 0) {
        const elapsed = Date.now() - progress.startTime;
        const avgTimePerAnime = elapsed / progress.completed;
        progress.estimatedCompletion = Date.now() + (progress.pending * avgTimePerAnime);
      }

      await redis.set(this.PROGRESS_KEY, JSON.stringify(progress));

      // Update stats if processing time provided
      if (processingTime) {
        await this.updateStats(success, processingTime);
      }

    } catch (error) {
      logger.error("Error updating progress:", error);
    }
  }

  /**
   * Update detailed statistics
   */
  private async updateStats(success: boolean, processingTime: number): Promise<void> {
    try {
      const statsData = await redis.get(this.STATS_KEY);
      if (!statsData) return;

      const stats: BulkScrapingStats = JSON.parse(statsData);
      
      stats.totalRequests++;
      if (success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
      }

      // Update average processing time
      stats.avgProcessingTime = ((stats.avgProcessingTime * (stats.totalRequests - 1)) + processingTime) / stats.totalRequests;

      await redis.set(this.STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      logger.error("Error updating stats:", error);
    }
  }

  /**
   * Record error for analysis
   */
  async recordError(errorType: string): Promise<void> {
    try {
      const statsData = await redis.get(this.STATS_KEY);
      if (!statsData) return;

      const stats: BulkScrapingStats = JSON.parse(statsData);
      stats.topErrors[errorType] = (stats.topErrors[errorType] || 0) + 1;

      await redis.set(this.STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      logger.error("Error recording error:", error);
    }
  }

  /**
   * Get current progress
   */
  async getProgress(): Promise<BulkScrapingProgress | null> {
    try {
      const data = await redis.get(this.PROGRESS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("Error getting progress:", error);
      return null;
    }
  }

  /**
   * Get current statistics
   */
  async getStats(): Promise<BulkScrapingStats | null> {
    try {
      const data = await redis.get(this.STATS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("Error getting stats:", error);
      return null;
    }
  }

  /**
   * Get checkpoint data for resuming
   */
  private async getCheckpoint(): Promise<any> {
    try {
      const data = await redis.get(this.CHECKPOINT_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("Error getting checkpoint:", error);
      return null;
    }
  }

  /**
   * Save checkpoint
   */
  async saveCheckpoint(): Promise<void> {
    try {
      const progress = await this.getProgress();
      if (progress) {
        await redis.set(this.CHECKPOINT_KEY, JSON.stringify({
          ...progress,
          timestamp: Date.now(),
          inProgress: progress.pending > 0
        }));
      }
    } catch (error) {
      logger.error("Error saving checkpoint:", error);
    }
  }

  /**
   * Clear all progress and restart
   */
  async clearProgress(): Promise<void> {
    try {
      await redis.del(this.PROGRESS_KEY);
      await redis.del(this.STATS_KEY);
      await redis.del(this.CHECKPOINT_KEY);
      
      // Clear the queue
      await this.queue.obliterate({ force: true });
      
      logger.info("🧹 Cleared all progress data and queue");
    } catch (error) {
      logger.error("Error clearing progress:", error);
      throw error;
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return {
      waiting: await this.queue.getWaiting().then(jobs => jobs.length),
      active: await this.queue.getActive().then(jobs => jobs.length),
      completed: await this.queue.getCompleted().then(jobs => jobs.length),
      failed: await this.queue.getFailed().then(jobs => jobs.length),
      delayed: await this.queue.getDelayed().then(jobs => jobs.length),
    };
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(maxRetries: number = 3): Promise<void> {
    try {
      const failedJobs = await this.queue.getFailed();
      let retriedCount = 0;

      for (const job of failedJobs) {
        const data = job.data as AnimeJobData;
        if ((data.retryCount || 0) < maxRetries) {
          data.retryCount = (data.retryCount || 0) + 1;
          await job.retry();
          retriedCount++;
        }
      }

      logger.info(`♻️ Retried ${retriedCount} failed jobs`);
    } catch (error) {
      logger.error("Error retrying failed jobs:", error);
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.queue.pause();
    logger.info("⏸️ Queue paused");
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.queue.resume();
    logger.info("▶️ Queue resumed");
  }

  /**
   * Get the queue instance for worker setup
   */
  getQueue(): Queue {
    return this.queue;
  }
}