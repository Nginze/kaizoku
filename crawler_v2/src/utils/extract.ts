export const extractIdsFromSitemap = (sitemapXml: string): string[] => {
	const regex = /<loc>https:\/\/anilist\.co\/anime\/(\d+)\/[^<]+<\/loc>/g;
	const ids: string[] = [];
	let match;
	while ((match = regex.exec(sitemapXml)) !== null) {
		ids.push(match[1]);
	}
	return ids;
};
