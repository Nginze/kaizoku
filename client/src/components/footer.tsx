import React from "react";
import { Link } from "react-router";
import { Skeleton } from "./ui/skeleton";
import Logo from "./logo";

type FooterProps = {};

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="w-full  bg-[#222222]">
      <div className="flex items-center justify-center  py-2.5 bg-secondary-2">
        <div className="flex items-center justify-between w-[1200px]  mx-auto">
          <div>
            <span className="text-light opacity-40 text-sm">
              Copyright © kaiZen. All Rights Reserved
            </span>
          </div>
          <div className="text-light opacity-40 flex gap-6 items-center text-sm">
            <Link to={"/about"}>Request</Link>
            <Link to={"/about"}>About</Link>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col items-center justify-center py-8 gap-2">
        <Logo />
        <div className="opacity-30 text-regular text-xs">
          Disclaimer: This site does not store any files on its server. All
          contents are provided by non-affiliated third parties.
        </div>
      </div>
    </footer>
  );
};

export const FooterSkeleton: React.FC = () => {
  return (
    <footer className="w-full px-4 py-6 border-t border-secondary border-opacity-10 mt-8">
      <div className="flex flex-col items-center gap-4">
        {/* Links skeleton */}
        <div className="flex items-center gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-16" />
          ))}
        </div>

        {/* Copyright skeleton */}
        <Skeleton className="h-3 w-48" />
      </div>
    </footer>
  );
};
