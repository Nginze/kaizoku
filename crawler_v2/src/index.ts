import { HianimeService } from "./services/hianime.services";
import { AnilistService } from "./services/anilist.services";
import { MappingService } from "./services/mapping.service";
import { connectDB } from "./config/mongo";
import { loadConfig } from "./utils/load-config";
import "dotenv/config";

(async function main() {
	const anilistService = new AnilistService();
	const hianimeService = new HianimeService();
	const mappingService = new MappingService();

	try {
		connectDB();
		const config = loadConfig();
		console.log("📋 Config loaded:", config);

		const anilistIds = await anilistService.getAnilistIds();
		console.log(`🎯 Found ${anilistIds.length} anime IDs`);

		// Process first 5 IDs for testing
		const testIds = anilistIds.slice(0, 1);

		for (const id of testIds) {
			console.log(`\n🔄 Processing anime ID: ${id}`);

			// Step 1: Fetch metadata from AniList
			console.log("📊 Fetching metadata from AniList...");
			const animeMeta = await anilistService.getAnilistMetaFromId(id);
			if (!animeMeta) {
				console.log("❌ No metadata found, skipping...");
				continue;
			}
			console.log("✅ Metadata fetched:", {
				title: animeMeta.title?.romaji || "Unknown",
				episodes: animeMeta.episodes,
				status: animeMeta.status,
			});

			// Step 2: Generate mappings
			console.log("🗺 Generating mappings...");
			const mappings = await mappingService.genMappings(animeMeta);
			console.log("✅ Mappings generated:", mappings);

			// Step 3: Get episode sources if mappings exist
			if (mappings) {
				const hiAnimeMapping = mappings.aniwatch;

				if (hiAnimeMapping) {
					console.log("🎬 Fetching episode sources...");
					try {
						await hianimeService.getStreamingEpisodeEmbeds(id);
						await hianimeService.extractSourcesFromEmbeds(id);
						console.log("✅ Episode sources processed");
					} catch (error) {
						console.log(error);
						// console.log(
						// 	"❌ Error fetching episode sources:",
						// 	(error as Error).message,
						// );
					}
				} else {
					console.log("! No HiAnime mapping found, skipping episode sources");
				}
			} else {
				console.log("! No mappings found, skipping episode sources");
			}

			console.log("🎉 Completed processing anime ID:", id);
		}
	} catch (error) {
		console.log("Something went wrong", (error as unknown as Error).message);
		console.log("Stack trace", (error as unknown as Error).stack);
	}
})().then(() => {});
