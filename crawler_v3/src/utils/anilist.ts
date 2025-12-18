import { logger } from "../config/logger";
import { ANILIST_APIURL, QUERY_GET_ANIME_META } from "../constants/gql";
import { safeRequest } from "./safe-request";
import Anime from "../models/anime";

/**
 * Fetches anime metadata from AniList using AniList ID
 */
export const getAnilistMetaFromId = async (id: string | number) => {
  try {
    const args = {
      query: `
        query ($id: Int) {
          Media (id: $id) {
            ${QUERY_GET_ANIME_META}
          }
        }
      `,
      variables: {
        id: typeof id === "string" ? parseInt(id) : id,
      },
    };

    const response = await safeRequest(ANILIST_APIURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: args,
    });

    if (!response?.data?.data?.Media) {
      logger.warn(`No media found for AniList ID: ${id}`);
      return null;
    }

    const media = response.data.data.Media;
    if (media) {
      media.idAnilist = media.id;
      delete media.id;
    }

    return media;
  } catch (error: any) {
    logger.error(
      `Failed to fetch AniList metadata for ID ${id}:`,
      error?.message || error
    );
    return null;
  }
};

/**
 * Fetches anime metadata from AniList using MyAnimeList ID
 */
export const getAnilistMetaFromMalId = async (malId: string | number) => {
  try {
    const args = {
      query: `
        query ($idMal: Int) {
          Media (idMal: $idMal) {
            ${QUERY_GET_ANIME_META}
          }
        }
      `,
      variables: {
        idMal: typeof malId === "string" ? parseInt(malId) : malId,
      },
    };

    const response = await safeRequest(ANILIST_APIURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: args,
    });

    if (!response?.data?.data?.Media) {
      logger.warn(`No media found for MAL ID: ${malId}`);
      return null;
    }

    const media = response.data.data.Media;
    if (media) {
      media.idAnilist = media.id;
      delete media.id;
    }

    return media;
  } catch (error: any) {
    logger.error(
      `Failed to fetch AniList metadata for MAL ID ${malId}:`,
      error?.message || error
    );
    return null;
  }
};

/**
 * Saves anime metadata to MongoDB
 */
export const saveAnimeToDatabase = async (animeData: any) => {
  try {
    if (!animeData?.idAnilist) {
      logger.warn("Cannot save anime without idAnilist");
      return null;
    }

    // Check if anime already exists
    const existingAnime = await Anime.findOne({
      idAnilist: animeData.idAnilist,
    });

    if (existingAnime) {
      logger.info(`Anime ${animeData.idAnilist} already exists in database`);
      return existingAnime;
    }

    // Create new anime record
    const newAnime = new Anime(animeData);
    await newAnime.save();

    logger.info(
      `Successfully saved anime ${animeData.idAnilist} (${
        animeData.title?.romaji || "Unknown"
      }) to database`
    );
    return newAnime;
  } catch (error: any) {
    logger.error(
      `Failed to save anime to database:`,
      error?.message || error
    );
    return null;
  }
};

/**
 * Fetches anime from AniList by MAL ID and saves it to the database
 */
export const fetchAndSaveAnimeByMalId = async (malId: string | number) => {
  try {
    logger.info(`Fetching anime from AniList for MAL ID: ${malId}`);

    const animeData = await getAnilistMetaFromMalId(malId);

    if (!animeData) {
      logger.warn(`No anime data found on AniList for MAL ID: ${malId}`);
      return null;
    }

    const savedAnime = await saveAnimeToDatabase(animeData);
    return savedAnime;
  } catch (error: any) {
    logger.error(
      `Failed to fetch and save anime for MAL ID ${malId}:`,
      error?.message || error
    );
    return null;
  }
};

/**
 * Gets anime from database or fetches from AniList if not found
 */
