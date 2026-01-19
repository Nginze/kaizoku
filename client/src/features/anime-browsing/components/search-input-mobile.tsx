import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import React, { useState } from "react";
import { getSearchOptions } from "../queries";
import {
  SearchResultListItem,
  SearchResultListItemSkeleton,
} from "./search-result-list-item";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export const SearchInputMobile: React.FC = () => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const q = useDebounce(query, 300);

  const { data: searchResults, isPending: searchResultsPending } = useQuery(
    getSearchOptions({
      q,
    })
  );

  return (
    <>
      {/* Mobile Search Icon Button */}
      <button
        onClick={() => setMobileSearchOpen(true)}
        className="p-2 hover:bg-secondary rounded-sm transition-colors"
      >
        <Search size={20} />
      </button>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#191919] border-b border-secondary px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex bg-[#141414] items-center border border-slate-50/10 rounded-sm">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-sm"
                placeholder="Search anime..."
                autoFocus
              />
              <div className="pr-2">
                <Search size={18} />
              </div>
            </div>
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setQuery("");
              }}
              className="text-sm px-3 py-2 hover:bg-secondary rounded-sm"
            >
              Cancel
            </button>
          </div>

          {/* Mobile Search Results */}
          {query && (
            <div className="mt-4 bg-[#1b1918] border border-secondary rounded-sm p-4 max-h-[70vh] overflow-y-auto">
              {searchResultsPending ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, index: number) => (
                    <SearchResultListItemSkeleton key={index} />
                  ))}
                </div>
              ) : searchResults && searchResults.results.length > 0 ? (
                <>
                  <div className="flex flex-col gap-2">
                    {searchResults.results
                      .slice(0, 15)
                      .map((anime, index: number) => (
                        <SearchResultListItem
                          setOpenSearchResults={() => {
                            setMobileSearchOpen(false);
                            setQuery("");
                          }}
                          anime={anime}
                          key={index}
                        />
                      ))}
                  </div>
                  {searchResults.hasNextPage && (
                    <Button
                      onClick={() => {
                        navigate(`/filter?q=${q}`);
                        setMobileSearchOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-center mt-4"
                    >
                      <span>View all results</span>
                    </Button>
                  )}
                </>
              ) : (
                <span className="w-full text-sm opacity-50 flex items-center justify-center">
                  No Results for "{q}"
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
