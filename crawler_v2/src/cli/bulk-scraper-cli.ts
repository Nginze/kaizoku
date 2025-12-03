#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { BulkEmbedScraperService } from "../services/bulk-embed-scraper.service";
import { EmbedWorker } from "../workers/embed-worker";
import { MonitoringService } from "../services/monitoring.service";
import { RecoveryService } from "../services/recovery.service";
import { logger } from "../config/logger";
import { connectDB, disconnectDB } from "../config/mongo";
import { redis } from "../config/redis";

interface CLIOptions {
  workers?: number;
  resume?: boolean;
  priority?: string;
  dryRun?: boolean;
  verbose?: boolean;
  monitoring?: boolean;
  interval?: number;
}

class BulkScraperCLI {
  private bulkScraperService: BulkEmbedScraperService;
  private monitoringService: MonitoringService;
  private recoveryService: RecoveryService;
  private workers: EmbedWorker[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.bulkScraperService = new BulkEmbedScraperService();
    this.monitoringService = new MonitoringService();
    this.recoveryService = new RecoveryService();
  }

  /**
   * Initialize database connections with visual feedback
   */
  private async initializeConnections(): Promise<void> {
    const spinner = ora("Connecting to databases...").start();

    try {
      // Connect to MongoDB
      spinner.text = "Connecting to MongoDB...";
      await connectDB();
      
      // Test Redis connection
      spinner.text = "Connecting to Redis...";
      await redis.ping();
      
      spinner.succeed("✅ Database connections established");
    } catch (error) {
      spinner.fail("❌ Database connection failed");
      console.error(chalk.red(`Connection error: ${error.message}`));
      throw error;
    }
  }

