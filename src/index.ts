import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";

const ANILIST_URL = "https://graphql.anilist.co";
const QUERY = `
    id
    idMal
    title {
        romaji
        english
        native
        userPreferred
    }
    coverImage {
        extraLarge
        large
    }
    bannerImage
    startDate {
        year
        month
        day
    }
    endDate {
        year
        month
        day
    }
    description
    season
    seasonYear
    type
    format
    status(version: 2)
    episodes
    duration
    chapters
    volumes
    genres
    synonyms
    source(version: 3)
    isAdult
    meanScore
    averageScore
    popularity
    favourites
    countryOfOrigin
    isLicensed
    relations {
        edges {
            id
            relationType(version: 2)
            node {
                id
                title {
                    userPreferred
                }
                format
                type
                status(version: 2)
                bannerImage
                coverImage {
                    large
                }
            }
        }
    }
    streamingEpisodes {
        title
        thumbnail
        url
    }
    trailer {
        id
        site
    }
    tags {
        id
        name
    }
`;

const getAnilistIds = async (): Promise<string[]> => {
  const filePath = path.join(__dirname, "anilist-ids.json");

  if (existsSync(filePath)) {
    const data = readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }

  const siteMap1 = axios.get("https://anilist.co/sitemap/anime-0.xml");
  const siteMap2 = axios.get("https://anilist.co/sitemap/anime-1.xml");
  const [res1, res2] = await Promise.all([siteMap1, siteMap2]);

  const ids1 = extractIdsFromSitemap(res1.data);
  const ids2 = extractIdsFromSitemap(res2.data);

  // save ids to file
  save(ids1.concat(ids2), "anilist-ids.json");

  return ids1.concat(ids2);
};

const extractIdsFromSitemap = (sitemapXml: string): string[] => {
  const regex = /<loc>https:\/\/anilist\.co\/anime\/(\d+)\/[^<]+<\/loc>/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(sitemapXml)) !== null) {
    ids.push(match[1]);
  }
  return ids;
};

const getAnilistMetaFromId = async (id: string) => {
  const args = {
    query: `
        query ($id: Int) {
            Media (id: $id) {
                ${QUERY}
            }
        }
    `,
    variables: {
      id,
    },
  };

  const response = await safeRequest(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: args,
  });

  console.log(response?.data?.data.Media);
};

const safeRequest = async (
  url: string,
  options?: AxiosRequestConfig,
  retries = 0
): Promise<AxiosResponse | null> => {
  try {
    const response = await axios(url, options);
    return response;
  } catch (err) {
    const response = (err as AxiosError).response!;
    const remainingRequests =
      parseInt(response.headers?.["x-ratelimit-remaining"]) || 0;
    const resetTime = parseInt(response.headers?.["x-ratelimit-reset"]) || 0;
    const retryAfter = parseInt(response.headers?.["retry-after"]) || 0;

    if (remainingRequests < 60 || response.status === 429) {
      const delay = retryAfter
        ? retryAfter * 3000
        : resetTime * 1000 - Date.now();
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      if (retries < 15) {
        return safeRequest(url, options, retries + 1);
      } else {
        throw new Error("Rate limit reached.");
      }
    }
    throw new Error((err as AxiosError).message);
  }
};

const save = (data: any, filename: string) => {
  writeFileSync(filename, JSON.stringify(data, null, 2));
};

(async function main() {
  console.log("FETCHING IDS ....");
  const ids = await getAnilistIds();
  console.log("DONE FETCHING IDS");
  for (const id of ids) {
    await getAnilistMetaFromId(id);
  }
})();
