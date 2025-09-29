import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

// Global rate limiting state
class RateLimiter {
	private remaining = 90; // Start with max requests
	private resetTime = 0;
	private lastRequest = 0;
	private readonly minInterval = 700; // ~85 requests per minute to stay safe

	async waitIfNeeded(): Promise<void> {
		const now = Date.now();
		
		// Reset counter if reset time has passed
		if (this.resetTime > 0 && now > this.resetTime) {
			this.remaining = 90;
			this.resetTime = 0;
		}

		// Enforce minimum interval between requests
		const timeSinceLastRequest = now - this.lastRequest;
		if (timeSinceLastRequest < this.minInterval) {
			const waitTime = this.minInterval - timeSinceLastRequest;
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}

		// If we're running low on requests, slow down
		if (this.remaining < 10) {
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		this.lastRequest = Date.now();
	}

	updateLimits(headers: Record<string, string>): void {
		const remaining = parseInt(headers["x-ratelimit-remaining"]) || this.remaining;
		const reset = parseInt(headers["x-ratelimit-reset"]) || 0;
		
		this.remaining = remaining;
		if (reset > 0) {
			this.resetTime = reset * 1000; // Convert to milliseconds
		}
	}
}

const rateLimiter = new RateLimiter();

export const safeRequest = async (
	url: string,
	options?: AxiosRequestConfig,
	retries = 0,
): Promise<AxiosResponse | null> => {
	// Wait before making request if needed
	await rateLimiter.waitIfNeeded();

	try {
		const response = await axios(url, options);
		
		// Update rate limit state from response headers
		if (response.headers) {
			rateLimiter.updateLimits(response.headers);
		}
		
		return response;
	} catch (err) {
		const axiosError = err as AxiosError;
		const response = axiosError.response;
		
		// Update rate limit state even on error
		if (response?.headers) {
			rateLimiter.updateLimits(response.headers);
		}

		// Handle rate limit errors (429)
		if (response?.status === 429) {
			const retryAfter = parseInt(response.headers?.["retry-after"] as string) || 60;
			const delay = retryAfter * 1000; // Convert to milliseconds
			
			console.log(`Rate limit hit (429). Waiting ${retryAfter}s before retry ${retries + 1}/5`);
			
			if (retries < 5) {
				await new Promise(resolve => setTimeout(resolve, delay));
				return safeRequest(url, options, retries + 1);
			} else {
				throw new Error(`Rate limit exceeded after ${retries} retries`);
			}
		}

		// Handle other HTTP errors with exponential backoff
		if (response?.status && response.status >= 500 && retries < 3) {
			const backoffDelay = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
			console.log(`Server error ${response.status}. Retrying in ${backoffDelay}ms`);
			
			await new Promise(resolve => setTimeout(resolve, backoffDelay));
			return safeRequest(url, options, retries + 1);
		}

		// Handle network errors
		if (!response && retries < 3) {
			const backoffDelay = Math.pow(2, retries) * 1000;
			console.log(`Network error. Retrying in ${backoffDelay}ms`);
			
			await new Promise(resolve => setTimeout(resolve, backoffDelay));
			return safeRequest(url, options, retries + 1);
		}

		throw new Error(axiosError.message || "Request failed");
	}
};
