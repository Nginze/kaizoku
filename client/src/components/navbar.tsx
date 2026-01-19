import React from "react";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Flyout } from "./flyout";
import { SearchResultListItem } from "../features/anime-browsing/components/search-result-list-item";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "./ui/skeleton";
import axios from "axios";
import { SearchInput } from "@/features/anime-browsing/components/search-input";
import { SearchInputMobile } from "@/features/anime-browsing/components/search-input-mobile";
import Logo from "./logo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/features/authentication/contexts/auth-context";
import { useMediaQuery } from "react-responsive";
import { getInitials } from "@/lib/utils";

type NavbarProps = {};

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  const isDesktopOrLaptop = useMediaQuery({
    query: "(min-width: 1224px)",
  });

  const isTabletOrMobile = useMediaQuery({ query: "(max-width: 1224px)" });

  console.log(isAuthenticated, user);

  return (
    <div className="px-4  md:py-0 border-b border-secondary md:border-none  flex items-center min-h-[55px] w-full">
      <div className="w-full flex items-center justify-between md:pl-3 lg:pl-3">
        <div className="flex items-center gap-5">
          <Logo />
          {isDesktopOrLaptop && <SearchInput />}
        </div>

        <div className="flex items-center gap-4">
          {isTabletOrMobile && <SearchInputMobile />}
          {isAuthenticated && (
            <Avatar className="w-7 h-7 cursor-pointer ">
              <AvatarImage src={user?.image} alt="@user" />
              <AvatarFallback className="bg-secondary-1 ">
                {getInitials(user?.name as string, 2)}
              </AvatarFallback>
            </Avatar>
          )}
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
