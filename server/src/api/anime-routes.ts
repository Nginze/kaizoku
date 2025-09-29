import { Router, Request, Response } from "express";
import Anime from "../models/anime";
import { redis } from "../config/redis";
import { z } from "zod";

export const router = Router();

// Enhanced validation schemas
const searchQuerySchema = z.object({
  q: z.string().optional(),
  tags: z
    .string()
    .transform((str) => str.split(",").filter(Boolean))
    .optional(),
  year: z.coerce.number().min(1950).max(2030).optional(),
  status: z
    .enum(["FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS"])
    .optional(),
  format: z
    .enum(["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"])
    .optional(),
  score: z.coerce.number().min(0).max(100).optional(),
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
  "source-material": z
    .enum([
      "ORIGINAL",
      "MANGA",
      "LIGHT_NOVEL",
      "VISUAL_NOVEL",
      "VIDEO_GAME",
      "OTHER",
      "NOVEL",
      "DOUJINSHI",
      "ANIME",
    ])
    .optional(),
  dub: z.enum(["true", "false"]).optional(),
  sort_by: z
    .enum([
      "SCORE_DESC",
      "SCORE_ASC",
      "POPULARITY_DESC",
      "POPULARITY_ASC",
      "TRENDING_DESC",
      "TRENDING_ASC",
      "UPDATED_AT_DESC",
      "UPDATED_AT_ASC",
      "START_DATE_DESC",
      "START_DATE_ASC",
      "END_DATE_DESC",
      "END_DATE_ASC",
      "FAVOURITES_DESC",
      "FAVOURITES_ASC",
      "TITLE_ROMAJI",
      "TITLE_ENGLISH",
    ])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  sort_by: z
    .enum([
      "SCORE_DESC",
      "SCORE_ASC",
      "POPULARITY_DESC",
      "POPULARITY_ASC",
      "TRENDING_DESC",
      "TRENDING_ASC",
      "UPDATED_AT_DESC",
      "UPDATED_AT_ASC",
      "START_DATE_DESC",
      "START_DATE_ASC",
      "END_DATE_DESC",
      "END_DATE_ASC",
      "FAVOURITES_DESC",
      "FAVOURITES_ASC",
      "TITLE_ROMAJI",
      "TITLE_ENGLISH",
    ])
    .optional(),
});

const episodeParamsSchema = z.object({
  animeId: z.string(),
  epId: z.string(),
});

// Helper function to build MongoDB aggregation pipeline based on sort option
function getSortPipeline(sortBy?: string) {
  const sortStage: any = {};

  switch (sortBy) {
    case "SCORE_DESC":
      sortStage.averageScore = -1;
      break;
    case "SCORE_ASC":
      sortStage.averageScore = 1;
      break;
    case "POPULARITY_DESC":
      sortStage.popularity = -1;
      break;
    case "POPULARITY_ASC":
      sortStage.popularity = 1;
      break;
    case "FAVOURITES_DESC":
      sortStage.favourites = -1;
      break;
    case "FAVOURITES_ASC":
      sortStage.favourites = 1;
      break;
    case "START_DATE_DESC":
      sortStage.startDate = -1;
      break;
    case "START_DATE_ASC":
      sortStage.startDate = 1;
      break;
    case "TITLE_ROMAJI":
      sortStage["title.romaji"] = 1;
      break;
    case "TITLE_ENGLISH":
      sortStage["title.english"] = 1;
      break;
    default:
      sortStage.popularity = -1; // Default sort by popularity
  }

  return { $sort: sortStage };
}

// Helper function to build search filters
function buildSearchFilters(query: any) {
  const filters: any = { $and: [] };

  // Text search
  if (query.q) {
    filters.$and.push({
      $or: [
        { "title.romaji": { $regex: query.q, $options: "i" } },
        { "title.english": { $regex: query.q, $options: "i" } },
        { "title.native": { $regex: query.q, $options: "i" } },
        { synonyms: { $in: [new RegExp(query.q, "i")] } },
      ],
    });
  }

  // Tags filter
  if (query.tags && query.tags.length > 0) {
    filters.$and.push({
      "tags.name": { $in: query.tags },
    });
  }

  // Year filter
  if (query.year) {
    filters.$and.push({
      "startDate.year": query.year,
    });
  }

  // Status filter
  if (query.status) {
    filters.$and.push({
      status: query.status,
    });
  }

  // Format filter
  if (query.format) {
    filters.$and.push({
      format: query.format,
    });
  }

  // Score filter (minimum score)
  if (query.score) {
    filters.$and.push({
      averageScore: { $gte: query.score },
    });
  }

  // Season filter
  if (query.season) {
    filters.$and.push({
      season: query.season,
    });
  }

  // Source material filter
  if (query["source-material"]) {
    filters.$and.push({
      source: query["source-material"],
    });
  }

  // Remove empty $and if no filters
  if (filters.$and.length === 0) {
    return {};
  }

  return filters;
}

