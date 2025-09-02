import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const router = Router();

// Enhanced M3U8 proxy for video streaming with provider bypass
export const m3u8Proxy = async (req: Request, res: Response): Promise<void> => {
	try {
		const url = req.query.url as string;
		if (!url) {
			res.status(400).json({ error: "URL parameter is required" });
			return;
		}

		// Validate URL format
		try {
			new URL(url);
		} catch {
			res.status(400).json({ error: "Invalid URL format" });
			return;
		}

		const isStaticFiles = allowedExtensions.some((ext) => url.endsWith(ext));
		const baseUrl = url.replace(/[^/]+$/, "");

		// Enhanced headers to bypass provider blocking
		const headers: Record<string, string> = {
			Accept: "*/*",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			"Accept-Language": "en-US,en;q=0.9",
			"Accept-Encoding": "gzip, deflate, br",
			Connection: "keep-alive",
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "cross-site",
		};

		// Add provider-specific headers
		const urlObj = new URL(url);

		headers.Referer = "https://megacloud.club/";
		headers.Origin = "https://megacloud.club";

		// Add range header if present
		if (req.headers.range) {
			headers.Range = req.headers.range as string;
		}

		const response = await axios.get(url, {
			responseType: "stream",
			headers,
			validateStatus: (status) => status < 500,
			timeout: 30000,
		});

		// Set CORS and response headers
		const responseHeaders = { ...response.headers };
		if (!isStaticFiles) delete responseHeaders["content-length"];

		responseHeaders["Access-Control-Allow-Origin"] = "*";
		responseHeaders["Access-Control-Allow-Headers"] = "*";
		responseHeaders["Access-Control-Allow-Methods"] = "*";

		if (responseHeaders["cache-control"]) {
			res.set("Cache-Control", responseHeaders["cache-control"]);
		}

		res.set(responseHeaders);
		res.status(response.status);

		// Handle static files directly
		if (isStaticFiles) {
			response.data.pipe(res);
			return;
		}

		// Handle non-M3U8 content directly
		if (!url.endsWith(".m3u8")) {
			response.data.pipe(res);
			return;
		}

		// Process M3U8 files with line transformation
		const transform = new LineTransform(baseUrl);
		response.data.pipe(transform).pipe(res);

		response.data.on("error", (streamError: any) => {
			console.error("Stream error:", streamError);
			if (!res.headersSent) {
				res.status(500).json({
					error: "Stream error",
					details: streamError.message,
				});
			}
		});
	} catch (error: any) {
		console.error("Proxy error for URL:", req.query.url);
		console.error("Error details:", error.message);

		if (!res.headersSent) {
			if (error.response) {
				console.error("Response status:", error.response.status);
				res.status(error.response.status).json({
					error: "Upstream server error",
					details: error.response.statusText,
					status: error.response.status,
				});
			} else {
				res.status(500).json({
					error: "Proxy server error",
					details: error.message,
				});
			}
		}
	}
};

// Register the proxy route
router.get("/video", m3u8Proxy);

export { router as proxyRouter };
