import axios, { AxiosRequestConfig } from "axios";
import { logger } from "../config/logger";

/**
 * Safe HTTP request wrapper with retries and rate limiting
 */
export const safeRequest = async (url: string, options: AxiosRequestConfig = {}) => {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Rate limiting: 700ms between requests
      await new Promise((resolve) => setTimeout(resolve, 700));

      const response = await axios({
        url,
        ...options,
        timeout: options.timeout || 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          ...options.headers,
        },
      });

      return response;
    } catch (error: any) {
      lastError = error;

      // Handle rate limiting (429)
      if (error.response?.status === 429) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn(`Rate limited, waiting ${backoffDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }

      // Retry on other errors
      if (attempt < maxRetries) {
        logger.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }
  }

  logger.error(`Request failed after ${maxRetries} attempts:`, lastError?.message);
  throw lastError;
};
