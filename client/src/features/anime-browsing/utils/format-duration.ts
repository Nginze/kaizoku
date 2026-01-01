/**
 * Format duration from minutes to readable format
 * @param minutes - Duration in minutes
 * @returns Formatted string like "24m", "1h 4m", "2h"
 */
export default function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