// SEARCH & DISCOVERABILITY ROUTES

// /anime/search - Advanced search with all filters
router.get("/search", async (req: Request, res: Response) => {
  try {
    const query = searchQuerySchema.parse(req.query);
    const { page, limit, sort_by, ...searchParams } = query;

    const filters = buildSearchFilters(searchParams);
    const sortPipeline = getSortPipeline(sort_by);
    const skip = (page - 1) * limit;

    const [results, totalCount] = await Promise.all([
      Anime.aggregate([
        { $match: filters },
        sortPipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            idAnilist: 1,
            title: 1,
            coverImage: 1,
            bannerImage: 1,
            startDate: 1,
            description: 1,
            season: 1,
            seasonYear: 1,
            format: 1,
            status: 1,
            episodes: 1,
            genres: 1,
            averageScore: 1,
            popularity: 1,
            favourites: 1,
            isAdult: 1,
          },
        },
      ]),
      Anime.countDocuments(filters),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.json({
      currentPage: page,
      hasNextPage,
      hasPreviousPage,
      totalPages,
      totalResults: totalCount,
      results,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    res.status(400).json({
      error: "Invalid search parameters",
      details: error.message,
    });
  }
});

// /anime/featured - Cached featured anime
router.get("/featured", async (req: Request, res: Response) => {
  try {
    const cacheKey = "anime:featured:new";

    // Try to get from Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // If not cached, get from database
    const featured = await Anime.aggregate([
      { $match: { status: "RELEASING", averageScore: { $gte: 70 } } },
      { $sort: { popularity: -1, averageScore: -1 } },
      { $limit: 12 },
      {
        $project: {
          idAnilist: 1,
          title: 1,
          coverImage: 1,
          bannerImage: 1,
          description: 1,
          genres: 1,
          averageScore: 1,
          popularity: 1,
          status: 1,
          episodes: 1,
        },
      },
    ]);

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(featured));

    res.json(featured);
  } catch (error: any) {
    console.error("Featured anime error:", error);
    res.status(500).json({
      error: "Failed to fetch featured anime",
      details: error.message,
    });
  }
});

// /anime/recent-releases - Cached recent releases
router.get("/recent-releases", async (req: Request, res: Response) => {
  try {
    const cacheKey = "recent-releases";

    // Get from Redis cache
    const cached = await redis.get(cacheKey);

    res.json(JSON.parse(cached!));
  } catch (error: any) {
    console.error("Recent releases error:", error);
    res.status(500).json({
      error: "Failed to fetch recent releases",
      details: error.message,
    });
  }
});

// /anime/popular - Popular anime with pagination
router.get("/popular", async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const sortPipeline = getSortPipeline(query.sort_by || "POPULARITY_DESC");

    const [results, totalCount] = await Promise.all([
      Anime.aggregate([
        { $match: { popularity: { $exists: true, $gt: 0 } } },
        sortPipeline,
        { $skip: skip },
        { $limit: query.limit },
        {
          $project: {
            idAnilist: 1,
            title: 1,
            coverImage: 1,
            format: 1,
            status: 1,
            episodes: 1,
            genres: 1,
            averageScore: 1,
            popularity: 1,
          },
        },
      ]),
      Anime.countDocuments({ popularity: { $exists: true, $gt: 0 } }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      currentPage: query.page,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
      totalPages,
      totalResults: totalCount,
      results,
    });
  } catch (error: any) {
    console.error("Popular anime error:", error);
    res.status(500).json({
      error: "Failed to fetch popular anime",
      details: error.message,
    });
  }
});

// /anime/top-rated - Top rated anime with score filtering
router.get("/top-rated", async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const sortPipeline = getSortPipeline(query.sort_by || "SCORE_DESC");

    const [results, totalCount] = await Promise.all([
      Anime.aggregate([
        { $match: { averageScore: { $exists: true, $gte: 60 } } },
        sortPipeline,
        { $skip: skip },
        { $limit: query.limit },
        {
          $project: {
            idAnilist: 1,
            title: 1,
            coverImage: 1,
            format: 1,
            status: 1,
            episodes: 1,
            genres: 1,
            averageScore: 1,
            favourites: 1,
          },
        },
      ]),
      Anime.countDocuments({ averageScore: { $exists: true, $gte: 60 } }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      currentPage: query.page,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
      totalPages,
      totalResults: totalCount,
      results,
    });
  } catch (error: any) {
    console.error("Top rated anime error:", error);
    res.status(500).json({
      error: "Failed to fetch top rated anime",
      details: error.message,
    });
  }
});

