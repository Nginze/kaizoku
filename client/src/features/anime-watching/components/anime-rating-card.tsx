import React, { useState, useRef } from "react";
import { MaterialSymbolsStar } from "@/lib/icons/mt-star";
import { MaterialSymbolsStarHalf } from "@/lib/icons/mt-star-half";
import { MaterialSymbolsStarOutline } from "@/lib/icons/mt-star-outline";

type AnimeRatingCardProps = {
  score?: number; // Out of 10
  onRatingChange?: (rating: number) => void; // Callback when user rates
};

export const AnimeRatingCard: React.FC<AnimeRatingCardProps> = ({
  score = 7.8,
  onRatingChange,
}) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const starRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use user rating if set, otherwise fall back to score
  const displayScore = userRating !== null ? userRating : score;

  // Convert score out of 10 to stars out of 5
  const starsOutOfFive = displayScore / 2;
  const fullStars = Math.floor(starsOutOfFive);
  const hasHalfStar = starsOutOfFive % 1 >= 0.5;

  const handleMouseMove = (
    index: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const starElement = starRefs.current[index];
    if (!starElement) return;

    const rect = starElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;

    // If cursor is past midway, full star. Otherwise, half star
    const rating = percentage >= 0.5 ? index + 1 : index + 0.5;
    setHoveredRating(rating);
  };

  const handleMouseLeave = () => {
    setHoveredRating(null);
  };

  const handleClick = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    const starElement = starRefs.current[index];
    if (!starElement) return;

    const rect = starElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;

    // If cursor is past midway, full star. Otherwise, half star
    const rating = percentage >= 0.5 ? index + 1 : index + 0.5;

    // Convert rating out of 5 to rating out of 10
    const ratingOutOfTen = rating * 2;

    setUserRating(ratingOutOfTen);

    // Call the callback if provided
    if (onRatingChange) {
      onRatingChange(ratingOutOfTen);
    }
  };

  const renderStar = (index: number) => {
    const starNumber = index + 1;

    // Determine fill based on hover or actual score
    let isFull = false;
    let isHalf = false;
    let isOutline = false;
    let fillColor = "#888888"; // Default gray

    if (hoveredRating !== null) {
      // Hover state - only fill stars up to and including hovered star
      if (starNumber <= Math.floor(hoveredRating)) {
        isFull = true;
        fillColor = "#ffc107";
      } else if (
        starNumber === Math.ceil(hoveredRating) &&
        hoveredRating % 1 !== 0
      ) {
        isHalf = true;
        fillColor = "#ffc107";
      } else {
        // Stars after hovered star use outline
        isOutline = true;
      }
    } else {
      // Default state based on score
      if (starNumber <= fullStars) {
        isFull = true;
        fillColor = "#ffc107";
      } else if (starNumber === fullStars + 1 && hasHalfStar) {
        isHalf = true;
        fillColor = "#ffc107";
      } else {
        // Empty stars use outline
        isOutline = true;
      }
    }

    return (
      <div
        key={index}
        ref={(el) => (starRefs.current[index] = el)}
        className="relative w-7 h-7 cursor-pointer"
        onMouseMove={(e) => handleMouseMove(index, e)}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => handleClick(index, e)}
      >
        {isFull ? (
          <MaterialSymbolsStar
            className="w-7 h-7"
            style={{ fill: fillColor }}
          />
        ) : isHalf ? (
          <MaterialSymbolsStarHalf
            className="w-7 h-7"
            style={{ fill: fillColor }}
          />
        ) : isOutline ? (
          <MaterialSymbolsStarOutline className="w-7 h-7" />
        ) : (
          <MaterialSymbolsStar className="w-7 h-7" style={{ fill: "#888888" }} />
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col py-2 px-2">
      <div className="flex justify-between items-center text-xs bg-secondary h-[40px] px-2">
        <span className="text-xs opacity-60">
          {displayScore.toFixed(1)}/10
        </span>
        <span className="text-primary-1 opacity-80">
          {userRating !== null ? "Your Rating" : "Score"}
        </span>
      </div>
      <div className="flex justify-center gap-x-1 bg-black px-2 py-5">
        {[0, 1, 2, 3, 4].map(renderStar)}
      </div>
    </div>
  );
};
