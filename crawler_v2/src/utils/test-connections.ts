#!/usr/bin/env node

/**
 * Database Connection Test Utility
 * 
 * This utility tests MongoDB and Redis connections before running the bulk scraper.
 * Use this to verify your environment setup is correct.
 * 
 * Usage:
 *   npm run test-connections
 *   or
 *   ts-node src/utils/test-connections.ts
 */

import { config } from "dotenv";
import chalk from "chalk";
import ora from "ora";
import { connectDB, disconnectDB } from "../config/mongo";
import { redis } from "../config/redis";

// Load environment variables
config();

async function testConnections(): Promise<void> {
  console.log(chalk.bold.blue("🔍 DATABASE CONNECTION TEST"));
  console.log("=".repeat(40));
  
  let mongoConnected = false;
  let redisConnected = false;

  // Test MongoDB Connection
  const mongoSpinner = ora("Testing MongoDB connection...").start();
  try {
    await connectDB();
    mongoConnected = true;
    mongoSpinner.succeed(chalk.green("✅ MongoDB connection successful"));
  } catch (error) {
    mongoSpinner.fail(chalk.red("❌ MongoDB connection failed"));
    console.error(chalk.red(`   Error: ${error.message}`));
    console.error(chalk.yellow(`   Check MONGO_URL environment variable`));
  }

  // Test Redis Connection
  const redisSpinner = ora("Testing Redis connection...").start();
  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      redisConnected = true;
      redisSpinner.succeed(chalk.green("✅ Redis connection successful"));
    } else {
      throw new Error("Invalid Redis response");
    }
  } catch (error) {
    redisSpinner.fail(chalk.red("❌ Redis connection failed"));
    console.error(chalk.red(`   Error: ${error.message}`));
    console.error(chalk.yellow(`   Check REDIS_URL environment variable`));
  }

  // Test Redis operations
  if (redisConnected) {
    const redisOpsSpinner = ora("Testing Redis operations...").start();
    try {
      const testKey = "test-connection-" + Date.now();
      const testValue = "test-value";
      
      // Test SET operation
      await redis.set(testKey, testValue, "EX", 10); // 10 seconds expiry
      
      // Test GET operation
      const retrievedValue = await redis.get(testKey);
      
      if (retrievedValue === testValue) {
        redisOpsSpinner.succeed(chalk.green("✅ Redis operations working"));
        
        // Clean up
        await redis.del(testKey);
      } else {
        throw new Error("Redis SET/GET operation failed");
      }
    } catch (error) {
      redisOpsSpinner.fail(chalk.red("❌ Redis operations failed"));
      console.error(chalk.red(`   Error: ${error.message}`));
    }
  }

  // Summary
  console.log("\n" + "=".repeat(40));
  console.log(chalk.bold.blue("📊 CONNECTION SUMMARY"));
  console.log("=".repeat(40));
  
  console.log(`MongoDB: ${mongoConnected ? chalk.green("✅ Ready") : chalk.red("❌ Failed")}`);
  console.log(`Redis: ${redisConnected ? chalk.green("✅ Ready") : chalk.red("❌ Failed")}`);
  
  if (mongoConnected && redisConnected) {
    console.log(chalk.bold.green("\n🎉 All connections successful! Ready to run bulk scraper."));
    console.log(chalk.blue("Run: npm run bulk-scraper:start"));
  } else {
    console.log(chalk.bold.red("\n⚠️ Some connections failed. Please fix the issues above."));
    console.log(chalk.yellow("Check your environment variables in .env file:"));
    console.log(chalk.gray("  MONGO_URL=mongodb://localhost:27017/anidb"));
    console.log(chalk.gray("  REDIS_URL=redis://localhost:6379"));
  }

  // Clean up connections
  try {
    if (mongoConnected) {
      await disconnectDB();
    }
    if (redisConnected) {
      redis.disconnect();
    }
  } catch (error) {
    console.warn(chalk.yellow("⚠️ Warning: Error closing connections"), error.message);
  }

  process.exit(mongoConnected && redisConnected ? 0 : 1);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('❌ Unhandled rejection:'), error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught exception:'), error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testConnections();
}

export { testConnections };