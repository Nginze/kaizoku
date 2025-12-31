import { queryOptions } from "@tanstack/react-query";
import { authKeys } from "@/lib/query-keys";
import { client } from "@/lib/api";

export const getMeOptions = () => {
	return queryOptions({
		queryKey: authKeys.me(),
		queryFn: () => client.getMe(),
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false, // Don't retry on 401
	});
};
