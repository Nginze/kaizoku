import { HianimeService } from "./services/hianime.services";
import { AnilistService } from "./services/anilist.services";
import { MappingService } from "./services/mapping.service";
import { connectDB, disconnectDB } from "./config/mongo";
import { loadConfig, updateConfig } from "./utils/load-config";
import "dotenv/config";
import { appendToFile, saveToFile } from "./config/file";
import Anime from "./models/anime";
import { logger } from "./config/logger";
import { initializeJobs } from "./jobs";

async function seed() {
	const anilistService = new AnilistService();
	const hianimeService = new HianimeService();
	const mappingService = new MappingService();

	try {
		await connectDB();
		const config = loadConfig();
		logger.info(`📋 Config loaded: ${JSON.stringify(config)}`);

		const anilistIds = await anilistService.getAnilistIds();

		const startingIdx = config.lastIdx ?? 0;
		const seedLimit = config.limit ?? anilistIds.length;

		console.log(startingIdx, seedLimit);

		for (let index = startingIdx; index < seedLimit; index++) {
			try {
				const anilistId = anilistIds[index];

				logger.info(`Processing index = ${index}, anlist-id = ${anilistId}`);

				const animeMetaData =
					await anilistService.getAnilistMetaFromId(anilistId);

				appendToFile("anilist-metadata.json", animeMetaData);
				await Anime.insertOne(animeMetaData);

				const mappings = await mappingService.genMappings(animeMetaData); // this should map to all relevant providers(aniwatch, animepahe, gogo, livechart)

				//We need to get servers -> embeds -> srcs + captions(vtt)
				//We'll only store embeds and srcs will be decrypted on client (coz decryption strategies are ephemeral)
				await hianimeService.getStreamingEpisodeEmbeds(anilistId);

				updateConfig({ lastIdx: index + 1 });
			} catch (error) {
				updateConfig({ lastIdx: index + 1 });
				throw error;
			}
		}
	} catch (error) {
		console.log(error);
	}
}

async function generateSeedFile() {
	const anilistService = new AnilistService();

	try {
		await connectDB();
		const config = loadConfig();
		logger.info(`📋 Config loaded: ${JSON.stringify(config)}`);

		const anilistIds = await anilistService.getAnilistIds();

		const startingIdx = config.lastIdx ?? 0;
		const seedLimit = config.limit ?? anilistIds.length;

		console.log(startingIdx, seedLimit);

		for (let index = startingIdx; index < seedLimit; index++) {
			try {
				const anilistId = anilistIds[index];

				logger.info(
					`Processing index = ${index + 1} of ${anilistIds.length}, anlist-id = ${anilistId}`,
				);

				const animeMetaData =
					await anilistService.getAnilistMetaFromId(anilistId);

				appendToFile("anilist-metadata-seed.json", animeMetaData);

				updateConfig({ lastIdx: index + 1 });
			} catch (error) {
				throw error;
			}
		}
	} catch (error) {
		console.log(error);
	} finally {
		disconnectDB();
	}
}

const generateSeedFileV2 = async () => {
	const anilistService = new AnilistService();

	const config = loadConfig();
	logger.info(`📋 Config loaded: ${JSON.stringify(config)}`);

	const anilistIds = await anilistService.getAnilistIds();

	try {
		const mediaList =
			await anilistService.getBatchAnilistMetaFromIds(anilistIds);
		saveToFile("anime-metadata-seed.json", mediaList);
	} catch (error) {
		console.log(error);
	}
};

async function main() {
	try {
		await connectDB();
		logger.info("📊 Database connected successfully");
		await initializeJobs();
		logger.info("🚀 Jobs initialized - application running");
	} catch (error) {
		logger.error("❌ Failed to start application:", error);
		process.exit(1);
	}
}
//

main();
