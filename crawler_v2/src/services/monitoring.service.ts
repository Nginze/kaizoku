import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { BulkEmbedScraperService, BulkScrapingProgress, BulkScrapingStats } from "./bulk-embed-scraper.service";

export interface MonitoringSnapshot {
  timestamp: number;
  progress: BulkScrapingProgress | null;
  stats: BulkScrapingStats | null;
  queueStatus: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  workers: WorkerStatus[];
  systemHealth: SystemHealth;
}

export interface WorkerStatus {
  workerId: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  processed: number;
  failed: number;
  activeJobs: number;
  lastActivity: number;
  avgProcessingTime: number;
}

export interface SystemHealth {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  redisConnection: boolean;
  queueHealth: 'healthy' | 'warning' | 'critical';
  estimatedTimeRemaining: string;
  throughput: {
    animePerHour: number;
    requestsPerMinute: number;
  };
}

export interface AlertConfig {
  enabled: boolean;
  failureRateThreshold: number; // percentage
  stalledJobsThreshold: number;
  memoryThresholdPercent: number;
  queueSizeThreshold: number;
}

export class MonitoringService {
  private bulkScraperService: BulkEmbedScraperService;
  private readonly MONITORING_KEY = "bulk-scraping:monitoring";
  private readonly WORKER_REGISTRY_KEY = "bulk-scraping:workers";
  private readonly ALERTS_CONFIG_KEY = "bulk-scraping:alerts-config";
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.bulkScraperService = new BulkEmbedScraperService();
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalMs: number = 10000): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info(`📊 Starting monitoring service (interval: ${intervalMs}ms)`);

    // Initial snapshot
    await this.takeSnapshot();

    // Set up continuous monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.takeSnapshot();
        await this.checkAlerts();
      } catch (error) {
        logger.error("Error in monitoring cycle:", error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info("📊 Monitoring service stopped");
    }
  }

  /**
   * Take a complete system snapshot
   */
  async takeSnapshot(): Promise<MonitoringSnapshot> {
    const timestamp = Date.now();

    const [progress, stats, queueStatus, workers, systemHealth] = await Promise.all([
      this.bulkScraperService.getProgress(),
      this.bulkScraperService.getStats(),
      this.bulkScraperService.getQueueStatus(),
      this.getWorkerStatuses(),
      this.getSystemHealth()
    ]);

    const snapshot: MonitoringSnapshot = {
      timestamp,
      progress,
      stats,
      queueStatus,
      workers,
      systemHealth
    };

    // Store snapshot for dashboard access
    await redis.set(this.MONITORING_KEY, JSON.stringify(snapshot), 'EX', 3600); // 1 hour expiry

    return snapshot;
  }

  /**
   * Get current monitoring snapshot
   */
  async getCurrentSnapshot(): Promise<MonitoringSnapshot | null> {
    try {
      const data = await redis.get(this.MONITORING_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("Error getting monitoring snapshot:", error);
      return null;
    }
  }

  /**
   * Get worker statuses
   */
  private async getWorkerStatuses(): Promise<WorkerStatus[]> {
    try {
      const workerKeys = await redis.keys("worker:embed-worker-*:status");
      const workers: WorkerStatus[] = [];

      for (const key of workerKeys) {
        const data = await redis.get(key);
        if (data) {
          const workerStatus = JSON.parse(data);
          workers.push(workerStatus);
        }
      }

      return workers;
    } catch (error) {
      logger.error("Error getting worker statuses:", error);
      return [];
    }
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memoryUsage.heapUsed;

    // Check Redis connection
    let redisConnection = true;
    try {
      await redis.ping();
    } catch {
      redisConnection = false;
    }

    // Get queue health
    const queueStatus = await this.bulkScraperService.getQueueStatus();
    let queueHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (queueStatus.failed > queueStatus.completed * 0.1) {
      queueHealth = 'warning';
    }
    if (queueStatus.failed > queueStatus.completed * 0.3) {
      queueHealth = 'critical';
    }

    // Calculate estimated time remaining
    const progress = await this.bulkScraperService.getProgress();
    let estimatedTimeRemaining = "Unknown";
    if (progress && progress.estimatedCompletion) {
      const remaining = progress.estimatedCompletion - Date.now();
      estimatedTimeRemaining = this.formatDuration(remaining);
    }

    // Calculate throughput
    const stats = await this.bulkScraperService.getStats();
    let animePerHour = 0;
    let requestsPerMinute = 0;

    if (progress && stats) {
      const elapsedHours = (Date.now() - progress.startTime) / (1000 * 60 * 60);
      if (elapsedHours > 0) {
        animePerHour = progress.completed / elapsedHours;
      }
      
      const elapsedMinutes = (Date.now() - progress.startTime) / (1000 * 60);
      if (elapsedMinutes > 0) {
        requestsPerMinute = stats.totalRequests / elapsedMinutes;
      }
    }

    return {
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100
      },
      redisConnection,
      queueHealth,
      estimatedTimeRemaining,
      throughput: {
        animePerHour: Math.round(animePerHour * 100) / 100,
        requestsPerMinute: Math.round(requestsPerMinute * 100) / 100
      }
    };
  }

  /**
   * Register a worker for monitoring
   */
  async registerWorker(workerId: string): Promise<void> {
    const workerStatus: WorkerStatus = {
      workerId,
      status: 'idle',
      processed: 0,
      failed: 0,
      activeJobs: 0,
      lastActivity: Date.now(),
      avgProcessingTime: 0
    };

    await redis.set(
      `worker:${workerId}:status`,
      JSON.stringify(workerStatus),
      'EX',
      300 // 5 minutes expiry (will be refreshed by worker heartbeat)
    );
  }

  /**
   * Update worker status
   */
  async updateWorkerStatus(workerId: string, update: Partial<WorkerStatus>): Promise<void> {
    try {
      const key = `worker:${workerId}:status`;
      const existingData = await redis.get(key);
      
      let currentStatus: WorkerStatus;
      if (existingData) {
        currentStatus = JSON.parse(existingData);
      } else {
        currentStatus = {
          workerId,
          status: 'idle',
          processed: 0,
          failed: 0,
          activeJobs: 0,
          lastActivity: Date.now(),
          avgProcessingTime: 0
        };
      }

      const updatedStatus: WorkerStatus = {
        ...currentStatus,
        ...update,
        lastActivity: Date.now()
      };

      await redis.set(key, JSON.stringify(updatedStatus), 'EX', 300);
    } catch (error) {
      logger.error(`Error updating worker status for ${workerId}:`, error);
    }
  }

  /**
   * Check for alerts based on configured thresholds
   */
  private async checkAlerts(): Promise<void> {
    try {
      const alertConfig = await this.getAlertConfig();
      if (!alertConfig.enabled) return;

      const snapshot = await this.getCurrentSnapshot();
      if (!snapshot) return;

      const alerts: string[] = [];

      // Check failure rate
      if (snapshot.progress && snapshot.progress.completed > 0) {
        const failureRate = (snapshot.progress.failed / (snapshot.progress.completed + snapshot.progress.failed)) * 100;
        if (failureRate > alertConfig.failureRateThreshold) {
          alerts.push(`High failure rate: ${failureRate.toFixed(1)}%`);
        }
      }

      // Check memory usage
      if (snapshot.systemHealth.memoryUsage.percentage > alertConfig.memoryThresholdPercent) {
        alerts.push(`High memory usage: ${snapshot.systemHealth.memoryUsage.percentage.toFixed(1)}%`);
      }

      // Check Redis connection
      if (!snapshot.systemHealth.redisConnection) {
        alerts.push("Redis connection lost");
      }

      // Check queue health
      if (snapshot.systemHealth.queueHealth === 'critical') {
        alerts.push("Queue health is critical");
      }

      // Check for stalled jobs
      if (snapshot.queueStatus.active > alertConfig.stalledJobsThreshold) {
        alerts.push(`High number of active jobs: ${snapshot.queueStatus.active}`);
      }

      // Send alerts if any
      if (alerts.length > 0) {
        await this.sendAlerts(alerts);
      }

    } catch (error) {
      logger.error("Error checking alerts:", error);
    }
  }

  /**
   * Send alerts (can be extended to support different channels)
   */
  private async sendAlerts(alerts: string[]): Promise<void> {
    logger.warn("🚨 BULK SCRAPING ALERTS:", alerts);
    
    // Here you could implement:
    // - Slack notifications
    // - Email alerts
    // - Discord webhooks
    // - etc.
  }

  /**
   * Get alert configuration
   */
  private async getAlertConfig(): Promise<AlertConfig> {
    try {
      const data = await redis.get(this.ALERTS_CONFIG_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error("Error getting alert config:", error);
    }

    // Default configuration
    return {
      enabled: true,
      failureRateThreshold: 20, // 20%
      stalledJobsThreshold: 10,
      memoryThresholdPercent: 85,
      queueSizeThreshold: 1000
    };
  }

  /**
   * Update alert configuration
   */
  async updateAlertConfig(config: Partial<AlertConfig>): Promise<void> {
    try {
      const currentConfig = await this.getAlertConfig();
      const updatedConfig = { ...currentConfig, ...config };
      await redis.set(this.ALERTS_CONFIG_KEY, JSON.stringify(updatedConfig));
      logger.info("Alert configuration updated", updatedConfig);
    } catch (error) {
      logger.error("Error updating alert config:", error);
    }
  }

  /**
   * Get detailed progress report
   */
  async getDetailedProgressReport(): Promise<string> {
    const snapshot = await this.getCurrentSnapshot();
    if (!snapshot) return "No monitoring data available";

    const { progress, stats, queueStatus, systemHealth } = snapshot;

    let report = "📊 BULK EMBED SCRAPING PROGRESS REPORT\n";
    report += "=" .repeat(50) + "\n\n";

    if (progress) {
      report += `📈 PROGRESS:\n`;
      report += `  Total Anime: ${progress.totalAnime.toLocaleString()}\n`;
      report += `  Completed: ${progress.completed.toLocaleString()} (${((progress.completed / progress.totalAnime) * 100).toFixed(2)}%)\n`;
      report += `  Failed: ${progress.failed.toLocaleString()}\n`;
      report += `  Pending: ${progress.pending.toLocaleString()}\n`;
      report += `  Success Rate: ${progress.successRate.toFixed(2)}%\n`;
      report += `  ETA: ${systemHealth.estimatedTimeRemaining}\n\n`;
    }

    if (stats) {
      report += `📊 STATISTICS:\n`;
      report += `  Total Requests: ${stats.totalRequests.toLocaleString()}\n`;
      report += `  Successful: ${stats.successfulRequests.toLocaleString()}\n`;
      report += `  Failed: ${stats.failedRequests.toLocaleString()}\n`;
      report += `  Avg Processing Time: ${stats.avgProcessingTime.toFixed(0)}ms\n\n`;
    }

    report += `🏃 QUEUE STATUS:\n`;
    report += `  Waiting: ${queueStatus.waiting}\n`;
    report += `  Active: ${queueStatus.active}\n`;
    report += `  Completed: ${queueStatus.completed}\n`;
    report += `  Failed: ${queueStatus.failed}\n\n`;

    report += `🖥️ SYSTEM HEALTH:\n`;
    report += `  Memory Usage: ${systemHealth.memoryUsage.percentage.toFixed(1)}%\n`;
    report += `  Redis Connection: ${systemHealth.redisConnection ? '✅' : '❌'}\n`;
    report += `  Queue Health: ${systemHealth.queueHealth === 'healthy' ? '✅' : '⚠️'} ${systemHealth.queueHealth}\n`;
    report += `  Throughput: ${systemHealth.throughput.animePerHour} anime/hour\n\n`;

    if (stats && Object.keys(stats.topErrors).length > 0) {
      report += `❌ TOP ERRORS:\n`;
      Object.entries(stats.topErrors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([error, count]) => {
          report += `  ${error}: ${count}\n`;
        });
    }

    return report;
  }

  /**
   * Format duration in a human-readable way
   */
  private formatDuration(ms: number): string {
    if (ms <= 0) return "Complete";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Export progress data for analysis
   */
  async exportProgressData(): Promise<any> {
    const snapshot = await this.getCurrentSnapshot();
    return {
      timestamp: Date.now(),
      snapshot,
      exportedAt: new Date().toISOString()
    };
  }
}