import { create } from "zustand";
import { persist, combine } from "zustand/middleware";

// Metadata for recently watched episode
export interface RecentlyWatchedEpisode {
  _id: string; // MongoDB ID
  idAnilist: number;
  title: {
    romaji?: string;
    english?: string | null;
    native?: string;
    userPreferred?: string;
  };
  coverImage: {
    extraLarge?: string;
    large?: string;
  };
  bannerImage?: string | null;
  episodeNumber: number; // Current episode being watched
  totalEpisodes: number | null;
  watchedDuration: number; // Duration watched in seconds for current episode
  totalDuration: number; // Total episode duration in seconds
  latestWatchedEpisode: number; // Most recent episode number watched for this anime
  timestamp: string; // ISO timestamp of last watch
}

// State type
interface WatchedEpisodesState {
  watchedEpisodes: Record<string, number[]>;
  recentlyWatched: RecentlyWatchedEpisode[];
}

// Actions type
interface WatchedEpisodesActions {
  addWatchedEpisode: (animeId: string, episodeNumber: number) => void;
  removeWatchedEpisode: (animeId: string, episodeNumber: number) => void;
  getWatchedEpisodes: (animeId: string) => number[];
  isEpisodeWatched: (animeId: string, episodeNumber: number) => boolean;
  clearWatchedEpisodes: (animeId: string) => void;
  clearAllWatchedEpisodes: () => void;
  updateRecentlyWatched: (episode: RecentlyWatchedEpisode) => void;
  getRecentlyWatched: () => RecentlyWatchedEpisode[];
  clearRecentlyWatched: () => void;
}

// Initial state
const initialState: WatchedEpisodesState = {
  watchedEpisodes: {},
  recentlyWatched: [],
};

// Create store with combine and persist middleware
export const useWatchedEpisodesStore = create(
  persist(
    combine(initialState, (set, get) => ({
      // Add episode to watched list
      addWatchedEpisode: (animeId: string, episodeNumber: number) =>
        set((state) => {
          const current = state.watchedEpisodes[animeId] || [];
          if (current.includes(episodeNumber)) {
            return state; // Already watched, no change
          }
          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [animeId]: [...current, episodeNumber].sort((a, b) => a - b),
            },
          };
        }),

      // Remove episode from watched list
      removeWatchedEpisode: (animeId: string, episodeNumber: number) =>
        set((state) => {
          const current = state.watchedEpisodes[animeId] || [];
          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [animeId]: current.filter((ep) => ep !== episodeNumber),
            },
          };
        }),

      // Get all watched episodes for an anime
      getWatchedEpisodes: (animeId: string) => {
        return get().watchedEpisodes[animeId] || [];
      },

      // Check if specific episode is watched
      isEpisodeWatched: (animeId: string, episodeNumber: number) => {
        const episodes = get().watchedEpisodes[animeId] || [];
        return episodes.includes(episodeNumber);
      },

      // Clear all watched episodes for specific anime
      clearWatchedEpisodes: (animeId: string) =>
        set((state) => {
          const { [animeId]: _, ...rest } = state.watchedEpisodes;
          return { watchedEpisodes: rest };
        }),

      // Clear all watched episodes for all anime
      clearAllWatchedEpisodes: () => set({ watchedEpisodes: {} }),

      // Update recently watched episode with metadata
      updateRecentlyWatched: (episode: RecentlyWatchedEpisode) =>
        set((state) => {
          // Remove existing entry for same anime and episode
          const filtered = state.recentlyWatched.filter(
            (item) =>
              !(
                item._id === episode._id &&
                item.episodeNumber === episode.episodeNumber
              )
          );

          // Add new entry at the beginning and limit to 50 most recent
          return {
            recentlyWatched: [episode, ...filtered].slice(0, 50),
          };
        }),

      // Get all recently watched episodes
      getRecentlyWatched: () => {
        return get().recentlyWatched;
      },

      // Clear recently watched list
      clearRecentlyWatched: () => set({ recentlyWatched: [] }),
    })),
    {
      name: "watched-episodes-storage", // localStorage key
      version: 2, // Increment version for migration
    }
  )
);
