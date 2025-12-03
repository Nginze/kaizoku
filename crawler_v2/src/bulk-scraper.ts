#!/usr/bin/env node

/**
 * Bulk Anime Embed Scraper
 * 
 * A comprehensive, fault-tolerant system for scraping anime episode embeds
 * from streaming providers and storing them in Redis cache.
 * 
 * Features:
 * - Multi-worker processing with BullMQ
 * - Comprehensive error recovery
 * - Real-time monitoring and progress tracking
 * - Rate limiting and retry mechanisms
 * - CLI interface for easy management
 * 
 * Usage:
 *   npm run bulk-scraper start
 *   npm run bulk-scraper status
 *   npm run bulk-scraper monitor
 * 
 * For interactive setup:
 *   npm run bulk-scraper config
 */

import { config } from "dotenv";
import { BulkEmbedScraperService } from "./services/bulk-embed-scraper.service";
import { EmbedWorker } from "./workers/embed-worker";
import { MonitoringService } from "./services/monitoring.service";
import { RecoveryService } from "./services/recovery.service";
import { logger } from "./config/logger";
import { connectDB, disconnectDB } from "./config/mongo";
import { redis } from "./config/redis";

// Load environment variables
config();

/**
 * Simple programmatic interface for bulk scraping
 * Use this if you want to integrate with other Node.js applications
 */
export class BulkScraper {
  private bulkScraperService: BulkEmbedScraperService;
  private monitoringService: MonitoringService;
  private recoveryService: RecoveryService;
  private workers: EmbedWorker[] = [];

  constructor() {
    this.bulkScraperService = new BulkEmbedScraperService();
    this.monitoringService = new MonitoringService();
    this.recoveryService = new RecoveryService();
  }

  /**
   * Start bulk scraping with simple configuration
   */
  async start(options: {
    workers?: number;
    enableMonitoring?: boolean;
    enableAutoRecovery?: boolean;
    resumeFromCheckpoint?: boolean;
  } = {}): Promise<void> {
    const {
      workers = 3,
      enableMonitoring = true,
      enableAutoRecovery = true,
      resumeFromCheckpoint = true
    } = options;

    logger.info("🚀 Starting bulk anime embed scraper", { workers, enableMonitoring, enableAutoRecovery });

    try {
      // Initialize database connections
      await this.initializeConnections();

      // Initialize bulk scraping
      await this.bulkScraperService.startBulkScraping({
        resumeFromCheckpoint,
        prioritizeRecent: true,
        maxConcurrency: workers
      });

      // Start workers
      for (let i = 0; i < workers; i++) {
        const worker = new EmbedWorker(1, `worker-${i + 1}`);
        this.workers.push(worker);
        
        if (enableMonitoring) {
          await this.monitoringService.registerWorker(`embed-worker-worker-${i + 1}`);
        }
      }

      // Start monitoring
      if (enableMonitoring) {
        await this.monitoringService.startMonitoring();
      }

      // Start auto-recovery
      if (enableAutoRecovery) {
        await this.recoveryService.scheduleAutoRecovery();
      }

      logger.info(`✅ Bulk scraper started successfully with ${workers} workers`);

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error("Failed to start bulk scraper:", error);
      throw error;
    }
  }

  /**
   * Get current progress
   */
  async getProgress() {
    return await this.bulkScraperService.getProgress();
  }

  /**
   * Get current statistics
   */
  async getStats() {
    return await this.bulkScraperService.getStats();
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    return await this.bulkScraperService.getQueueStatus();
  }

  /**
   * Pause the scraping process
   */
  async pause(): Promise<void> {
    await this.bulkScraperService.pauseQueue();
    for (const worker of this.workers) {
      await worker.pause();
    }
    logger.info("⏸️ Bulk scraper paused");
  }

  /**
   * Resume the scraping process
   */
  async resume(): Promise<void> {
    await this.bulkScraperService.resumeQueue();
    for (const worker of this.workers) {
      await worker.resume();
    }
    logger.info("▶️ Bulk scraper resumed");
  }

  /**
   * Initialize database connections
   */
  private async initializeConnections(): Promise<void> {
    logger.info("🔌 Initializing database connections...");

    try {
      // Connect to MongoDB
      await connectDB();
      logger.info("✅ MongoDB connected successfully");

      // Test Redis connection
      await redis.ping();
      logger.info("✅ Redis connected successfully");

    } catch (error) {
      logger.error("❌ Database connection failed:", error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Stop the scraping process
   */
  async stop(): Promise<void> {
    logger.info("🛑 Stopping bulk scraper...");

    try {
      // Stop monitoring
      this.monitoringService.stopMonitoring();

      // Close workers
      await Promise.all(this.workers.map(worker => worker.close()));

      // Save checkpoint
      await this.bulkScraperService.saveCheckpoint();

      // Close database connections
      await this.closeConnections();

      logger.info("✅ Bulk scraper stopped successfully");
    } catch (error) {
      logger.error("❌ Error during shutdown:", error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  private async closeConnections(): Promise<void> {
    try {
      logger.info("🔌 Closing database connections...");
      
      // Close MongoDB connection
      await disconnectDB();
      logger.info("✅ MongoDB disconnected");

      // Close Redis connection
      redis.disconnect();
      logger.info("✅ Redis disconnected");

    } catch (error) {
      logger.warn("⚠️ Error closing database connections:", error);
    }
  }

  /**
   * Run recovery for failed jobs
   */
  async runRecovery() {
    return await this.recoveryService.runAutoRecovery();
  }

  /**
   * Get detailed monitoring report
   */
  async getDetailedReport(): Promise<string> {
    return await this.monitoringService.getDetailedProgressReport();
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`⚠️ Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGUSR2", () => shutdown("SIGUSR2")); // For nodemon
  }
}

// If this file is run directly, start the CLI
if (require.main === module) {
  // Import and run CLI
  require("./cli/bulk-scraper-cli");
}

// Export the main class for programmatic use
export { BulkEmbedScraperService } from "./services/bulk-embed-scraper.service";
export { EmbedWorker } from "./workers/embed-worker";
export { MonitoringService } from "./services/monitoring.service";
export { RecoveryService } from "./services/recovery.service";