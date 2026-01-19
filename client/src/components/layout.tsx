import React from "react";
import { BackToTopButton } from "./back-to-top-button";
import WatchStatusAlert from "@/features/anime-watching/components/watch-status-alert";
import { useMediaQuery } from "react-responsive";

type LayoutProps = {
  nav: React.ReactNode;
  main: React.ReactNode;
  side: React.ReactNode;
  footer: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ nav, main, side, footer }) => {
  const isDesktopOrLaptop = useMediaQuery({
    query: "(min-width: 1224px)",
  });
  return (
    <div className="w-full flex flex-col bg-[#191919] gap-5">
      <div className="w-full max-w-[1200px] md:max-w-[1200px] mx-auto ">
        {nav}
      </div>
      <div className="w-full max-w-[1200px] md:max-w-[1200px] mx-auto min-h-[100vh] mb-10 md:px-4">
        <div className="flex gap-3 w-full">
          <div className="min-h-[1000px] w-full md:w-4/5 gap-4 flex flex-col px-4">
            {main}
          </div>
          {isDesktopOrLaptop && (
            <div className="flex-1">{side}</div>
          )}
        </div>
      </div>
      <BackToTopButton />
      <WatchStatusAlert />
      {footer}
    </div>
  );
};
