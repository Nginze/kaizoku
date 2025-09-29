import { existsSync, readFileSync } from "fs";
import {
	QUERY_GET_ANIME_META,
	QUERY_GET_FEATURED_LIST,
	QUERY_GET_BATCH_ANIME_META,
} from "../constants/gql-queries";
import { ANILIST_URL } from "../constants/misc";
import { safeRequest } from "../utils/safe-request";
import axios from "axios";
import { extractIdsFromSitemap } from "../utils/extract";
import { saveToFile } from "../config/file";
import { cache } from "../config/redis";
import path from "path";

// Utility function to chunk arrays into smaller batches
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
};

// Utility function to add delay between batch requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class AnilistService {
	constructor() {}

	getAnilistMetaFromId = async (id: string) => {
		const args = {
			query: `
        query ($id: Int) {
            Media (id: $id) {
                ${QUERY_GET_ANIME_META}
            }
        }
    `,
			variables: {
				id,
			},
		};

		const response = await safeRequest(ANILIST_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			data: args,
		});

		const media = response?.data?.data?.Media;
		if (media) {
			media.idAnilist = media.id;
			delete media.id;
		}

		return media;
	};

	getAnilistMetaFromMalId = async (malId: string) => {
		const args = {
			query: `
        query ($idMal: Int) {
            Media (idMal: $idMal) {
                ${QUERY_GET_ANIME_META}
            }
        }
    `,
			variables: {
				idMal: parseInt(malId),
			},
		};

		const response = await safeRequest(ANILIST_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			data: args,
		});

		const media = response?.data?.data?.Media;
		if (media) {
			media.idAnilist = media.id;
			delete media.id;
		}

		return media;
	};

	getBatchAnilistMetaFromIds = async (
		ids: string[],
		batchSize: number = 50,
	): Promise<any[]> => {
		const results: any[] = [];
		const idChunks = chunkArray(
			ids.map((id) => parseInt(id)),
			batchSize,
		);

		console.log(
			`Processing ${ids.length} IDs in ${idChunks.length} batches of ${batchSize}`,
		);

		for (let i = 0; i < idChunks.length; i++) {
			const chunk = idChunks[i];
			console.log(
				`Processing batch ${i + 1}/${idChunks.length} (${chunk.length} IDs)`,
			);

			try {
				const args = {
					query: QUERY_GET_BATCH_ANIME_META,
					variables: {
						ids: chunk,
						perPage: batchSize,
					},
				};

				const response = await safeRequest(ANILIST_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					data: args,
				});

				const mediaList = response?.data?.data?.Page?.media || [];

				// Process each media item to normalize the ID field
				const processedMedia = mediaList.map((media: any) => {
					if (media) {
						media.idAnilist = media.id;
						delete media.id;
					}
					return media;
				});

				results.push(...processedMedia);

				console.log(
					`Batch ${i + 1} completed: ${processedMedia.length} records fetched`,
				);

				// Add a small delay between batches to be extra safe
				if (i < idChunks.length - 1) {
					await delay(100);
				}
			} catch (error) {
				console.error(`Error processing batch ${i + 1}:`, error);
				// Continue with next batch instead of failing completely
			}
		}

		console.log(
			`Batch processing completed: ${results.length} total records fetched`,
		);
		return results;
	};

	getBatchAnilistMetaFromMalIds = async (
		malIds: string[],
		batchSize: number = 50,
	): Promise<any[]> => {
		const results: any[] = [];
		const malIdChunks = chunkArray(
			malIds.map((id) => parseInt(id)),
			batchSize,
		);

		console.log(
			`Processing ${malIds.length} MAL IDs in ${malIdChunks.length} batches of ${batchSize}`,
		);

		for (let i = 0; i < malIdChunks.length; i++) {
			const chunk = malIdChunks[i];
			console.log(
				`Processing batch ${i + 1}/${malIdChunks.length} (${chunk.length} MAL IDs)`,
			);

			try {
				const args = {
					query: QUERY_GET_BATCH_ANIME_META,
					variables: {
						malIds: chunk,
						perPage: batchSize,
					},
				};

				const response = await safeRequest(ANILIST_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					data: args,
				});

				const mediaList = response?.data?.data?.Page?.media || [];

				// Process each media item to normalize the ID field
				const processedMedia = mediaList.map((media: any) => {
					if (media) {
						media.idAnilist = media.id;
						delete media.id;
					}
					return media;
				});

				results.push(...processedMedia);
				console.log(
					`Batch ${i + 1} completed: ${processedMedia.length} records fetched`,
				);

				// Add a small delay between batches to be extra safe
				if (i < idChunks.length - 1) {
					await delay(100);
				}
			} catch (error) {
				console.error(`Error processing batch ${i + 1}:`, error);
				// Continue with next batch instead of failing completely
			}
		}

		console.log(
			`Batch processing completed: ${results.length} total records fetched`,
		);
		return results;
	};

	getAnilistIds = async (): Promise<string[]> => {
		const filePath = path.join(__dirname, "../anilist-ids.json");

		if (existsSync(filePath)) {
			console.log("READING IDS FROM CACHED FILE");
			const data = readFileSync(filePath, "utf-8");
			return JSON.parse(data);
		}

		const siteMap1 = axios.get("https://anilist.co/sitemap/anime-0.xml");
		const siteMap2 = axios.get("https://anilist.co/sitemap/anime-1.xml");
		const [res1, res2] = await Promise.all([siteMap1, siteMap2]);

		const ids1 = extractIdsFromSitemap(res1.data);
		const ids2 = extractIdsFromSitemap(res2.data);

		// save ids to file
		saveToFile("anilist-ids.json", ids1.concat(ids2));

		return ids1.concat(ids2);
	};

	getFeaturedAnime = async () => {
		try {
			const args = {
				query: QUERY_GET_FEATURED_LIST,
				variables: {
					page: 1,
					type: "ANIME",
					sort: ["TRENDING_DESC", "POPULARITY_DESC"],
					yearGreater: 20239999,
					yearLesser: 20270000,
				},
			};

			const response = await safeRequest(ANILIST_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				data: args,
			});

			const featuredList = response?.data.data.Page.media;
			await cache("featured-list", featuredList);
		} catch (error) {
			console.log(error);
		}
	};
}
