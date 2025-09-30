import { client } from "@/lib/api";
import { watchKeys } from "@/lib/query-keys";

export const getWatchInfoOptions = ({ animeId, epNo }: {animeId: string, epNo: string}) => ({
  queryKey: watchKeys.detail({ animeId, epNo }),
  queryFn: () => client.getWatchInfo({ animeId, epNo }),
});