export const getOrFetchAnimeByMalId = async (malId: string | number) => {
  try {
    const parsedMalId = typeof malId === "string" ? parseInt(malId) : malId;

    // Validate MAL ID
    if (isNaN(parsedMalId) || parsedMalId <= 0) {
      logger.warn(`Invalid MAL ID: ${malId}`);
      return null;
    }

    // First try to find in database
    let anime = await Anime.findOne({ idMal: parsedMalId });

    if (anime) {
      logger.debug(`Found anime in database for MAL ID: ${malId}`);
      return anime;
    }

    // If not found, fetch from AniList and save
    logger.info(
      `Anime not found in database for MAL ID: ${malId}, fetching from AniList...`
    );
    anime = await fetchAndSaveAnimeByMalId(parsedMalId);

    return anime;
  } catch (error: any) {
    logger.error(
      `Failed to get or fetch anime for MAL ID ${malId}:`,
      error?.message || error
    );

    console.log(error)
    return null;
  }
};

/**
 * Fetches all anime IDs from AniList using pagination
 * @returns Array of all anime IDs from AniList
 */
export const getAnilistIds = async (): Promise<number[]> => {
  const allIds: number[] = [];
  let hasNextPage = true;
  let page = 1;

  try {
    logger.info("Fetching all anime IDs from AniList...");

    while (hasNextPage) {
      const query = `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              hasNextPage
              currentPage
              total
            }
            media(type: ANIME) {
              id
            }
          }
        }
      `;

      const response = await safeRequest(ANILIST_APIURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {
          query,
          variables: {
            page,
            perPage: 50,
          },
        },
      });

      if (!response?.data?.data?.Page) {
        logger.warn(`No data received for page ${page}`);
        break;
      }

      const pageData = response.data.data.Page;
      const ids = pageData.media.map((anime: any) => anime.id);
      allIds.push(...ids);

      hasNextPage = pageData.pageInfo.hasNextPage;
      page++;

      logger.info(
        `Fetched page ${pageData.pageInfo.currentPage} - Total IDs: ${allIds.length}`
      );

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info(`Successfully fetched ${allIds.length} anime IDs from AniList`);
    return allIds;
  } catch (error: any) {
    logger.error(
      `Failed to fetch anime IDs from AniList:`,
      error?.message || error
    );
    return allIds; // Return what we have so far
  }
};

/**
 * Fetches metadata for multiple anime IDs in a single batch request
 * @param ids Array of AniList IDs to fetch
 * @param perPage Number of results per request (max 50)
 * @returns Array of anime metadata
 */
export const getBatchAnilistMetaFromIds = async (
  ids: number[],
  perPage: number = 50
): Promise<any[]> => {
  try {
    if (!ids.length) {
      logger.warn("No IDs provided for batch fetch");
      return [];
    }

    // AniList supports max 50 per request
    const batchSize = Math.min(perPage, 50);
    const results: any[] = [];

    // Process in batches if more than batchSize
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);

      const query = `
        query ($ids: [Int]) {
          Page(perPage: ${batchSize}) {
            media(id_in: $ids, type: ANIME) {
              ${QUERY_GET_ANIME_META}
            }
          }
        }
      `;

      const response = await safeRequest(ANILIST_APIURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {
          query,
          variables: {
            ids: batchIds,
          },
        },
      });

      if (!response?.data?.data?.Page?.media) {
        logger.warn(`No data received for batch starting at index ${i}`);
        continue;
      }

      const media = response.data.data.Page.media;

      // Transform the data
      const transformedMedia = media.map((anime: any) => {
        if (anime) {
          anime.idAnilist = anime.id;
          delete anime.id;
        }
        return anime;
      });

      results.push(...transformedMedia);

      // Rate limiting between batches
      if (i + batchSize < ids.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info(
      `Successfully fetched metadata for ${results.length}/${ids.length} anime`
    );
    return results;
  } catch (error: any) {
    logger.error(
      `Failed to fetch batch anime metadata:`,
      error?.message || error
    );
    return [];
  }
};
