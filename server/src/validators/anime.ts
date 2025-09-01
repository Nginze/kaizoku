import { z } from "zod";

export const animeQuerySchema = z.object({
  filterby: z.enum(["sub", "dub", "all", "popular", "recent"]).default("all"),
  sortby: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  genres: z
    .string()
    .transform((str) => str.split(","))
    .optional(),
  season: z.enum(["winter", "spring", "summer", "fall"]).optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
});
