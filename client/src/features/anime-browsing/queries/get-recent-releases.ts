import { queryOptions } from "@tanstack/react-query";
import { animeKeys } from "@/lib/query-keys";
import { client } from "@/lib/api";

export const getRecentReleasesOptions = () => {
	return queryOptions({
		queryKey: animeKeys.recentReleases(),
		queryFn: () => client.getRecentReleases(),
	});
};