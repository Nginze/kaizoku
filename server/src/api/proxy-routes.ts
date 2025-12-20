import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { allowedExtensions, LineTransform } from "../utils/line-transform";

export const router = Router();

// Get mubeng proxy URL from environment
const MUBENG_PROXY_URL = process.env.MUBENG_PROXY_URL;

// Create proxy agent if mubeng is configured
const getProxyAgent = () => {
	if (!MUBENG_PROXY_URL) {
		console.log("MUBENG_PROXY_URL not configured, making direct requests");
		return undefined;
	}
	return new HttpsProxyAgent(MUBENG_PROXY_URL);
};

// Enhanced M3U8 proxy for video streaming with provider bypass (uses mubeng for IP rotation)
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

		headers.Referer = "https://megacloud.club/";
		headers.Origin = "https://megacloud.club";

		// Add range header if present
		if (req.headers.range) {
			headers.Range = req.headers.range as string;
		}

		// Use mubeng proxy for IP rotation
		const proxyAgent = getProxyAgent();

		const response = await axios.get(url, {
			responseType: "stream",
			headers,
			httpsAgent: proxyAgent,
			proxy: false, // Disable axios default proxy handling since we're using httpsAgent
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
		console.log("Proxy error for URL:", req.query.url);
		console.log("Error details:", error.message);


		if (!res.headersSent) {
			if (error.response) {
				console.log("Response status:", error.response.status);
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

// Proxy V2 - Routes requests to Rust proxy service on localhost:8090
export const m3u8ProxyV2 = async (req: Request, res: Response): Promise<void> => {
	try {
		const url = req.query.url as string;
		const headersParam = req.query.headers as string | undefined;
		const origin = req.query.origin as string | undefined;

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

		// Build proxy URL to Rust service
		const proxyServerUrl = process.env.PROXY_SERVER_URL || "http://localhost:8090";
		const proxyUrl = new URL(proxyServerUrl);
		proxyUrl.searchParams.set("url", url);

		// Add optional headers parameter if provided
		if (headersParam) {
			proxyUrl.searchParams.set("headers", headersParam);
		}

		// Add optional origin parameter if provided
		if (origin) {
			proxyUrl.searchParams.set("origin", origin);
		}

		// Add base URL for M3U8 rewriting - use SERVER_URL env or construct from request
		const serverUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
		const baseUrl = `${serverUrl}/api/proxy/v2`;
		proxyUrl.searchParams.set("base", baseUrl);

		console.log("Proxying via Rust service:", proxyUrl.toString());

		// Forward request to Rust proxy service
		const response = await axios.get(proxyUrl.toString(), {
			responseType: "stream",
			validateStatus: (status) => status < 500,
			timeout: 30000,
		});

		// Forward response headers
		const responseHeaders = { ...response.headers };

		// Ensure CORS headers are set
		responseHeaders["Access-Control-Allow-Origin"] = "*";
		responseHeaders["Access-Control-Allow-Headers"] = "*";
		responseHeaders["Access-Control-Allow-Methods"] = "*";

		res.set(responseHeaders);
		res.status(response.status);

		// Check if response is M3U8 playlist - need to rewrite URLs
		const isM3U8 = url.endsWith('.m3u8') || responseHeaders['content-type']?.includes('mpegurl');

		if (isM3U8) {
			// Buffer the M3U8 response to rewrite URLs
			let m3u8Data = '';
			response.data.on('data', (chunk: Buffer) => {
				m3u8Data += chunk.toString();
			});

			response.data.on('end', () => {
				// Rewrite relative URLs to absolute URLs
				const rewrittenM3U8 = m3u8Data.replace(/^\/?(\?url=.+)$/gm, (_match, query) => {
					return `${baseUrl}${query}`;
				});
				res.send(rewrittenM3U8);
			});
		} else {
			// Stream the response directly for non-M3U8 files
			response.data.pipe(res);
		}

		response.data.on("error", (streamError: any) => {
			console.error("Stream error from Rust proxy:", streamError);
			if (!res.headersSent) {
				res.status(500).json({
					error: "Stream error",
					details: streamError.message,
				});
			}
		});
	} catch (error: any) {
		console.log("Proxy V2 error for URL:", req.query.url);
		console.log("Error details:", error.message);

		if (!res.headersSent) {
			if (error.code === "ECONNREFUSED") {
				res.status(503).json({
					error: "Rust proxy service unavailable",
					details: "Cannot connect to localhost:8090. Make sure the Rust proxy service is running.",
				});
			} else if (error.response) {
				console.log("Response status:", error.response.status);
				res.status(error.response.status).json({
					error: "Rust proxy error",
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

// Register the proxy routes
router.get("/video", m3u8Proxy);
router.get("/v2", m3u8ProxyV2);

export { router as proxyRouter };
