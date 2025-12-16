import { AnimeSearchFilters } from "@/types/anime";
import { PaginationParams } from "@/types/pagination";

/**
 * Query key factory for anime-related queries
 * Provides consistent, hierarchical query keys for TanStack Query
 */
export const animeKeys = {
  // Base key for all anime queries
  all: ["anime"] as const,

  // DISCOVERABILITY & SEARCH
  search: (filters?: AnimeSearchFilters) =>
    [...animeKeys.all, "search", filters] as const,

  featured: () => [...animeKeys.all, "featured"] as const,

  recentReleases: () => [...animeKeys.all, "recent-releases"] as const,

  topMovies: (params?: PaginationParams) =>
    [...animeKeys.all, "top-movies", params] as const,

  schedule: () => [...animeKeys.all, "schedule"] as const,

  // POPULAR & TRENDING
  popular: (params?: PaginationParams) =>
    [...animeKeys.all, "popular", params] as const,

  topRated: (params?: PaginationParams) =>
    [...animeKeys.all, "top-rated", params] as const,

  topAiring: (params?: PaginationParams) =>
    [...animeKeys.all, "top-airing", params] as const,

  upcoming: (params?: PaginationParams) =>
    [...animeKeys.all, "upcoming", params] as const,

  // CATEGORY QUERIES
  byGenre: (tags: string[], page = 1, limit = 20) =>
    [...animeKeys.all, "by-genre", { tags, page, limit }] as const,

  byYear: (year: number, page = 1, limit = 20) =>
    [...animeKeys.all, "by-year", { year, page, limit }] as const,

  bySeason: (season: string, year?: number, page = 1, limit = 20) =>
    [...animeKeys.all, "by-season", { season, year, page, limit }] as const,

  byTitle: (query: string, page = 1, limit = 20) =>
    [...animeKeys.all, "by-title", { query, page, limit }] as const,

  // EPISODE SOURCES
  sources: () => [...animeKeys.all, "sources"] as const,

  episodeSources: (
    animeId: string,
    epId: string,
    type: "SUB" | "DUB" = "SUB"
  ) => [...animeKeys.sources(), "episode", { animeId, epId, type }] as const,

  episodeServers: (
    animeId: string,
    epId: string,
    type: "SUB" | "DUB" = "SUB"
  ) => [...animeKeys.sources(), "servers", { animeId, epId, type }] as const,

  // INDIVIDUAL ANIME
  detail: (id: string) => [...animeKeys.all, "detail", id] as const,

  episodes: (id: string) => [...animeKeys.detail(id), "episodes"] as const,

  // UTILITY QUERIES
  filters: () => [...animeKeys.all, "filters"] as const,

  genres: () => [...animeKeys.filters(), "genres"] as const,

  tags: () => [...animeKeys.filters(), "tags"] as const,

  // INFINITE QUERIES (for pagination)
  infiniteSearch: (filters?: AnimeSearchFilters) =>
    [...animeKeys.all, "infinite-search", filters] as const,

  infinitePopular: (params?: Omit<PaginationParams, "page">) =>
    [...animeKeys.all, "infinite-popular", params] as const,

  infiniteTopRated: (params?: Omit<PaginationParams, "page">) =>
    [...animeKeys.all, "infinite-top-rated", params] as const,

  infiniteTopAiring: (params?: Omit<PaginationParams, "page">) =>
    [...animeKeys.all, "infinite-top-airing", params] as const,

  infiniteUpcoming: (params?: Omit<PaginationParams, "page">) =>
    [...animeKeys.all, "infinite-upcoming", params] as const,

  // CACHE INVALIDATION HELPERS
  invalidateSearch: () => [...animeKeys.all, "search"],

  invalidatePopular: () => [...animeKeys.all, "popular"],

  invalidateTopRated: () => [...animeKeys.all, "top-rated"],

  invalidateTopAiring: () => [...animeKeys.all, "top-airing"],

  invalidateUpcoming: () => [...animeKeys.all, "upcoming"],

  invalidateAll: () => animeKeys.all,
} as const;

export const watchKeys = {
  detail: (params: { animeId: string; epNo?: string | number }) =>
    [...animeKeys.all, "watch", params] as const,

  episodeSources: (embedUrl: string) =>
    [...animeKeys.all, "episode-sources", embedUrl] as const,
};

/**
 * Type-safe query key factory
 * Usage examples:
 *
 * // Basic queries
 * animeKeys.featured() // ["anime", "featured"]
 * animeKeys.recentReleases() // ["anime", "recent-releases"]
 *
 * // Search with filters
 * animeKeys.search({ q: "naruto", page: 1 }) // ["anime", "search", { q: "naruto", page: 1 }]
 *
 * // Pagination
 * animeKeys.popular({ page: 2, limit: 10 }) // ["anime", "popular", { page: 2, limit: 10 }]
 *
 * // Episode sources
 * animeKeys.episodeSources("123", "1", "SUB") // ["anime", "sources", "episode", { animeId: "123", epId: "1", type: "SUB" }]
 *
 * // Invalidation
 * queryClient.invalidateQueries({ queryKey: animeKeys.invalidateSearch() })
 */
export default animeKeys;
