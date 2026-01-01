import { AnimeResult } from "./anime";

export interface TrendingExtras {
  type: "daily" | "weekly";
  malId: number;
  picture: string;
  members: number;
  score: number | null;
  hits: number;
  change?: number; // Only present in weekly trending
}

export interface TrendingAnime extends AnimeResult {
  extras: AnimeResult["extras"] & {
    trending: TrendingExtras;
  };
}

export interface TrendingResponse {
  type: "daily" | "weekly";
  trending: TrendingAnime[];
  count: number;
  timestamp: string;
}
