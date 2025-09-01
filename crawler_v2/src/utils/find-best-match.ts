import { compareTwoStrings } from "string-similarity";

export const findBestMatch = (animeMeta: any, searchResults: any): any => {
	let bestMatch = null;
	let highestSimilarity = 0;

	for (const result of searchResults) {
		const similarity = compareTwoStrings(animeMeta.title.romaji, result.title);
		if (similarity > highestSimilarity && animeMeta.format === result.format) {
			highestSimilarity = similarity;
			bestMatch = result;
		}
	}

	return bestMatch;
};