  /**
   * Start the bulk scraping process
   */
  async startScraping(options: CLIOptions): Promise<void> {
    try {
      // Initialize database connections first
      await this.initializeConnections();

      const spinner = ora("Initializing bulk scraping...").start();

      // Setup configuration
      const workers = options.workers || 3;
      const resumeFromCheckpoint = options.resume !== false;
      const prioritizeRecent = options.priority === "recent";

      spinner.text = "Starting bulk scraping service...";
      
      if (options.dryRun) {
        console.log(chalk.yellow("🧪 DRY RUN MODE - No actual scraping will be performed"));
        const progress = await this.bulkScraperService.getProgress();
        if (progress) {
          console.log(chalk.blue(`📊 Would process ${progress.totalAnime} anime`));
        }
        spinner.succeed("Dry run completed");
        return;
      }

      // Start the bulk scraping service
      await this.bulkScraperService.startBulkScraping({
        resumeFromCheckpoint,
        prioritizeRecent,
        maxConcurrency: workers
      });

      spinner.text = `Starting ${workers} workers...`;

      // Start workers
      for (let i = 0; i < workers; i++) {
        const worker = new EmbedWorker(1, `worker-${i + 1}`);
        this.workers.push(worker);
        await this.monitoringService.registerWorker(`embed-worker-worker-${i + 1}`);
      }

      // Start monitoring if requested
      if (options.monitoring) {
        await this.monitoringService.startMonitoring(options.interval || 10000);
      }

      // Start auto-recovery
      await this.recoveryService.scheduleAutoRecovery(30);

      spinner.succeed(`✅ Bulk scraping started with ${workers} workers`);

      // Show initial status
      await this.showStatus();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      if (options.monitoring) {
        // Start real-time monitoring display
        await this.startLiveMonitoring();
      } else {
        console.log(chalk.blue("\n📊 Use 'bulk-scraper monitor' to view real-time progress"));
        console.log(chalk.gray("Press Ctrl+C to stop\n"));
      }

    } catch (error) {
      spinner.fail("Failed to start bulk scraping");
      logger.error("CLI Error:", error);
      console.error(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Show current status
   */
  async showStatus(): Promise<void> {
    try {
      // Initialize database connections
      await this.initializeConnections();

      const spinner = ora("Fetching status...").start();
      const [progress, queueStatus, recoveryHealth] = await Promise.all([
        this.bulkScraperService.getProgress(),
        this.bulkScraperService.getQueueStatus(),
        this.recoveryService.getRecoveryHealth()
      ]);

      spinner.stop();

      console.log(chalk.bold.blue("\n📊 BULK SCRAPING STATUS"));
      console.log("=".repeat(50));

      if (progress) {
        const successRate = progress.successRate.toFixed(1);
        const completionPercent = ((progress.completed / progress.totalAnime) * 100).toFixed(2);
        
        console.log(chalk.green(`📈 Progress: ${progress.completed}/${progress.totalAnime} (${completionPercent}%)`));
        console.log(chalk.green(`✅ Success Rate: ${successRate}%`));
        console.log(chalk.yellow(`⏳ Pending: ${progress.pending}`));
        console.log(chalk.red(`❌ Failed: ${progress.failed}`));
        
        if (progress.estimatedCompletion) {
          const eta = new Date(progress.estimatedCompletion).toLocaleString();
          console.log(chalk.blue(`🕒 ETA: ${eta}`));
        }
      }

      console.log(chalk.cyan(`\n🏃 Queue: ${queueStatus.active} active, ${queueStatus.waiting} waiting, ${queueStatus.failed} failed`));

      if (recoveryHealth.failedJobsCount > 0) {
        console.log(chalk.yellow(`\n🔧 Recovery: ${recoveryHealth.recoverableJobs} recoverable, ${recoveryHealth.unrecoverableJobs} unrecoverable`));
      }

    } catch (error) {
      spinner.fail("Failed to fetch status");
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  /**
   * Start live monitoring display
   */
  async startLiveMonitoring(): Promise<void> {
    console.log(chalk.bold.cyan("\n🔴 LIVE MONITORING STARTED"));
    console.log(chalk.gray("Press Ctrl+C to stop\n"));

    this.monitoringInterval = setInterval(async () => {
      try {
        const report = await this.monitoringService.getDetailedProgressReport();
        
        // Clear screen and show report
        console.clear();
        console.log(chalk.bold.cyan("🔴 LIVE MONITORING - " + new Date().toLocaleTimeString()));
        console.log(chalk.gray("Press Ctrl+C to stop\n"));
        console.log(report);
        
      } catch (error) {
        console.error(chalk.red("Monitoring error:", error.message));
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop monitoring display
   */
  stopLiveMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Pause the scraping process
   */
  async pauseScraping(): Promise<void> {
    const spinner = ora("Pausing scraping...").start();

    try {
      await this.bulkScraperService.pauseQueue();
      
      for (const worker of this.workers) {
        await worker.pause();
      }

      spinner.succeed("✅ Scraping paused");
    } catch (error) {
      spinner.fail("Failed to pause scraping");
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  /**
   * Resume the scraping process
   */
  async resumeScraping(): Promise<void> {
    const spinner = ora("Resuming scraping...").start();

    try {
      await this.bulkScraperService.resumeQueue();
      
      for (const worker of this.workers) {
        await worker.resume();
      }

      spinner.succeed("✅ Scraping resumed");
    } catch (error) {
      spinner.fail("Failed to resume scraping");
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  /**
   * Run recovery process
   */
  async runRecovery(options: { auto?: boolean; ids?: string }): Promise<void> {
    try {
      // Initialize database connections
      await this.initializeConnections();

      const spinner = ora("Running recovery...").start();
      if (options.ids) {
        // Recover specific anime IDs
        const anilistIds = options.ids.split(",").map(id => parseInt(id.trim()));
        const results = await this.recoveryService.recoverSpecificAnime(anilistIds);
        
        spinner.stop();
        
        console.log(chalk.bold.blue("\n🔧 RECOVERY RESULTS"));
        console.log("=".repeat(30));
        
        for (const [anilistId, success] of Object.entries(results)) {
          const status = success ? chalk.green("✅ Recovered") : chalk.red("❌ Failed");
          console.log(`${anilistId}: ${status}`);
        }
        
      } else {
        // Auto recovery
        const report = await this.recoveryService.runAutoRecovery();
        
        spinner.stop();
        
        console.log(chalk.bold.blue("\n🔧 RECOVERY REPORT"));
        console.log("=".repeat(40));
        console.log(chalk.green(`📊 Total Failed Jobs: ${report.totalFailedJobs}`));
        console.log(chalk.green(`✅ Recovered: ${report.recoveredJobs}`));
        console.log(chalk.red(`❌ Unrecoverable: ${report.unrecoverableJobs}`));
        
        if (Object.keys(report.strategiesApplied).length > 0) {
          console.log(chalk.blue("\n🛠️ Strategies Applied:"));
          for (const [strategy, count] of Object.entries(report.strategiesApplied)) {
            console.log(`  ${strategy}: ${count}`);
          }
        }
        
        if (report.recommendations.length > 0) {
          console.log(chalk.yellow("\n💡 Recommendations:"));
          report.recommendations.forEach(rec => console.log(`  ${rec}`));
        }
      }
      
    } catch (error) {
      spinner.fail("Recovery failed");
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  /**
   * Clean up failed jobs
   */
  async cleanupJobs(dryRun: boolean = true): Promise<void> {
    try {
      // Initialize database connections
      await this.initializeConnections();

      const spinner = ora(`${dryRun ? "Analyzing" : "Cleaning up"} failed jobs...`).start();
      const result = await this.recoveryService.cleanupUnrecoverableJobs(dryRun);
      
      spinner.stop();
      
      console.log(chalk.bold.blue("\n🧹 CLEANUP RESULTS"));
      console.log("=".repeat(30));
      
      if (dryRun) {
        console.log(chalk.yellow(`📊 Would remove ${result.wouldRemove} unrecoverable jobs`));
        console.log(chalk.gray("\nUse --no-dry-run to actually remove them"));
      } else {
        console.log(chalk.green(`✅ Removed ${result.actuallyRemoved} unrecoverable jobs`));
      }
      
      if (result.jobs.length > 0 && result.jobs.length <= 10) {
        console.log(chalk.gray("\nJobs that would be/were removed:"));
        result.jobs.forEach(job => {
          console.log(`  ${job.anilistId}: ${job.title} (${job.error.substring(0, 50)}...)`);
        });
      }
      
    } catch (error) {
      spinner.fail("Cleanup failed");
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  /**
   * Show detailed progress report
   */
  async showDetailedReport(): Promise<void> {
    try {
      // Initialize database connections
      await this.initializeConnections();

      const spinner = ora("Generating detailed report...").start();
      const report = await this.monitoringService.getDetailedProgressReport();
      spinner.stop();
      
      console.log(report);
      
    } catch (error) {
      spinner.fail("Failed to generate report");
      console.error(chalk.red(`❌ Error: ${error.message}`));
    }
  }

  /**
   * Interactive configuration
   */
  async interactiveConfig(): Promise<CLIOptions> {
    console.log(chalk.bold.blue("\n🔧 BULK SCRAPER CONFIGURATION"));
    console.log("=".repeat(40));

    const answers = await inquirer.prompt([
      {
        type: "number",
        name: "workers",
        message: "Number of workers:",
        default: 3,
        validate: (input) => input > 0 && input <= 10
      },
      {
        type: "confirm",
        name: "resume",
        message: "Resume from checkpoint?",
        default: true
      },
      {
        type: "list",
        name: "priority",
        message: "Priority strategy:",
        choices: [
          { name: "Popular anime first", value: "popular" },
          { name: "Recent releases first", value: "recent" }
        ],
        default: "popular"
      },
      {
        type: "confirm",
        name: "monitoring",
        message: "Enable live monitoring?",
        default: true
      },
      {
        type: "number",
        name: "interval",
        message: "Monitoring interval (seconds):",
        default: 10,
        when: (answers) => answers.monitoring
      }
    ]);

    return {
      workers: answers.workers,
      resume: answers.resume,
      priority: answers.priority,
      monitoring: answers.monitoring,
      interval: answers.interval * 1000
    };
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(chalk.yellow(`\n⚠️ Received ${signal}, shutting down gracefully...`));
      
      this.stopLiveMonitoring();
      
      const spinner = ora("Stopping workers...").start();
      
      try {
        // Stop monitoring
        this.monitoringService.stopMonitoring();
        
        // Close workers
        await Promise.all(this.workers.map(worker => worker.close()));
        
        // Save checkpoint
        await this.bulkScraperService.saveCheckpoint();
        
        // Close database connections
        spinner.text = "Closing database connections...";
        await disconnectDB();
        redis.disconnect();
        
        spinner.succeed("✅ Shutdown completed");
        process.exit(0);
      } catch (error) {
        spinner.fail("Failed to shutdown gracefully");
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }
}

// CLI Setup
const program = new Command();
const cli = new BulkScraperCLI();

program
  .name("bulk-scraper")
  .description("Bulk anime embed scraper CLI")
  .version("1.0.0");

program
  .command("start")
  .description("Start bulk scraping process")
  .option("-w, --workers <number>", "Number of workers", "3")
  .option("--no-resume", "Don't resume from checkpoint")
  .option("-p, --priority <type>", "Priority strategy (popular|recent)", "popular")
  .option("--dry-run", "Run in dry-run mode")
  .option("-v, --verbose", "Verbose logging")
  .option("-m, --monitoring", "Enable live monitoring")
  .option("-i, --interval <seconds>", "Monitoring interval", "10")
  .action(async (options) => {
    await cli.startScraping({
      workers: parseInt(options.workers),
      resume: options.resume,
      priority: options.priority,
      dryRun: options.dryRun,
      verbose: options.verbose,
      monitoring: options.monitoring,
      interval: parseInt(options.interval) * 1000
    });
  });

program
  .command("status")
  .description("Show current status")
  .action(async () => {
    await cli.showStatus();
  });

program
  .command("monitor")
  .description("Start live monitoring")
  .action(async () => {
    await cli.startLiveMonitoring();
  });

program
  .command("pause")
  .description("Pause scraping")
  .action(async () => {
    await cli.pauseScraping();
  });

program
  .command("resume")
  .description("Resume scraping")
  .action(async () => {
    await cli.resumeScraping();
  });

program
  .command("recover")
  .description("Run recovery process")
  .option("--ids <anilistIds>", "Specific anime IDs to recover (comma-separated)")
  .action(async (options) => {
    await cli.runRecovery(options);
  });

program
  .command("cleanup")
  .description("Clean up unrecoverable jobs")
  .option("--no-dry-run", "Actually remove jobs (default is dry-run)")
  .action(async (options) => {
    await cli.cleanupJobs(options.dryRun !== false);
  });

program
  .command("report")
  .description("Show detailed progress report")
  .action(async () => {
    await cli.showDetailedReport();
  });

program
  .command("config")
  .description("Interactive configuration")
  .action(async () => {
    const config = await cli.interactiveConfig();
    console.log(chalk.green("\n✅ Configuration complete!"));
    console.log(chalk.gray("Run with these settings:"));
    console.log(chalk.blue(`bulk-scraper start -w ${config.workers} ${config.resume ? "" : "--no-resume"} -p ${config.priority} ${config.monitoring ? "-m" : ""}`));
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (error) {
  console.error(chalk.red(`❌ CLI Error: ${error.message}`));
  process.exit(1);
}

export { BulkScraperCLI };