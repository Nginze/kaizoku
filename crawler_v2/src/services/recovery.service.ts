import { Queue, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { BulkEmbedScraperService, AnimeJobData } from "./bulk-embed-scraper.service";
import { MonitoringService } from "./monitoring.service";
import Anime from "../models/anime";

export interface RecoveryStrategy {
  name: string;
  description: string;
  canHandle: (error: string, jobData: AnimeJobData) => boolean;
  recover: (job: Job<AnimeJobData>, error: string) => Promise<boolean>;
}

export interface RecoveryReport {
  timestamp: number;
  totalFailedJobs: number;
  recoveredJobs: number;
  unrecoverableJobs: number;
  strategiesApplied: { [strategyName: string]: number };
  errorCategories: { [category: string]: number };
  recommendations: string[];
}

export class RecoveryService {
  private bulkScraperService: BulkEmbedScraperService;
  private monitoringService: MonitoringService;
  private queue: Queue;
  private recoveryStrategies: RecoveryStrategy[];

  constructor() {
    this.bulkScraperService = new BulkEmbedScraperService();
    this.monitoringService = new MonitoringService();
    this.queue = this.bulkScraperService.getQueue();
    this.setupRecoveryStrategies();
  }

  /**
   * Setup recovery strategies for different error types
   */
  private setupRecoveryStrategies(): void {
    this.recoveryStrategies = [
      {
        name: "rate_limit_recovery",
        description: "Handle rate limit errors with increased delays",
        canHandle: (error: string) => 
          error.includes("rate limit") || 
          error.includes("429") || 
          error.includes("Too Many Requests"),
        recover: async (job: Job<AnimeJobData>, error: string) => {
          // Add job back with delay and reduced priority
          const delay = this.calculateRateLimitDelay(job.attemptsMade);
          const newJobData = {
            ...job.data,
            priority: Math.max(0, job.data.priority - 20),
            retryCount: (job.data.retryCount || 0) + 1
          };

          await this.queue.add(
            `recovery-${job.data.anilistId}`,
            newJobData,
            {
              delay,
              priority: newJobData.priority,
              jobId: `recovery-anime-${job.data.anilistId}-${Date.now()}`
            }
          );

          logger.info(`♻️ Rate limit recovery: Re-queued ${job.data.title} with ${delay}ms delay`);
          return true;
        }
      },

      {
        name: "mapping_recovery",
        description: "Regenerate mappings for failed mapping errors",
        canHandle: (error: string) =>
          error.includes("mapping") ||
          error.includes("not found") ||
          error.includes("No aniwatch mapping"),
        recover: async (job: Job<AnimeJobData>, error: string) => {
          try {
            // Clear existing mapping cache
            await redis.del(`mappings:${job.data.anilistId}`);
            
            // Force regeneration on next attempt
            const newJobData = {
              ...job.data,
              retryCount: (job.data.retryCount || 0) + 1,
              priority: job.data.priority - 10
            };

            await this.queue.add(
              `mapping-recovery-${job.data.anilistId}`,
              newJobData,
              {
                delay: 5000, // 5 second delay
                priority: newJobData.priority,
                jobId: `mapping-recovery-${job.data.anilistId}-${Date.now()}`
              }
            );

            logger.info(`🔗 Mapping recovery: Cleared cache and re-queued ${job.data.title}`);
            return true;
          } catch (recoveryError) {
            logger.error(`Failed mapping recovery for ${job.data.title}:`, recoveryError);
            return false;
          }
        }
      },

      {
        name: "network_recovery",
        description: "Retry network errors with exponential backoff",
        canHandle: (error: string) =>
          error.includes("network") ||
          error.includes("timeout") ||
          error.includes("ECONNRESET") ||
          error.includes("ENOTFOUND") ||
          error.includes("socket"),
        recover: async (job: Job<AnimeJobData>, error: string) => {
          const retryCount = (job.data.retryCount || 0) + 1;
          if (retryCount > 5) {
            logger.warn(`🚫 Network recovery: Max retries exceeded for ${job.data.title}`);
            return false;
          }

          const delay = Math.min(30000, Math.pow(2, retryCount) * 1000); // Max 30s delay
          const newJobData = {
            ...job.data,
            retryCount,
            priority: Math.max(0, job.data.priority - 5)
          };

          await this.queue.add(
            `network-recovery-${job.data.anilistId}`,
            newJobData,
            {
              delay,
              priority: newJobData.priority,
              jobId: `network-recovery-${job.data.anilistId}-${Date.now()}`
            }
          );

          logger.info(`🌐 Network recovery: Re-queued ${job.data.title} (attempt ${retryCount}/5)`);
          return true;
        }
      },

      {
        name: "parse_error_recovery",
        description: "Handle JSON parse errors by checking data integrity",
        canHandle: (error: string) =>
          error.includes("parse") ||
          error.includes("JSON") ||
          error.includes("Unexpected token"),
        recover: async (job: Job<AnimeJobData>, error: string) => {
          try {
            // Check if the anime data in database is corrupted
            const anime = await Anime.findById(job.data.animeId);
            if (!anime || !anime.idAnilist) {
              logger.error(`❌ Parse recovery: Anime ${job.data.title} has corrupted data`);
              return false;
            }

            // Clear any potentially corrupted cache data
            const pattern = `anime:${job.data.anilistId}:*`;
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
              await redis.del(...keys);
              logger.info(`🧹 Parse recovery: Cleared corrupted cache for ${job.data.title}`);
            }

            // Re-queue with fresh start
            const newJobData = {
              ...job.data,
              retryCount: (job.data.retryCount || 0) + 1,
              priority: job.data.priority - 15
            };

            await this.queue.add(
              `parse-recovery-${job.data.anilistId}`,
              newJobData,
              {
                delay: 3000,
                priority: newJobData.priority,
                jobId: `parse-recovery-${job.data.anilistId}-${Date.now()}`
              }
            );

            logger.info(`🔧 Parse recovery: Cleared cache and re-queued ${job.data.title}`);
            return true;
          } catch (recoveryError) {
            logger.error(`Failed parse recovery for ${job.data.title}:`, recoveryError);
            return false;
          }
        }
      },

      {
        name: "missing_anime_recovery",
        description: "Handle missing anime data errors",
        canHandle: (error: string) =>
          error.includes("Anime not found") ||
          error.includes("not found in database"),
        recover: async (job: Job<AnimeJobData>, error: string) => {
          try {
            // Check if anime exists in database
            const anime = await Anime.findById(job.data.animeId);
            if (!anime) {
              logger.warn(`🚫 Missing anime recovery: ${job.data.title} not found in database, skipping`);
              return false; // Don't retry if anime doesn't exist
            }

            // If anime exists but has issues, try once more
            const newJobData = {
              ...job.data,
              retryCount: (job.data.retryCount || 0) + 1
            };

            if (newJobData.retryCount > 1) {
              logger.warn(`🚫 Missing anime recovery: Max retries for ${job.data.title}`);
              return false;
            }

            await this.queue.add(
              `missing-recovery-${job.data.anilistId}`,
              newJobData,
              {
                delay: 2000,
                jobId: `missing-recovery-${job.data.anilistId}-${Date.now()}`
              }
            );

            logger.info(`📋 Missing anime recovery: Re-queued ${job.data.title}`);
            return true;
          } catch (recoveryError) {
            logger.error(`Failed missing anime recovery for ${job.data.title}:`, recoveryError);
            return false;
          }
        }
      },

      {
        name: "generic_recovery",
        description: "Generic recovery strategy for unknown errors",
        canHandle: () => true, // Always can handle (fallback)
        recover: async (job: Job<AnimeJobData>, error: string) => {
          const retryCount = (job.data.retryCount || 0) + 1;
          if (retryCount > 2) {
            logger.warn(`🚫 Generic recovery: Max retries exceeded for ${job.data.title}`);
            return false;
          }

          const delay = retryCount * 10000; // 10s, 20s delays
          const newJobData = {
            ...job.data,
            retryCount,
            priority: Math.max(0, job.data.priority - 30)
          };

          await this.queue.add(
            `generic-recovery-${job.data.anilistId}`,
            newJobData,
            {
              delay,
              priority: newJobData.priority,
              jobId: `generic-recovery-${job.data.anilistId}-${Date.now()}`
            }
          );

          logger.info(`🔄 Generic recovery: Re-queued ${job.data.title} (attempt ${retryCount}/2)`);
          return true;
        }
      }
    ];
  }

  /**
   * Run automatic recovery for all failed jobs
   */
  async runAutoRecovery(): Promise<RecoveryReport> {
    logger.info("🔧 Starting automatic recovery process");

    const startTime = Date.now();
    const failedJobs = await this.queue.getFailed();
    
    const report: RecoveryReport = {
      timestamp: startTime,
      totalFailedJobs: failedJobs.length,
      recoveredJobs: 0,
      unrecoverableJobs: 0,
      strategiesApplied: {},
      errorCategories: {},
      recommendations: []
    };

    for (const job of failedJobs) {
      try {
        const error = job.failedReason || "Unknown error";
        const errorCategory = this.categorizeError(error);
        
        report.errorCategories[errorCategory] = (report.errorCategories[errorCategory] || 0) + 1;

        // Find appropriate recovery strategy
        const strategy = this.recoveryStrategies.find(s => s.canHandle(error, job.data));
        
        if (strategy) {
          const recovered = await strategy.recover(job, error);
          
          if (recovered) {
            report.recoveredJobs++;
            report.strategiesApplied[strategy.name] = (report.strategiesApplied[strategy.name] || 0) + 1;
            
            // Remove the failed job since we've re-queued it
            await job.remove();
          } else {
            report.unrecoverableJobs++;
          }
        } else {
          report.unrecoverableJobs++;
        }

      } catch (recoveryError) {
        logger.error(`Error during recovery of job ${job.id}:`, recoveryError);
        report.unrecoverableJobs++;
      }
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    const duration = Date.now() - startTime;
    logger.info(`✅ Recovery completed in ${duration}ms`, {
      recovered: report.recoveredJobs,
      unrecoverable: report.unrecoverableJobs,
      total: report.totalFailedJobs
    });

    return report;
  }

  /**
   * Manually recover specific failed jobs by anime IDs
   */
  async recoverSpecificAnime(anilistIds: number[]): Promise<{ [anilistId: number]: boolean }> {
    const results: { [anilistId: number]: boolean } = {};
    const failedJobs = await this.queue.getFailed();

    for (const anilistId of anilistIds) {
      const job = failedJobs.find(j => j.data.anilistId === anilistId);
      
      if (!job) {
        logger.warn(`No failed job found for anime ID ${anilistId}`);
        results[anilistId] = false;
        continue;
      }

      try {
        const error = job.failedReason || "Unknown error";
        const strategy = this.recoveryStrategies.find(s => s.canHandle(error, job.data));
        
        if (strategy) {
          const recovered = await strategy.recover(job, error);
          results[anilistId] = recovered;
          
          if (recovered) {
            await job.remove();
            logger.info(`✅ Manually recovered ${job.data.title}`);
          }
        } else {
          results[anilistId] = false;
        }
      } catch (error) {
        logger.error(`Manual recovery failed for anime ${anilistId}:`, error);
        results[anilistId] = false;
      }
    }

    return results;
  }

  /**
   * Clean up unrecoverable jobs
   */
  async cleanupUnrecoverableJobs(dryRun: boolean = true): Promise<{
    wouldRemove: number;
    actuallyRemoved: number;
    jobs: { anilistId: number; title: string; error: string }[];
  }> {
    const failedJobs = await this.queue.getFailed();
    const unrecoverableJobs: { anilistId: number; title: string; error: string }[] = [];
    
    for (const job of failedJobs) {
      const error = job.failedReason || "Unknown error";
      const retryCount = job.data.retryCount || 0;
      
      // Consider unrecoverable if:
      // 1. Too many retries
      // 2. Anime not found errors
      // 3. Invalid data errors that can't be fixed
      const isUnrecoverable = 
        retryCount > 5 ||
        error.includes("SKIP_RETRY") ||
        error.includes("Anime not found") ||
        (error.includes("Invalid anime data") && retryCount > 2);

      if (isUnrecoverable) {
        unrecoverableJobs.push({
          anilistId: job.data.anilistId,
          title: job.data.title,
          error
        });

        if (!dryRun) {
          await job.remove();
        }
      }
    }

    logger.info(`🧹 Cleanup${dryRun ? ' (dry run)' : ''}: Found ${unrecoverableJobs.length} unrecoverable jobs`);

    return {
      wouldRemove: unrecoverableJobs.length,
      actuallyRemoved: dryRun ? 0 : unrecoverableJobs.length,
      jobs: unrecoverableJobs
    };
  }

  /**
   * Get recovery statistics and health status
   */
  async getRecoveryHealth(): Promise<{
    failedJobsCount: number;
    recoverableJobs: number;
    unrecoverableJobs: number;
    errorBreakdown: { [category: string]: number };
    recommendedActions: string[];
  }> {
    const failedJobs = await this.queue.getFailed();
    const errorBreakdown: { [category: string]: number } = {};
    let recoverableJobs = 0;
    let unrecoverableJobs = 0;

    for (const job of failedJobs) {
      const error = job.failedReason || "Unknown error";
      const category = this.categorizeError(error);
      errorBreakdown[category] = (errorBreakdown[category] || 0) + 1;

      const strategy = this.recoveryStrategies.find(s => s.canHandle(error, job.data));
      const retryCount = job.data.retryCount || 0;

      if (strategy && retryCount < 5 && !error.includes("SKIP_RETRY")) {
        recoverableJobs++;
      } else {
        unrecoverableJobs++;
      }
    }

    const recommendedActions = this.generateRecommendations({
      totalFailedJobs: failedJobs.length,
      recoveredJobs: 0,
      unrecoverableJobs,
      strategiesApplied: {},
      errorCategories: errorBreakdown,
      recommendations: [],
      timestamp: Date.now()
    });

    return {
      failedJobsCount: failedJobs.length,
      recoverableJobs,
      unrecoverableJobs,
      errorBreakdown,
      recommendedActions
    };
  }

  /**
   * Calculate delay for rate limit recovery
   */
  private calculateRateLimitDelay(attemptsMade: number): number {
    const baseDelay = 60000; // 1 minute
    const exponentialFactor = Math.pow(2, attemptsMade - 1);
    const maxDelay = 300000; // 5 minutes
    
    return Math.min(baseDelay * exponentialFactor, maxDelay);
  }

  /**
   * Categorize error types for analysis
   */
  private categorizeError(error: string): string {
    if (error.includes("rate limit") || error.includes("429")) return "rate_limit";
    if (error.includes("mapping") || error.includes("not found")) return "mapping";
    if (error.includes("network") || error.includes("timeout")) return "network";
    if (error.includes("parse") || error.includes("JSON")) return "parse";
    if (error.includes("Anime not found")) return "missing_anime";
    if (error.includes("validation") || error.includes("Invalid")) return "validation";
    return "unknown";
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(report: RecoveryReport): string[] {
    const recommendations: string[] = [];
    const totalErrors = report.totalFailedJobs;

    if (totalErrors === 0) {
      recommendations.push("✅ No failed jobs detected - system is healthy");
      return recommendations;
    }

    // Rate limit recommendations
    const rateLimitErrors = report.errorCategories.rate_limit || 0;
    if (rateLimitErrors > totalErrors * 0.3) {
      recommendations.push("⚠️ High rate limit errors - consider reducing worker concurrency");
      recommendations.push("🔧 Increase delays between requests or add more workers with lower concurrency");
    }

    // Mapping recommendations
    const mappingErrors = report.errorCategories.mapping || 0;
    if (mappingErrors > totalErrors * 0.2) {
      recommendations.push("🔗 High mapping failures - check anime title matching accuracy");
      recommendations.push("💡 Consider improving title similarity algorithm or manual mapping review");
    }

    // Network recommendations
    const networkErrors = report.errorCategories.network || 0;
    if (networkErrors > totalErrors * 0.2) {
      recommendations.push("🌐 High network errors - check internet connection stability");
      recommendations.push("🔧 Consider implementing connection pooling or proxy rotation");
    }

    // Parse error recommendations
    const parseErrors = report.errorCategories.parse || 0;
    if (parseErrors > totalErrors * 0.1) {
      recommendations.push("📝 Parse errors detected - check data integrity and API response format");
      recommendations.push("🧹 Consider clearing corrupted cache data");
    }

    // Recovery success rate
    const successRate = totalErrors > 0 ? (report.recoveredJobs / totalErrors) * 100 : 0;
    if (successRate < 50) {
      recommendations.push("❌ Low recovery success rate - manual investigation recommended");
    } else if (successRate > 80) {
      recommendations.push("✅ Good recovery success rate - system is resilient");
    }

    // General recommendations
    if (report.unrecoverableJobs > 100) {
      recommendations.push("🧹 Consider cleaning up unrecoverable jobs to improve queue performance");
    }

    if (recommendations.length === 0) {
      recommendations.push("📊 Error patterns are within normal ranges");
    }

    return recommendations;
  }

  /**
   * Schedule automatic recovery to run periodically
   */
  async scheduleAutoRecovery(intervalMinutes: number = 30): Promise<void> {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        const failedCount = await this.queue.getFailed().then(jobs => jobs.length);
        if (failedCount > 0) {
          logger.info(`🔧 Running scheduled recovery for ${failedCount} failed jobs`);
          await this.runAutoRecovery();
        }
      } catch (error) {
        logger.error("Error in scheduled recovery:", error);
      }
    }, intervalMs);

    logger.info(`⏰ Scheduled automatic recovery every ${intervalMinutes} minutes`);
  }
}