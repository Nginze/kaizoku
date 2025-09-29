import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";

type EpisodeGridContainerProps = {};

export const EpisodeGridContainer: React.FC<EpisodeGridContainerProps> = () => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="0-25" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="26-50">Light</SelectItem>
            <SelectItem value="51-75">Dark</SelectItem>
          </SelectContent>
        </Select>
        <div className="border border-secondary w-20">
          <Input
            placeholder="Sear.."
            className="bg-[#141414] rounded-none text-sm w-full"
          />
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(45px,1fr))] gap-1 overflow-auto h-[180px] py-1">
        {Array.from({ length: 200 }).map((_, index) => (
          <button className="bg-secondary-2 py-1">
            <span className="opacity-60">{index + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
