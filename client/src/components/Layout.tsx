import React from "react";
import { BackToTopButton } from "./BackToTopButton";

type LayoutProps = {
  nav: React.ReactNode;
  main: React.ReactNode;
  side: React.ReactNode;
  footer: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ nav, main, side, footer }) => {
  return (
    <div className="w-full  flex flex-col bg-[#191919] gap-5">
      <div className="w-full">{nav}</div>
      <div className="w-[1270px] mx-auto min-h-[100vh] mb-10">
        <div className="flex gap-3">
          <div className="min-h-[1000px] grow-0 shrink-0 basis-[1000px] gap-4 flex flex-col">
            {main}
          </div>
          <div className="flex-1">{side}</div>
        </div>
      </div>
      <BackToTopButton />
      {footer}
    </div>
  );
};
