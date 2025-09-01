import { existsSync, readFileSync } from "fs";
import {
	QUERY_GET_ANIME_META,
	QUERY_GET_FEATURED_LIST,
} from "../constants/gql-queries";
import { ANILIST_URL } from "../constants/misc";
import { safeRequest } from "../utils/safe-request";
import axios from "axios";
import { extractIdsFromSitemap } from "../utils/extract";
import { saveToFile } from "../config/file";
import { cache } from "../config/redis";
import path from "path";

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
