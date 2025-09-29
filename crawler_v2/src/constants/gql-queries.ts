export const QUERY_GET_ANIME_META = `
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

export const QUERY_GET_BATCH_ANIME_META = `
  query ($ids: [Int], $malIds: [Int], $perPage: Int = 50) {
    Page(perPage: $perPage) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      media(id_in: $ids, idMal_in: $malIds) {
        ${QUERY_GET_ANIME_META}
      }
    }
  }
`;

export const QUERY_GET_FEATURED_LIST = `
  query ($page: Int = 1, $id: Int, $type: MediaType, $isAdult: Boolean = false, $search: String, $format: [MediaFormat], $status: MediaStatus, $countryOfOrigin: CountryCode, $source: MediaSource, $season: MediaSeason, $seasonYear: Int, $year: String, $onList: Boolean, $yearLesser: FuzzyDateInt, $yearGreater: FuzzyDateInt, $episodeLesser: Int, $episodeGreater: Int, $durationLesser: Int, $durationGreater: Int, $chapterLesser: Int, $chapterGreater: Int, $volumeLesser: Int, $volumeGreater: Int, $licensedBy: [Int], $isLicensed: Boolean, $genres: [String], $excludedGenres: [String], $tags: [String], $excludedTags: [String], $minimumTagRank: Int, $sort: [MediaSort] = [POPULARITY_DESC, SCORE_DESC]) {
    Page(page: $page, perPage: 20) {
      pageInfo {
        total
        perPage
        currentPage
        lastPage
        hasNextPage
      }
      media(
        id: $id,
        type: $type,
        season: $season,
        format_in: $format,
        status: $status,
        countryOfOrigin: $countryOfOrigin,
        source: $source,
        search: $search,
        onList: $onList,
        seasonYear: $seasonYear,
        startDate_like: $year,
        startDate_lesser: $yearLesser,
        startDate_greater: $yearGreater,
        episodes_lesser: $episodeLesser,
        episodes_greater: $episodeGreater,
        duration_lesser: $durationLesser,
        duration_greater: $durationGreater,
        chapters_lesser: $chapterLesser,
        chapters_greater: $chapterGreater,
        volumes_lesser: $volumeLesser,
        volumes_greater: $volumeGreater,
        licensedById_in: $licensedBy,
        isLicensed: $isLicensed,
        genre_in: $genres,
        genre_not_in: $excludedGenres,
        tag_in: $tags,
        tag_not_in: $excludedTags,
        minimumTagRank: $minimumTagRank,
        sort: $sort,
        isAdult: $isAdult
      ) {
        id
        title {
          userPreferred
        }
        coverImage {
          extraLarge
          large
        }
        description
        genres
        averageScore
        popularity
      }
    }
  }
`;
