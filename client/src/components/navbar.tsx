import React from "react";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Flyout } from "./flyout";
import { SearchResultListItem } from "./search-result-list-item";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import axios from "axios";

type NavbarProps = {};

export const Navbar: React.FC<NavbarProps> = () => {
  // const { data: testDb } = useQuery({
  //   queryKey: ["test-search"],
  //   queryFn: async () => {
  //     return (await axios.get("/db.json")).data;
  //   },
  // });
  return (
    <div className="flex items-center min-h-[55px]">
      <div className="w-[1200px] flex items-center mx-auto justify-between">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-2xl">改 kaiZen</span>
          </div>
          <Flyout
            align="start"
            trigger={
              <div className="flex bg-[#141414] items-center px-3 bg-bg-primary border border-slate-50/10 rounded-sm w-[350px]">
                <Input className="text-sm" placeholder="Search" />
                <Search size={18} />
              </div>
            }
            className="rounded-sm w-[500px] border border-secondary bg-[#1b1918]"
          >
            <></>
            {/* <div className="flex flex-col gap-1.5">
              {testDb?.featured.map((anime: any, index: number) => (
                <SearchResultListItem anime={anime} key={index} />
              ))}
            </div> */}
          </Flyout>
        </div>
      </div>
    </div>
  );
};

export const NavbarSkeleton: React.FC = () => {
  return (
    <nav className="w-full flex items-center justify-between px-4 py-3 border-b border-secondary border-opacity-10">
      {/* Logo skeleton */}
      <Skeleton className="h-8 w-32" />

      {/* Search bar skeleton */}
      <div className="flex-1 max-w-md mx-6">
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Right side controls skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-20" />
      </div>
    </nav>
  );
};
