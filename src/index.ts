import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { load, CheerioAPI } from "cheerio";
import stringSimilarity from "string-similarity";
import path from "path";
import { connectDB } from "./config/db";
import "dotenv/config";
import Anime from "./models/anime";

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
        site
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

  console.log("filePath", filePath);

  if (existsSync(filePath)) {
    console.log("READING IDS FROM FILE");
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

  const media = response?.data?.data?.Media;
  if (media) {
    media.idAnilist = media.id;
    delete media.id;
  }

  return media;
};

const genMappings = async (animeMeta: any) => {
  console.log("GENERATING MAPPINGS FOR", animeMeta.title.romaji);
  const providers = [
    { name: "AniWatch", endpoint: "https://hianime.to/search/" },
    {
      name: "Gogoanime",
      endpoint: "https://ww19.gogoanimes.fi/search.html",
    },
  ];

  const mappings = [];

  for (const provider of providers) {
    const url = `${provider.endpoint}?keyword=${encodeURIComponent(
      animeMeta.title.romaji
    )}`;

    const response = await safeRequest(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let html;
    let searchResults: any[] = [];
    let $: CheerioAPI;

    switch (provider.name) {
      case "AniWatch":
        html = response?.data;
        $ = load(html);
        searchResults = [];

        $("div.film_list-wrap > div.flw-item").each((i, el) => {
          const title = $(el)
            .find("div.film-detail h3.film-name a.dynamic-name")
            .attr("title")!
            .trim()
            .replace(/\\n/g, "");
          const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;
          const img = $(el).find("img").attr("data-src")!;

          const altTitles: string[] = [];
          const jpName = $(el)
            .find("div.film-detail h3.film-name a.dynamic-name")
            .attr("data-jname")!
            .trim()
            .replace(/\\n/g, "");
          altTitles.push(jpName);

          const format: string = $(el)
            .find("div.film-detail div.fd-infor span.fdi-item")
            ?.first()
            ?.text()
            .toUpperCase();

          searchResults.push({
            title,
            id,
            img,
            altTitles,
            format,
          });
        });

        const bestMatch = findBestMatch(animeMeta, searchResults);
        if (bestMatch) {
          mappings.push({
            provider: provider.name,
            id: bestMatch.id,
            title: bestMatch.title,
          });
        }
        console.log("H!ANIME RESULTS");
      case "Gogoanime":
        html = response?.data;
        $ = load(html);
        searchResults = [];

      // const bestMatch = findBestMatch(animeMeta, searchResults);
      // if (bestMatch) {
      //   mappings.push({
      //     provider: provider.name,
      //     id: bestMatch.id,
      //     title: bestMatch.title,
      //   });
      // }
      default:
        break;
    }

    return mappings;
  }
};

const findBestMatch = (animeMeta: any, searchResults: any): any => {
  let bestMatch = null;
  let highestSimilarity = 0;

  for (const result of searchResults) {
    const similarity = stringSimilarity.compareTwoStrings(
      animeMeta.title.romaji,
      result.title
    );
    if (similarity > highestSimilarity && animeMeta.format === result.format) {
      highestSimilarity = similarity;
      bestMatch = result;
    }
  }

  return bestMatch;
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
        console.log("Rate limit reached. Waiting for", delay, "ms");
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
  connectDB();
  console.log("CONNECTED TO MONGO DB");
  for (const id of ids) {
    const animeMeta = await getAnilistMetaFromId(id);
    console.log(animeMeta);
    await Anime.create(animeMeta);
    console.log("INSERTED RECORD DONE", id);
    const mappings = await genMappings(animeMeta);
    console.log(mappings);
  }
})();
