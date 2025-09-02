import { CheerioAPI, load } from "cheerio";
import { safeRequest } from "../utils/safe-request";
import { SERVER_MAP } from "../constants/misc";
import { cache, redis } from "../config/redis";
import { MappingService } from "./mapping.service";
import { MegaCloud } from "../extractors";

export class HianimeService {
	private mappingService;
	private megaCloudExtractor;
	constructor() {
		this.mappingService = new MappingService();
		this.megaCloudExtractor = new MegaCloud();
	}

	getStreamingEpisodeEmbeds = async (id: string) => {
		const mappings = await this.mappingService.getMappingsByAnilistId(
			parseInt(id),
		);

		console.log(mappings);

		const aniwatchEps: any[] = [];
		const embeds = [];

		const watchPageUrl = `https://hianime.to/ajax/v2/episode/list/${mappings.aniwatch
			.split("-")
			.pop()}`;
		const response = await safeRequest(watchPageUrl, {
			method: "GET",
		});

		let html = response?.data.html;
		let $: CheerioAPI = load(html);

		$("div.ss-list > a.ssl-item.ep-item").each((i, el) => {
			const epId = $(el).attr("data-id");
			const epNo = $(el).attr("data-number");
			const slug = $(el).attr("href");

			aniwatchEps.push({ epId, epNo, slug });
		});

		for (const ep of aniwatchEps) {
			const url = `https://hianime.to/ajax/v2/episode/servers?episodeId=${ep.epId}`;
			const response = await safeRequest(url, {
				method: "GET",
			});

			const servers: any[] = [];
			html = response?.data.html;
			$ = load(html);

			$(
				"div.ps_-block.ps_-block-sub.servers-sub > div.ps__-list > div.item.server-item",
			).each((i, el) => {
				const serverId = $(el).attr("data-id");
				const serverName =
					SERVER_MAP[$(el).attr("data-server-id") as keyof typeof SERVER_MAP];
				const type = "SUB";

				servers.push({
					epNo: ep.epNo,
					serverName,
					serverId,
					type,
				});
			});

			$(
				"div.ps_-block.ps_-block-sub.servers-dub > div.ps__-list > div.item.server-item",
			).each((i, el) => {
				const serverId = $(el).attr("data-id");
				const serverName =
					SERVER_MAP[$(el).attr("data-server-id") as keyof typeof SERVER_MAP];
				const type = "DUB";

				servers.push({
					epNo: ep.epNo,
					serverName,
					serverId,
					type,
				});
			});

			for (const server of servers) {
				const url = `https://hianime.to/ajax/v2/episode/sources?id=${server.serverId}`;
				const response = await safeRequest(url, {
					method: "GET",
				});

				const data = response?.data;

				const embed = {
					...server,
					embedLink: data.link,
					serverIdx: data.server,
				};

				embeds.push(embed);
			}
		}

		// Group embeds by type and episode number
		const groupedEmbeds = embeds.reduce((acc, embed) => {
			const key = `${embed.type}:${embed.epNo}`;
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(embed);
			return acc;
		}, {});

		// Save grouped embeds to Redis
		for (const [key, value] of Object.entries(groupedEmbeds)) {
			await cache(`anime:${id}:${key}`, JSON.stringify(value));
		}

		console.log(groupedEmbeds);
	};

	extractSourcesFromEmbeds = async (id: string) => {
		console.log(`🎬 Starting source extraction for anime ID: ${id}`);

		// Retrieve stored embeds from Redis
		const keys = await this.getEpisodeKeys(id);
		console.log(`📋 Found ${keys.length} episode/type combinations:`, keys);

		const extractedSources = [];

		for (const key of keys) {
			try {
				console.log(`🔄 Processing ${key}...`);
				const embedsData = await this.getEmbedData(key);

				if (!embedsData) {
					console.log(`! No embed data found for ${key}`);
					continue;
				}

				const embeds = JSON.parse(embedsData);
				const _embeds = JSON.parse(embedsData);

				for (const embed of embeds) {
					// console.log(embed);
					console.log(
						`🔗 Extracting from ${embed.serverName} (${embed.type}) - Episode ${embed.epNo}`,
					);
					console.log(`🌐 Embed URL: ${embed.embedLink}`);

					try {
						let sources;

						// Determine which extractor to use based on embed URL
						if (embed.serverName === "vidstreaming") {
							console.log(`🔥 Using MegaCloud extractor`);
							sources = await this.megaCloudExtractor.extract5(
								new URL(embed.embedLink),
							);
						} else {
							console.log(`! No suitable extractor for ${embed.embedLink}`);
							continue;
						}

						const extractedData = {
							...embed,
							sources: sources.sources,
							tracks: sources.tracks,
							intro: sources.intro,
							outro: sources.outro,
						};

						extractedSources.push(extractedData);
						console.log(
							`✅ Successfully extracted ${sources.sources.length} sources for Episode ${embed.epNo}`,
						);
						console.log(
							`📊 Sources:`,
							sources.sources.map((s) => ({
								url: s.url.substring(0, 50) + "...",
								type: s.type,
							})),
						);
					} catch (extractError) {
						console.log(extractError);
						// console.error(
						// 	`❌ Failed to extract sources from ${embed.embedLink}:`,
						// 	extractError,
						// );
					}
				}
			} catch (error) {
				// console.error(`❌ Error processing ${key}:`, error);
			}
		}

		// Store extracted sources in Redis
		if (extractedSources.length > 0) {
			console.log(`💾 Storing ${extractedSources.length} extracted sources...`);
			await cache(`anime:${id}:sources`, JSON.stringify(extractedSources));
			console.log(`✅ Sources stored successfully`);
		}

		console.log(
			`🎉 Source extraction complete for anime ${id}. Total sources: ${extractedSources.length}`,
		);
		return extractedSources;
	};

