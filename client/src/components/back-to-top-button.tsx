import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import React, { useEffect, useState } from "react";

type BackToTopButtonProps = {};

export const BackToTopButton: React.FC<BackToTopButtonProps> = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed right-10 bottom-10 bg-dark px-6 py-2 rounded-sm transition duration-200",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <ChevronUp size={18} opacity={60} />
    </button>
  );
};
