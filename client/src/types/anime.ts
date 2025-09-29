// Anime Search Filters
export interface AnimeSearchFilters {
    q?: string;
    tags?: string;
    year?: number;
    status?:
        | "FINISHED"
        | "RELEASING"
        | "NOT_YET_RELEASED"
        | "CANCELLED"
        | "HIATUS";
    format?: "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC";
    score?: number;
    season?: "WINTER" | "SPRING" | "SUMMER" | "FALL";
    "source-material"?:
        | "ORIGINAL"
        | "MANGA"
        | "LIGHT_NOVEL"
        | "VISUAL_NOVEL"
        | "VIDEO_GAME"
        | "OTHER"
        | "NOVEL"
        | "DOUJINSHI"
        | "ANIME";
    dub?: "true" | "false";
}

// Anime Result/Model
export interface AnimeResult {
    idAnilist: string;
    title: {
        romaji?: string;
        english?: string;
        native?: string;
        userPreferred?: string;
    };
    coverImage?: {
        extraLarge?: string;
        large?: string;
    };
    bannerImage?: string;
    startDate?: {
        year?: number;
        month?: number;
        day?: number;
    };
    description?: string;
    season?: string;
    seasonYear?: number;
    format?: string;
    status?: string;
    episodes?: number;
    genres?: string[];
    averageScore?: number;
    popularity?: number;
    favourites?: number;
    isAdult?: boolean;
}