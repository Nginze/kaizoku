import React from "react";
import { AnimeSideBarListItem } from "./anime-sidebar-list-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpandableContainer } from "@/components/expandable-container";
import {
  getPopularOptions,
  getTopAiringOptions,
  getTrendingReleasesOptions,
} from "../queries";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { check, z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/authentication/contexts/auth-context";
import { useLogin } from "@/features/authentication/mutations/login";
import { useSignout } from "@/features/authentication/mutations/signout";

type HomeSideContainerProps = {};

const genres = [
  "Action",
  "Adventure",
  "Anti-Hero",
  "CGDCT",
  "College",
  "Comedy",
  "Drama",
  "Dub",
  "Ecchi",
  "Fantasy",
  "Gag Humor",
  "Game",
  "Harem",
  "Historical",
  "Horror",
  "Idol",
  "Isekai",
  "Iyashikei",
  "Josei",
  "Kids",
  "Magical Girl",
  "Martial Arts",
  "Mecha",
  "Military",
  "Movie",
  "Music",
  "Mythology",
  "Mystery",
  "Otaku",
  "Parody",
  "Police",
  "Psychological",
  "Racing",
  "Revenge",
  "Romance",
  "Rural",
  "Samurai",
  "School",
  "Sci-Fi",
  "Seinen",
  "Shoujo",
  "Shoujo Ai",
  "Shounen",
  "Shounen Ai",
  "Slice of Life",
  "Space",
  "Sports",
  "Super Power",
  "Supernatural",
  "Survival",
  "Suspense",
  "Time Travel",
  "Vampire",
  "Work",
];

export const HomeSideContainer: React.FC<HomeSideContainerProps> = () => {
  const years = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => 2026 - i);
  const { data: topAiringList } = useSuspenseQuery(getTopAiringOptions());
  const { data: trendingDaily } = useQuery(getTrendingReleasesOptions("daily"));
  const { data: trendingWeekly } = useQuery(
    getTrendingReleasesOptions("weekly")
  );

  const { user, isAuthenticated, isLoading } = useAuth();
  const { mutate: login } = useLogin();

  const filterFormSchema = z.object({
    season: z.string(),
    year: z.string(),
    genres: z.array(z.string()),
  });

  const form = useForm<z.infer<typeof filterFormSchema>>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      season: "fall",
      year: "2025",
      genres: [],
    },
  });

  const navigate = useNavigate();

  return (
    <form
      onSubmit={form.handleSubmit((data) => {
        navigate(
          `/filter?${new URLSearchParams({
            ...data,
            genres: data.genres.join(","),
          }).toString()}`
        );
      })}
    >
      <div className="flex flex-col w-full gap-3">
        {!isAuthenticated && (
          <div className="flex flex-col gap-2 px-2 py-2 items-center bg-[#222222] ">
            <span className="w-full text-left text-xs opacity-50">
              Sign in to kaizoku
            </span>
            <button
              type="button"
              onClick={() => login()}
              className="bg-blue flex items-center w-full overflow-hidden border border-secondary"
            >
              <div className="bg-white p-3">
                <img src="/icons/google.svg" className="w-5" />
              </div>
              <span className="w-full flex items-center justify-center text-sm">
                Continue with Google
              </span>
            </button>
            {/* <button className="bg-gray-dark border border-secondary flex items-center w-full overflow-hidden">
            <div className="bg-secondary-2 p-3">
              <img src="/icons/anilist.svg" className="w-5" />
            </div>
            <span className="w-full flex items-center justify-center text-sm">
              Continue with Anilist
            </span>
          </button> */}
          </div>
        )}
        <div className="bg-[#222222] w-full">
          <div className="px-2 py-2 border-b border-secondary border-opacity-10">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm opacity-80">Season:</span>
                <Controller
                  control={form.control}
                  name="season"
                  render={({ field, fieldState }) => (
                    <Select
                      name={field.name}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger
                        aria-invalid={fieldState.invalid}
                        className="max-w-full w-[70px] rounded-sm"
                      >
                        <SelectValue
                          placeholder="Fall"
                          className="truncate text-ellipsis w-[70px]"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fall">Fall</SelectItem>
                        <SelectItem value="winter">Winter</SelectItem>
                        <SelectItem value="spring">Spring</SelectItem>
                        <SelectItem value="summer">Summer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm opacity-80">Year:</span>
                <div className="flex items-center gap-3">
                  <Controller
                    name="year"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Select
                        name={field.name}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger
                          aria-invalid={fieldState.invalid}
                          className="w-full rounded-sm"
                        >
                          <SelectValue placeholder="2024" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48 overflow-y-auto">
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Button type="submit" className="w-full" variant={"default"}>
                    Go
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <ExpandableContainer>
            <Controller
              name="genres"
              control={form.control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-0.5 px-2 py-2 w-full">
                  {genres.map((genre, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 cursor-pointer rounded-sm"
                    >
                      <Checkbox
                        id={genre}
                        name={field.name}
                        checked={field.value?.includes(genre)}
                        onCheckedChange={(checked) => {
                          const newGenres = checked
                            ? [...field.value!, genre]
                            : field.value?.filter((g) => g !== genre);
                          field.onChange(newGenres);
                          field.onBlur();
                        }}
                        className="hover:none"
                      />
                      <label
                        htmlFor={genre}
                        className="text-sm opacity-80 line-clamp-1"
                      >
                        {genre}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            />
          </ExpandableContainer>
          <div className="flex flex-col gap-2  w-full py-2 ">
            <span className="w-full text-center text-sm opacity-50 py-2 text-white">
              # Most Viewed
            </span>
            <Tabs defaultValue="today" className="w-full">
              <div className="w-full flex items-center justify-between">
                <TabsList className="w-full">
                  <TabsTrigger className="w-full" value="today">
                    Today
                  </TabsTrigger>
                  <TabsTrigger className="w-full" value="week">
                    Week
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent
                value="today"
                // className="px-2 flex flex-col gap-1 w-full"
              >
                <ExpandableContainer
                  maxHeight="h-full"
                  minHeight="h-[585px]"
                  className="px-2 flex flex-col gap-1 w-full"
                >
                  {trendingDaily?.trending.slice(0, 15).map((anime, index) => (
                    <AnimeSideBarListItem
                      ranking={index + 1}
                      anime={anime}
                      key={index}
                    />
                  ))}
                </ExpandableContainer>
              </TabsContent>

              <TabsContent
                value="week"
                // className="px-2 flex flex-col gap-1 w-full"
              >
                <ExpandableContainer
                  maxHeight="h-full"
                  minHeight="h-[585px]"
                  className="px-2 flex flex-col gap-1 w-full"
                >
                  {trendingWeekly?.trending.slice(0, 15).map((anime, index) => (
                    <AnimeSideBarListItem
                      ranking={index + 1}
                      anime={anime}
                      key={index}
                    />
                  ))}
                </ExpandableContainer>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </form>
  );
};
