import { Router } from "express";
import { proxyRouter } from "./proxy-routes";

export const router = Router();

// API info route
router.get("/", (_, res) => {
	res.json({
		message: "AniDB API",
		version: "1.0.0",
		endpoints: {
			search: "/api/anime/search",
			featured: "/api/anime/featured",
			recentReleases: "/api/anime/recent-releases",
			popular: "/api/anime/popular",
			topRated: "/api/anime/top-rated",
			topAiring: "/api/anime/top-airing",
			upcoming: "/api/anime/upcoming",
			episodeSources: "/api/anime/:animeId/episodes/:epId/sources",
			episodeServers: "/api/anime/:animeId/episodes/:epId/servers",
			proxy: "/api/proxy/video",
		},
	});
});
