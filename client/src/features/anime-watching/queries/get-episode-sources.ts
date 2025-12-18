import { client } from "@/lib/api";
import { watchKeys } from "@/lib/query-keys";

export const getEpisodeSourcesOptions = (serverId: string) => ({
  queryKey: watchKeys.episodeSources(serverId),
  queryFn: () => client.getEpisodeSources(serverId),
  enabled: !!serverId, // Only fetch if serverId is provided
});
