import { queryOptions } from "@tanstack/react-query";
import { animeKeys } from "@/lib/query-keys";
import { client } from "@/lib/api";

export const getScheduleListOptions = () => {
	return queryOptions({
		queryKey: animeKeys.schedule(),
		queryFn: () => client.getSchedule(),
	});
};
