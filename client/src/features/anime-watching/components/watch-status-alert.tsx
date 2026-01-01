import { Play, X, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useWatchedEpisodesStore } from "../stores/watched-episodes-store";
import { Link } from "react-router";
import formatVideoTime from "../utils/format-video-time";

export default function WatchStatusAlert() {
  const [isExpanded, setIsExpanded] = useState(false);

  const { recentlyWatched } = useWatchedEpisodesStore();

  useEffect(() => {
    const handleScroll = () => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isExpanded]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  const mostRecentEpisode = recentlyWatched[0];

  if (!mostRecentEpisode) {
    return null;
  }

  return (
    <div
      className={`z-50 h-[85px] f fixed bottom-4 left-4 bg-secondary-2 flex rounded-sm overflow-hidden border border-secondary transition-all duration-300 ease-in-out ${
        isExpanded ? "w-[350px]" : "w-[44px]"
      }`}
    >
      {isExpanded ? (
        <>
          <div className="flex flex-col px-3 py-2 items-start w-full h-full gap-1.5">
            <div className="text-xs opacity-85 w-full line">Continue Watching</div>
            <Link
              to={`/watch/${mostRecentEpisode._id}?ep=${mostRecentEpisode.latestWatchedEpisode}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Play size={13} className="fill-primary-1 text-primary-1" />
              <div className="text-primary-1 text-sm w-4/5 line-clamp-1">
                {mostRecentEpisode?.title.english ||
                  mostRecentEpisode?.title.native ||
                  mostRecentEpisode?.title.romaji ||
                  mostRecentEpisode?.title.userPreferred ||
                  "Unknown Title"}
              </div>
            </Link>
            <div className="text-xs opacity-50">
              Episode {mostRecentEpisode.latestWatchedEpisode} of{" "}
              {mostRecentEpisode.totalEpisodes} •{" "}
              {formatVideoTime(mostRecentEpisode.watchedDuration)}/{formatVideoTime(mostRecentEpisode.totalDuration)}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="px-2 bg-gray-dark flex items-center justify-center min-h-full"
          >
            <X className="fill-primary-1 text-primary-1 stroke-[2.5]" />
          </button>
        </>
      ) : (
        <button
          onClick={handleToggle}
          className="w-full h-full px-2 py-2 bg-secondary-2 flex items-center justify-center hover:bg-secondary transition-colors min-h-full"
        >
          <ChevronRight size={20} className="text-primary-1" />
        </button>
      )}
    </div>
  );
}
