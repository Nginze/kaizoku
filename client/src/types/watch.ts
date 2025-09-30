interface AnimeTitle {
  romaji: string;
  english: string | null;
  native: string;
  userPreferred: string;
}

interface AnimeCoverImage {
  extraLarge: string;
  large: string;
}

interface AnimeDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

interface AnimeTrailer {
  id: string;
  site: string;
}

interface AnimeTag {
  _id: string;
  id: number;
  name: string;
}

interface RelatedAnime {
  node: {
    title: {
      userPreferred: string;
    };
    id: number;
    format: string;
    type: string;
    status: string;
    bannerImage: string | null;
    coverImage: {
      large: string;
    };
  };
  _id: string;
  id: number;
  relationType: string;
}

interface AnimeEmbed {
  sub: {
    serverName: string;
    epNo: string;
    embedLink: string;
    serverId: string;
    type: "SUB" | "DUB";
    serverIdx: number
  }[];
  dub: {
    serverName: string;
    epNo: string;
    embedLink: string;
    serverId: string;
    type: "SUB" | "DUB";
    serverIdx: number
  }[];
}

interface AnimeInfo {
  _id: string;
  idAnilist: number;
  idMal: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
  bannerImage: string | null;
  startDate: AnimeDate;
  endDate: AnimeDate;
  description: string;
  season: string;
  seasonYear: number;
  type: string;
  format: string;
  status: string;
  episodes: number | null;
  duration: number;
  genres: string[];
  synonyms: string[];
  source: string;
  isAdult: boolean;
  meanScore: number;
  averageScore: number;
  popularity: number;
  favourites: number;
  countryOfOrigin: string;
  isLicensed: boolean;
  trailer: AnimeTrailer;
  tags: AnimeTag[];
  streamingEpisodes: any[];
}

export interface WatchInfo {
  anime: AnimeInfo;
  currentEpisode: number;
  availableEpisodes: number[];
  totalAvailableEpisodes: number;
  embeds: AnimeEmbed;
  hasSubtitles: boolean;
  hasDubbing: boolean;
  related: RelatedAnime[];
  timestamp: string;
}
