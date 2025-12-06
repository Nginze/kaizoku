import { Schema, model } from "mongoose";

const AnimeSchema = new Schema({
	idAnilist: { type: Number, unique: true },
	idMal: { type: Number, unique: true },
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
	// Embed seeding progress tracking
	embedsSeeded: { type: Boolean, default: false },
	embedsProgress: {
		lastProcessedEpisode: { type: Number, default: 0 },
		failedEpisodes: { type: [Number], default: [] },
		completedEpisodes: { type: [Number], default: [] },
		status: { 
			type: String, 
			enum: ['pending', 'in_progress', 'completed', 'failed'],
			default: 'pending'
		},
		startedAt: { type: Date },
		completedAt: { type: Date },
		lastUpdated: { type: Date, default: Date.now }
	}
});

export default model("Anime", AnimeSchema);
