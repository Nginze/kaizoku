import React from "react";

type PlayerControlsProps = {};

export const PlayerControls: React.FC<PlayerControlsProps> = () => {
  return (
    <div className="bg-[#222222] flex w-full">
      <div className="flex w-full h-full">
        <div className="w-1/4 flex items-center px-3 py-4 text-xs opacity-55 bg-dark border-r border-secondary-1 border-dashed">
          <div className=" mx-auto text-center">
            <div>
              You are watching <span className="font-bold">Episode 21</span>{" "}
              <br />
            </div>
            <div className="font-light opacity-50">
              (if the current server doesn't work, please refresh or try
              another)
            </div>
          </div>
        </div>
        <div className="flex-1 w-full h-full px-4">
          <div className="flex flex-col">
            <div className="flex items-center flex-1 h-1 px-3 py-4 border-b border-secondary border-dashed gap-6">
              <div className="flex text-sm gap-4">
                <div className="opacity-70">SUB: </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Vidstream</span>
                </button>
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Vidhide</span>
                </button>
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Streamwish</span>
                </button>
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Mp4upload</span>
                </button>
              </div>
            </div>
            <div className="flex items-center flex-1 h-1 px-3 py-4  gap-6">
              <div className="flex text-sm gap-4">
                <div className="opacity-70">DUB: </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Vidstream</span>
                </button>
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Vidhide</span>
                </button>
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Streamwish</span>
                </button>
                <button className="px-3 py-1.5 text-white text-sm bg-secondary">
                  <span className="opacity-60">Mp4upload</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
