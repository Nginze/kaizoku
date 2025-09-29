export default function formatRating(rating: number | null) {
    if (rating === null || isNaN(rating)) {
        return "N/A";
    }
    return (rating / 10).toFixed(1);
}