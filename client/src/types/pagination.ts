
export interface PaginationParams {
	page?: number;
	limit?: number;
	sort_by?:
		| "SCORE_DESC"
		| "SCORE_ASC"
		| "POPULARITY_DESC"
		| "POPULARITY_ASC"
		| "TRENDING_DESC"
		| "TRENDING_ASC"
		| "UPDATED_AT_DESC"
		| "UPDATED_AT_ASC"
		| "START_DATE_DESC"
		| "START_DATE_ASC"
		| "END_DATE_DESC"
		| "END_DATE_ASC"
		| "FAVOURITES_DESC"
		| "FAVOURITES_ASC"
		| "TITLE_ROMAJI"
		| "TITLE_ENGLISH";
}


export interface PaginatedResponse<T> {
	currentPage: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	totalPages: number;
	totalResults: number;
	results: T[];
}