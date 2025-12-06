import { AnimeResult, AnimeSearchFilters } from "@/types/anime";
import { api } from "./index";
import { PaginatedResponse, PaginationParams } from "@/types/pagination";
import { ScheduleResponse } from "@/types/schedule";
import { WatchInfo } from "@/types/watch";


export const anime = {
	// SEARCH & DISCOVERABILITY

	/**
	 * Advanced search with all filters
	 */
	search: async (
		filters: AnimeSearchFilters,
	): Promise<PaginatedResponse<AnimeResult>> => {
		const params = new URLSearchParams();

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params.append(key, value.toString());
			}
		});

		const response = await api.get(`/anime/search?${params.toString()}`);
		return response.data;
	},

	/**
	 * Get cached featured anime
	 */
	getFeatured: async (): Promise<AnimeResult[]> => {
		const response = await api.get("/anime/featured");
		return response.data;
	},

	/**
	 * Get cached recent releases
	 */
	getRecentReleases: async (): Promise<any[]> => {
		const response = await api.get("/anime/recent-releases");
		return response.data;
	},

	/**
	 * Get popular anime with pagination
	 */
	getPopular: async (
		params: PaginationParams = {},
	): Promise<PaginatedResponse<AnimeResult>> => {
		const queryParams = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.append(key, value.toString());
			}
		});

		const response = await api.get(`/anime/popular?${queryParams.toString()}`);
		return response.data;
	},

	/**
	 * Get top rated anime with score filtering
	 */
	getTopRated: async (
		params: PaginationParams = {},
	): Promise<PaginatedResponse<AnimeResult>> => {
		const queryParams = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.append(key, value.toString());
			}
		});

		const response = await api.get(
			`/anime/top-rated?${queryParams.toString()}`,
		);
		return response.data;
	},

	/**
	 * Get currently airing anime sorted by score/popularity
	 */
	getTopAiring: async (
		params: PaginationParams = {},
	): Promise<PaginatedResponse<AnimeResult>> => {
		const queryParams = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.append(key, value.toString());
			}
		});

		const response = await api.get(
			`/anime/top-airing?${queryParams.toString()}`,
		);
		return response.data;
	},

	/**
	 * Get upcoming anime releases
	 */
	getUpcoming: async (
		params: PaginationParams = {},
	): Promise<PaginatedResponse<AnimeResult>> => {
		const queryParams = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				queryParams.append(key, value.toString());
			}
		});

		const response = await api.get(`/anime/upcoming?${queryParams.toString()}`);
		return response.data;
	},

	getSchedule: async (): Promise<ScheduleResponse> => {
		const response = await api.get("/anime/schedule");
		return response.data;
	},

	getWatchInfo: async ({ animeId, epNo }: {animeId: string, epNo: string }): Promise<WatchInfo> => {
		const params = new URLSearchParams();
		if (epNo) {
			params.append('epNo', epNo);
		}

		const response = await api.get(`/anime/watch/${animeId}${params.toString() ? `?${params.toString()}` : ''}`);
		return response.data;
	},

	/**
	 * Get episode sources from embed URL
	 */
	getEpisodeSources: async (embedUrl: string): Promise<any> => {
		const params = new URLSearchParams();
		params.append('embedUrl', embedUrl);

		const response = await api.get(`/anime/get-sources?${params.toString()}`);
		return response.data.data;
	}

};

export default anime;

