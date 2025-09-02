import React from "react";
import { Search, User } from "lucide-react";
import { Input } from "./ui/input";
import { Flyout } from "./Flyout";
import { SearchResultListItem } from "./SearchResultListItem";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { api } from "@/api";

type NavbarProps = {};

export const Navbar: React.FC<NavbarProps> = () => {
  const { data: testDb } = useQuery({
    queryKey: QUERY_KEYS.featuredAnime,
    queryFn: async () => {
      return (await api.get("/db.json")).data;
    },
  });
  return (
    <div className="flex items-center min-h-[55px]">
      <div className="w-[1270px] flex items-center mx-auto justify-between">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-2xl">ANIPLEX</span>
          </div>
          <Flyout
            align="start"
            trigger={
              <div className="flex bg-[#141414] items-center px-3 bg-bg-primary border border-slate-50/10 rounded-sm w-[350px]">
                <Search size={18} />
                <Input className="text-sm" placeholder="Search" />
              </div>
            }
            className="rounded-sm w-[500px] border border-secondary bg-[#1b1918]"
          >
            <div className="flex flex-col gap-1.5">
              {testDb?.featured.map((anime: any, index: number) => (
                <SearchResultListItem anime={anime} key={index} />
              ))}
            </div>
          </Flyout>
        </div>
      </div>
    </div>
  );
};
