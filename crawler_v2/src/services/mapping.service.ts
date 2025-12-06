import { CheerioAPI, load } from "cheerio";
import { safeRequest } from "../utils/safe-request";
import { findBestMatch } from "string-similarity";
import { redis } from "../config/redis";

export class MappingService {
	constructor() {}

	private getBestTitle(animeMeta: any): string {
		const titles = [
			animeMeta.title?.romaji,
			animeMeta.title?.english,
			animeMeta.title?.native,
			animeMeta.title?.userPreferred,
		];

		console.log(titles);

		return titles.find((title) => title && title.trim() !== "") || "Unknown";
	}

	async getMappingsByAnilistId(anilistId: number) {
		try {
			const cached = await redis.get(`mappings:${anilistId}`);
			if (cached) {
				return JSON.parse(cached);
			}
			return null;
		} catch (error) {
			console.error("Error retrieving mappings from Redis:", error);
			return null;
		}
	}

	async genMappings(animeMeta: any) {
		const bestTitle = this.getBestTitle(animeMeta);
		console.log("GENERATING MAPPINGS FOR", bestTitle);
		const providers = [
			{ name: "AniWatch", endpoint: "https://hianime.to/search/" },
			// {
			// 	name: "Gogoanime",
			// 	endpoint: "https://ww19.gogoanimes.fi/search.html",
			// },
		];

		const mappingsArray = [];
		const mappingsObject: any = {};

		for (const provider of providers) {
			const url = `${provider.endpoint}?keyword=${encodeURIComponent(bestTitle)}`;

			const response = await safeRequest(url, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			let html;
			let searchResults: any[] = [];
			let $: CheerioAPI;

			switch (provider.name) {
				case "AniWatch":
					html = response?.data;
					$ = load(html);
					searchResults = [];

					$("div.film_list-wrap > div.flw-item").each((i, el) => {
						const title = $(el)
							.find("div.film-detail h3.film-name a.dynamic-name")
							.attr("title")!
							.trim()
							.replace(/\\n/g, "");
						const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;
						const img = $(el).find("img").attr("data-src")!;

						const altTitles: string[] = [];
						const jpName = $(el)
							.find("div.film-detail h3.film-name a.dynamic-name")
							.attr("data-jname")!
							.trim()
							.replace(/\\n/g, "");
						altTitles.push(jpName);

						const format: string = $(el)
							.find("div.film-detail div.fd-infor span.fdi-item")
							?.first()
							?.text()
							.toUpperCase();

						searchResults.push({
							title,
							id,
							img,
							altTitles,
							format,
						});
					});
					const bestMatch = findBestMatch(
						bestTitle,
						searchResults.map((result) => result.title),
					);

					if (bestMatch.bestMatch.rating > 0.3) {
						// Only accept matches with decent similarity
						const matchedResult = searchResults[bestMatch.bestMatchIndex];
						const mapping = {
							provider: provider.name,
							id: matchedResult.id,
							title: matchedResult.title,
						};
						mappingsArray.push(mapping);
						mappingsObject.aniwatch = mapping.id;
					}
					console.log("H!ANIME RESULTS");
				case "Gogoanime":
					html = response?.data;
					$ = load(html);
					searchResults = [];

				// const bestMatch = findBestMatch(animeMeta, searchResults);
				// if (bestMatch) {
				//   mappings.push({
				//     provider: provider.name,
				//     id: bestMatch.id,
				//     title: bestMatch.title,
				//   });
				// }
				default:
					break;
			}

			if (animeMeta.idAnilist && mappingsArray.length > 0) {
				console.log("Is saving mappings");
				try {
					await redis.set(
						`mappings:${animeMeta.idAnilist}`,
						JSON.stringify(mappingsObject),
					);
				} catch (error) {
					console.error("Error saving mappings to Redis:", error);
				}
			}
			return mappingsObject;
		}
	}
}
