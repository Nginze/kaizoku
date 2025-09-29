import { queryOptions } from "@tanstack/react-query";
import { animeKeys } from "@/lib/query-keys";
import { client } from "@/lib/api";
import { AnimeSearchFilters } from "@/types/anime";

export const getSearchOptions = (filters: AnimeSearchFilters) => {
	return queryOptions({
		queryKey: animeKeys.search(filters),
		queryFn: () => client.search(filters),
		enabled: !!(filters.q || filters.tags || filters.year || filters.status || filters.format),
	});
};

export const getPopularOptions = (params = {}) => {
	return queryOptions({
		queryKey: animeKeys.popular(params),
		queryFn: () => client.getPopular(params),
	});
};

export const getTopRatedOptions = (params = {}) => {
	return queryOptions({
		queryKey: animeKeys.topRated(params),
		queryFn: () => client.getTopRated(params),
	});
};

export const getTopAiringOptions = (params = {}) => {
	return queryOptions({
		queryKey: animeKeys.topAiring(params),
		queryFn: () => client.getTopAiring(params),
	});
};

export const getUpcomingOptions = (params = {}) => {
	return queryOptions({
		queryKey: animeKeys.upcoming(params),
		queryFn: () => client.getUpcoming(params),
	});
};