import { Flyout } from "@/components/flyout";
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

type SearchInputProps = {};

export const SearchInput: React.FC<SearchInputProps> = () => {
  const [openSearchResults, setOpenSearchResults] = useState<boolean>(false);
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
      <Flyout
        open={openSearchResults}
        align="start"
        disabled={query.length === 0}
        trigger={
          <div
            onClick={() => setOpenSearchResults(true)}
            className={`flex bg-[#141414] items-center bg-bg-primary border border-slate-50/10 rounded-sm transition-all ease-out duration-150 ${
              query ? "w-[500px]" : "w-[250px]"
            }`}
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Prevent space from triggering popover behavior
                if (e.key === " ") {
                  e.stopPropagation();
                }
              }}
              className="text-sm"
              placeholder="Search"
            />
            <div className="pr-2">
              <Search size={18} />
            </div>
          </div>
        }
        className="rounded-sm w-[500px] border border-secondary bg-[#1b1918]"
      >
        <div className="w-full flex flex-col gap-4">
          {searchResultsPending ? (
            <>
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, index: number) => (
                  <SearchResultListItemSkeleton key={index} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 h-auto max-h-[400px] overflow-y-auto">
                {searchResults?.results
                  .slice(0, 15)
                  .map((anime, index: number) => (
                    <SearchResultListItem
                      setOpenSearchResults={setOpenSearchResults}
                      anime={anime}
                      key={index}
                    />
                  ))}
              </div>

              {searchResults?.hasNextPage && (
                <Button
                  onClick={() => {
                    navigate(`/filter?q=${q}`);
                  }}
                  className="flex w-full items-center justify-center"
                >
                  <span>View all results</span>
                </Button>
              )}
            </>
          )}
        </div>

        {searchResults && searchResults.results.length === 0 && (
          <span className="w-full text-sm opacity-50 flex items-center justify-center">
            No Results for "{q}"
          </span>
        )}
      </Flyout>
    </>
  );
};
