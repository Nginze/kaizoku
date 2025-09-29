import { AnimeResult, AnimeSearchFilters } from "@/types/anime";
import { api } from "./index";
import { PaginatedResponse, PaginationParams } from "@/types/pagination";


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
};

export default anime;

