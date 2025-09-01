import { Schema, model } from "mongoose";

const AnimeSchema = new Schema({
  idAnilist: { type: Number },
  idMal: { type: Number },
  title: {
    romaji: { type: String },
    english: { type: String },
    native: { type: String },
    userPreferred: { type: String },
  },
  coverImage: {
    extraLarge: { type: String },
    large: { type: String },
  },
  bannerImage: { type: String },
  startDate: {
    year: { type: Number },
    month: { type: Number },
    day: { type: Number },
  },
  endDate: {
    year: { type: Number },
    month: { type: Number },
    day: { type: Number },
  },
  description: { type: String },
  season: { type: String },
  seasonYear: { type: Number },
  type: { type: String },
  format: { type: String },
  status: { type: String },
  episodes: { type: Number },
  duration: { type: Number },
  chapters: { type: Number, default: null },
  volumes: { type: Number, default: null },
  genres: { type: [String] },
  synonyms: { type: [String] },
  source: { type: String },
  isAdult: { type: Boolean },
  meanScore: { type: Number },
  averageScore: { type: Number },
  popularity: { type: Number },
  favourites: { type: Number },
  countryOfOrigin: { type: String },
  isLicensed: { type: Boolean },
  relations: {
    edges: [
      {
        node: {
          id: { type: Number },
          title: {
            romaji: { type: String },
            english: { type: String },
            native: { type: String },
          },
        },
      },
    ],
  },
  streamingEpisodes: [
    {
      title: { type: String },
      thumbnail: { type: String },
      url: { type: String },
      site: { type: String },
    },
  ],
  trailer: {
    id: { type: String },
    site: { type: String },
  },
  tags: [
    {
      id: { type: Number },
      name: { type: String },
    },
  ],
});

export default model("Anime", AnimeSchema);
