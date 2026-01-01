/**
 * Format video time from seconds to timestamp format
 * @param seconds - Time in seconds
 * @returns Formatted string like "0:00", "1:24", "1:02:45"
 */
export default function formatVideoTime(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  // Format seconds with leading zero
  const formattedSeconds = secs.toString().padStart(2, "0");

  // If less than 1 hour, show M:SS format
  if (hours === 0) {
    return `${minutes}:${formattedSeconds}`;
  }

  // If 1 hour or more, show H:MM:SS format
  const formattedMinutes = minutes.toString().padStart(2, "0");
  return `${hours}:${formattedMinutes}:${formattedSeconds}`;
}
