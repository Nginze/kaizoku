import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function delayedQuery<T>(
  queryFn: () => Promise<T>,
  minDelay = 400
): Promise<T> {
  const [result] = await Promise.all([
    queryFn(),
    new Promise(resolve => setTimeout(resolve, minDelay))
  ]);
  return result;
}
