import { create } from "zustand";
import { persist, combine } from "zustand/middleware";

// State type
interface WatchedEpisodesState {
  watchedEpisodes: Record<string, number[]>;
}

// Actions type
interface WatchedEpisodesActions {
  addWatchedEpisode: (animeId: string, episodeNumber: number) => void;
  removeWatchedEpisode: (animeId: string, episodeNumber: number) => void;
  getWatchedEpisodes: (animeId: string) => number[];
  isEpisodeWatched: (animeId: string, episodeNumber: number) => boolean;
  clearWatchedEpisodes: (animeId: string) => void;
  clearAllWatchedEpisodes: () => void;
}

// Initial state
const initialState: WatchedEpisodesState = {
  watchedEpisodes: {},
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
    })),
    {
      name: "watched-episodes-storage", // localStorage key
      version: 1,
    }
  )
);
