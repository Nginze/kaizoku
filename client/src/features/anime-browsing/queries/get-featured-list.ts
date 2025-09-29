import { queryOptions } from "@tanstack/react-query";
import { animeKeys } from "@/lib/query-keys";
import { client } from "@/lib/api";

export const getFeaturedListOptions = () => {
	return queryOptions({
		queryKey: animeKeys.featured(),
		queryFn: () => client.getFeatured(),
	});
};