	private async getEpisodeKeys(id: string): Promise<string[]> {
		try {
			const { redis } = await import("../config/redis");
			const pattern = `anime:${id}:*`;
			console.log(`🔍 Searching for keys with pattern: ${pattern}`);

			// Use Redis KEYS command to find all matching keys
			const keys = await redis.keys(pattern);
			console.log(
				`📋 Found ${keys.length} keys:`,
				keys.slice(0, 5),
				keys.length > 5 ? "..." : "",
			);

			// Filter out the sources key if it exists
			const episodeKeys = keys.filter((key) => !key.includes(":sources"));
			console.log(`📺 Episode keys after filtering: ${episodeKeys.length}`);

			return episodeKeys;
		} catch (error) {
			console.error("Error getting episode keys:", error);
			return [];
		}
	}

	private async getEmbedData(key: string) {
		try {
			const data = await redis.get(key);
			if (!data) return null;
			return JSON.parse(data);
		} catch (error) {
			console.error(`Error getting embed data for ${key}:`, error);
			return null;
		}
	}

	getStreamingEpisodeEmbedById = async (epNo: number, anilistId: string) => {
		try {
			// Get mappings from Redis cache
			const mappingsData = await redis.get(`mappings:${anilistId}`);
			if (!mappingsData) {
				throw new Error(`No mappings found for Anilist ID: ${anilistId}`);
			}

			const mappings = JSON.parse(mappingsData);
			if (!mappings.aniwatch) {
				throw new Error(`No aniwatch mapping found for Anilist ID: ${anilistId}`);
			}

			// Use the aniwatch mapping to get anime ID
			const aniwatchId = mappings.aniwatch.split("-").pop();
			
			// Get episode embeds for the specific episode
			const watchPageUrl = `https://hianime.to/ajax/v2/episode/list/${aniwatchId}`;
			const response = await safeRequest(watchPageUrl, {
				method: "GET",
			});

			const html = response?.data.html;
			const $: CheerioAPI = load(html);

			// Find the specific episode
			let targetEpId = null;
			$("div.ss-list > a.ssl-item.ep-item").each((i, el) => {
				const epId = $(el).attr("data-id");
				const episodeNo = parseInt($(el).attr("data-number") || "0");
				
				if (episodeNo === epNo) {
					targetEpId = epId;
					return false; // Break the loop
				}
			});

			if (!targetEpId) {
				throw new Error(`Episode ${epNo} not found for Anilist ID: ${anilistId}`);
			}

			// Get servers for this specific episode
			const serversUrl = `https://hianime.to/ajax/v2/episode/servers?episodeId=${targetEpId}`;
			const serversResponse = await safeRequest(serversUrl, {
				method: "GET",
			});

			const servers: any[] = [];
			const serversHtml = serversResponse?.data.html;
			const $servers = load(serversHtml);

			// Get SUB servers
			$servers(
				"div.ps_-block.ps_-block-sub.servers-sub > div.ps__-list > div.item.server-item",
			).each((i, el) => {
				const serverId = $servers(el).attr("data-id");
				const serverName =
					SERVER_MAP[$servers(el).attr("data-server-id") as keyof typeof SERVER_MAP];
				const type = "SUB";

				servers.push({
					epNo,
					serverName,
					serverId,
					type,
				});
			});

			// Get DUB servers
			$servers(
				"div.ps_-block.ps_-block-sub.servers-dub > div.ps__-list > div.item.server-item",
			).each((i, el) => {
				const serverId = $servers(el).attr("data-id");
				const serverName =
					SERVER_MAP[$servers(el).attr("data-server-id") as keyof typeof SERVER_MAP];
				const type = "DUB";

				servers.push({
					epNo,
					serverName,
					serverId,
					type,
				});
			});

			// Get embeds for each server
			const embeds = [];
			for (const server of servers) {
				const embedUrl = `https://hianime.to/ajax/v2/episode/sources?id=${server.serverId}`;
				const embedResponse = await safeRequest(embedUrl, {
					method: "GET",
				});

				const data = embedResponse?.data;
				const embed = {
					...server,
					embedLink: data.link,
					serverIdx: data.server,
				};

				embeds.push(embed);
			}

			// Save embeds to Redis using the same format as getStreamingEpisodeEmbeds
			if (embeds.length > 0) {
				// Group embeds by type
				const subEmbeds = embeds.filter(embed => embed.type === "SUB");
				const dubEmbeds = embeds.filter(embed => embed.type === "DUB");

				// Save SUB embeds if any
				if (subEmbeds.length > 0) {
					await cache(`anime:${anilistId}:SUB:${epNo}`, subEmbeds);
				}

				// Save DUB embeds if any
				if (dubEmbeds.length > 0) {
					await cache(`anime:${anilistId}:DUB:${epNo}`, dubEmbeds);
				}

				console.log(`💾 Saved ${embeds.length} embeds for Anilist ID ${anilistId}, Episode ${epNo}`);
			}

			return embeds;
		} catch (error) {
			console.error(`Error getting episode embeds for Anilist ID ${anilistId}, Episode ${epNo}:`, error);
			throw error;
		}
	};
}
