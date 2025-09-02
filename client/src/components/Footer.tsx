import React from "react";
import { Link } from "react-router";

type FooterProps = {};

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="w-full  bg-[#222222]">
      <div className="flex items-center justify-center  py-2.5 bg-secondary-2">
        <div className="flex items-center justify-between w-[1270px]  mx-auto">
          <div>
            <span className="text-light opacity-40 text-sm">
              Copyright © Anix. All Rights Reserved
            </span>
          </div>
          <div className="text-light opacity-40 flex gap-6 items-center text-sm">
            <Link to={"/about"}>Request</Link>
            <Link to={"/about"}>About</Link>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col items-center justify-center py-8 gap-2">
        <div>
          <span className="text-2xl">ANIPLEX</span>
        </div>
        <div className="opacity-30 text-regular text-xs">
          Disclaimer: This site does not store any files on its server. All
          contents are provided by non-affiliated third parties.
        </div>
      </div>
    </footer>
  );
};