// /anime/top-airing - Currently airing anime sorted by score/popularity
router.get("/top-airing", async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const sortPipeline = getSortPipeline(query.sort_by || "SCORE_DESC");

    const [results, totalCount] = await Promise.all([
      Anime.aggregate([
        { $match: { status: "RELEASING" } },
        sortPipeline,
        { $skip: skip },
        { $limit: query.limit },
        {
          $project: {
            idAnilist: 1,
            title: 1,
            coverImage: 1,
            format: 1,
            episodes: 1,
            genres: 1,
            averageScore: 1,
            popularity: 1,
            startDate: 1,
          },
        },
      ]),
      Anime.countDocuments({ status: "RELEASING" }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      currentPage: query.page,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
      totalPages,
      totalResults: totalCount,
      results,
    });
  } catch (error: any) {
    console.error("Top airing anime error:", error);
    res.status(500).json({
      error: "Failed to fetch top airing anime",
      details: error.message,
    });
  }
});

// /anime/upcoming - Upcoming anime releases
router.get("/upcoming", async (req: Request, res: Response) => {
  try {
    const query = paginationSchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;
    const sortPipeline = getSortPipeline(query.sort_by || "START_DATE_ASC");

    const [results, totalCount] = await Promise.all([
      Anime.aggregate([
        { $match: { status: "NOT_YET_RELEASED" } },
        sortPipeline,
        { $skip: skip },
        { $limit: query.limit },
        {
          $project: {
            idAnilist: 1,
            title: 1,
            coverImage: 1,
            startDate: 1,
            format: 1,
            episodes: 1,
            genres: 1,
            description: 1,
            season: 1,
            seasonYear: 1,
          },
        },
      ]),
      Anime.countDocuments({ status: "NOT_YET_RELEASED" }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      currentPage: query.page,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
      totalPages,
      totalResults: totalCount,
      results,
    });
  } catch (error: any) {
    console.error("Upcoming anime error:", error);
    res.status(500).json({
      error: "Failed to fetch upcoming anime",
      details: error.message,
    });
  }
});

// CONTENT SOURCES ROUTES

// /anime/:animeId/episodes/:epId/sources - Get episode sources from Redis
router.get(
  "/:animeId/episodes/:epId/sources",
  async (req: Request, res: Response) => {
    try {
      const { animeId, epId } = episodeParamsSchema.parse(req.params);
      const { type = "SUB" } = req.query;

      // Validate type parameter
      if (!["SUB", "DUB"].includes(type as string)) {
        res.status(400).json({
          error: "Invalid type parameter. Must be 'SUB' or 'DUB'",
        });
      }

      const cacheKey = `anime:${animeId}:${type}:${epId}`;

      // Get sources from Redis
      const sources = await redis.get(cacheKey);

      if (!sources) {
        res.status(404).json({
          error: "Episode sources not found",
          message: `No ${type} sources available for anime ${animeId} episode ${epId}`,
        });
      }

      const parsedSources = JSON.parse(sources!);

      res.json({
        animeId,
        episodeId: epId,
        type,
        sources: parsedSources,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Episode sources error:", error);
      res.status(500).json({
        error: "Failed to fetch episode sources",
        details: error.message,
      });
    }
  },
);

// Alternative route: /anime/:animeId/episodes/:epId/servers
router.get(
  "/:animeId/episodes/:epId/servers",
  async (req: Request, res: Response) => {
    try {
      const { animeId, epId } = episodeParamsSchema.parse(req.params);
      const { type = "SUB" } = req.query;

      // Validate type parameter
      if (!["SUB", "DUB"].includes(type as string)) {
        res.status(400).json({
          error: "Invalid type parameter. Must be 'SUB' or 'DUB'",
        });
      }

      const cacheKey = `anime:${animeId}:${type}:${epId}`;

      // Get servers/sources from Redis
      const servers = await redis.get(cacheKey);

      if (!servers) {
        res.status(404).json({
          error: "Episode servers not found",
          message: `No ${type} servers available for anime ${animeId} episode ${epId}`,
        });
      }

      const parsedServers = JSON.parse(servers!);

      res.json({
        animeId,
        episodeId: epId,
        type,
        servers: parsedServers,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Episode servers error:", error);
      res.status(500).json({
        error: "Failed to fetch episode servers",
        details: error.message,
      });
    }
  },
);
