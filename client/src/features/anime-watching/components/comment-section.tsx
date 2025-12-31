import { WatchInfo } from "@/types/watch";
import React, { useEffect, useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type CommentSectionProps = {
  watchInfo: WatchInfo;
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  watchInfo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (isExpanded && !scriptLoaded) {
      try {
        (window as any).theAnimeCommunityConfig = {
          AniList_ID: watchInfo.anime.idAnilist,
          episodeChapterNumber: watchInfo.currentEpisode.toString(),
          mediaType: "anime",
          removeBorderStyling: true,
          colorScheme: {
            primaryColor: "#95b6d0", // Light blue accent
            backgroundColor: "transparent", // No background
            dropDownTextColor: "#FFFFFF", // White text
            strongTextColor: "#95b6d0", // Light blue for emphasis
            primaryTextColor: "#FFFFFF", // White text
            secondaryTextColor: "#6c6c6c", // Gray for secondary text
          },
        };

        const script = document.createElement("script");
        script.src = `https://theanimecommunity.com/embed.js`;
        script.id = "anime-community-script";
        script.defer = true;

        document
          .getElementById("anime-community-comment-section")
          ?.appendChild(script);

        setScriptLoaded(true);
      } catch (e) {
        console.log(e);
      }
    }
  }, [isExpanded, scriptLoaded, watchInfo.anime.idAnilist, watchInfo.currentEpisode]);

  return (
    <div className="mt-8">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        className="w-full flex items-center justify-between px-4 py-6 bg-secondary hover:text-white hover:bg-secondary-1 text-white"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="text-base font-medium">
            Discussion & Comments
          </span>
          <span className="text-xs text-gray opacity-70">
            (Requires separate login)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-4">
          <div id="anime-community-comment-section"></div>
        </div>
      )}
    </div>
  );
};
