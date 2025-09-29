export default function formatPopularity
(popularity: number | null) {
    if (popularity === null || isNaN(popularity)) {
        return "N/A";
    }
    return popularity.toLocaleString();
}