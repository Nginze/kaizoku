import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

export const safeRequest = async (
	url: string,
	options?: AxiosRequestConfig,
	retries = 0,
): Promise<AxiosResponse | null> => {
	try {
		const response = await axios(url, options);
		return response;
	} catch (err) {
		const response = (err as AxiosError).response!;
		const remainingRequests =
			parseInt(response?.headers?.["x-ratelimit-remaining"]) || 0;
		const resetTime = parseInt(response?.headers?.["x-ratelimit-reset"]) || 0;
		const retryAfter = parseInt(response?.headers?.["retry-after"]) || 0;

		if (remainingRequests < 60 || response?.status === 429) {
			const delay = retryAfter
				? retryAfter * 3000
				: resetTime * 1000 - Date.now();
			if (delay > 0) {
				console.log("Rate limit reached. Waiting for", delay, "ms");
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
			if (retries < 15) {
				return safeRequest(url, options, retries + 1);
			} else {
				throw new Error("Rate limit reached.");
			}
		}
		throw new Error((err as AxiosError).message);
	}
};
