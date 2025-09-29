import React from "react";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Flyout } from "./flyout";
import { SearchResultListItem } from "../features/anime-browsing/components/search-result-list-item";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import axios from "axios";
import { SearchInput } from "@/features/anime-browsing/components/search-input";

type NavbarProps = {};

export const Navbar: React.FC<NavbarProps> = () => {
  return (
    <div className="flex items-center min-h-[55px]">
      <div className="w-[1200px] flex items-center mx-auto justify-between">
        <div className="flex items-center gap-5">
          <div>
            <span className="text-2xl">改 kaiZen</span>
          </div>
          <SearchInput />
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
