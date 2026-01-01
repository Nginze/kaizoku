import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSearchOptions } from "@/features/anime-browsing/queries/get-search";
import { AnimeResult } from "@/types/anime";
import { Loader } from "@/components/loader";

const createRequestFormSchema = (maxEpisodes?: number) =>
  z
    .object({
      reason: z.enum(
        [
          "no-content",
          "no-episode",
          "link-broken",
          "content-mismatch",
          "feature",
          "other",
        ] as const,
        {
          message: "Please select a request reason.",
        }
      ),
      animeId: z.string().optional(),
      episodeNumber: z
        .number()
        .int({ message: "Episode number must be a whole number." })
        .min(1, { message: "Episode number must be at least 1." })
        .max(
          maxEpisodes || 99999,
          maxEpisodes
            ? {
                message: `Episode number cannot exceed ${maxEpisodes}.`,
              }
            : { message: "Episode number is invalid." }
        )
        .optional(),
      description: z
        .string()
        .min(10, {
          message: "Description must be at least 10 characters.",
        })
        .max(500, {
          message: "Description must not exceed 500 characters.",
        }),
    })
    .refine(
      (data) => {
        const animeRelatedReasons = [
          "no-content",
          "no-episode",
          "link-broken",
          "content-mismatch",
        ];
        if (animeRelatedReasons.includes(data.reason)) {
          return !!data.animeId;
        }
        return true;
      },
      {
        message: "Please select an anime for this request reason.",
        path: ["animeId"],
      }
    );

const requestFormSchema = createRequestFormSchema();

type RequestFormValues = z.infer<typeof requestFormSchema>;

interface RequestFormProps {
  onSubmit: (data: RequestFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function RequestForm({ onSubmit, onCancel, isSubmitting = false }: RequestFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnime, setSelectedAnime] = useState<AnimeResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Create schema with max episodes from selected anime
  const schema = createRequestFormSchema(selectedAnime?.episodes);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
    },
  });

  const selectedReason = form.watch("reason");
  const animeRelatedReasons = [
    "no-content",
    "no-episode",
    "link-broken",
    "content-mismatch",
  ];
  const shouldShowAnimeSearch =
    selectedReason && animeRelatedReasons.includes(selectedReason);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setShowResults(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { data: searchResults } = useQuery({
    ...getSearchOptions({ q: searchQuery }),
    enabled: shouldShowAnimeSearch && searchQuery.length >= 2,
  });

  const handleAnimeSelect = (anime: AnimeResult) => {
    setSelectedAnime(anime);
    form.setValue("animeId", anime.idAnilist.toString());
    form.setValue("episodeNumber", undefined);
    setSearchQuery(
      anime.title.romaji ||
        anime.title.english ||
        anime.title.userPreferred ||
        ""
    );
    setShowResults(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Request Reason</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  // Reset anime selection when reason changes
                  setSelectedAnime(null);
                  setSearchQuery("");
                  form.setValue("animeId", undefined);
                  form.setValue("episodeNumber", undefined);
                }}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="max-w-[300px] w-[170px]">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no-content">
                    No content for anime
                  </SelectItem>
                  <SelectItem value="no-episode">No episode</SelectItem>
                  <SelectItem value="link-broken">
                    Streaming link not working
                  </SelectItem>
                  <SelectItem value="content-mismatch">
                    Content mismatch
                  </SelectItem>
                  <SelectItem value="feature">Feature request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {shouldShowAnimeSearch && (
          <FormField
            control={form.control}
            name="animeId"
            render={() => (
              <FormItem>
                <FormLabel>Select Anime</FormLabel>
                <FormControl>
                  <div className="relative" ref={searchContainerRef}>
                    <Input
                      placeholder="Search for anime..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.length < 2) {
                          setShowResults(false);
                        }
                      }}
                      onFocus={() => {
                        if (searchQuery.length >= 2) {
                          setShowResults(true);
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-full"
                    />
                    {showResults &&
                      searchResults?.results &&
                      searchResults.results.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-secondary border border-secondary-1 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                          {searchResults.results.map((anime: AnimeResult) => (
                            <button
                              key={anime.idAnilist}
                              type="button"
                              onClick={() => handleAnimeSelect(anime)}
                              className="w-full flex flex-col items-start gap-1 p-3 hover:bg-secondary-2 transition-colors text-left border-b border-secondary-1 last:border-b-0"
                            >
                              <div className="text-sm text-primary line-clamp-1">
                                {anime.title.romaji ||
                                  anime.title.english ||
                                  anime.title.userPreferred}
                              </div>
                              <div className="opacity-40 text-xs">
                                <span>
                                  {anime.format} •{" "}
                                  {anime.seasonYear || anime.startDate?.year}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </FormControl>
                {selectedAnime && (
                  <FormDescription className="text-primary">
                    Selected:{" "}
                    {selectedAnime.title.romaji || selectedAnime.title.english}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {shouldShowAnimeSearch && selectedAnime && (
          <FormField
            control={form.control}
            name="episodeNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Episode Number (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter episode number..."
                    min={1}
                    max={selectedAnime.episodes || undefined}
                    value={field.value || ""}
                    onChange={(e) => {
                      const input = e.target.value;
                      // Only allow numeric input
                      if (input === "" || /^\d+$/.test(input)) {
                        const value = input ? parseInt(input, 10) : undefined;
                        field.onChange(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent non-numeric keys except backspace, delete, arrow keys, tab
                      if (
                        !/^\d$/.test(e.key) &&
                        !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)
                      ) {
                        e.preventDefault();
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full"
                  />
                </FormControl>
                <FormDescription>
                  {selectedAnime.episodes
                    ? `This anime has ${selectedAnime.episodes} episode${
                        selectedAnime.episodes > 1 ? "s" : ""
                      }`
                    : "Episode count not available"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide details about your request..."
                  className="resize-none min-h-[120px] border-secondary-2 text-sm "
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Provide as much detail as possible (10-500 characters).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              className="text-sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          {isSubmitting  ? (
            <Button type="button" disabled className="min-w-[140px]">
              <Loader size="sm" className="mr-2" />
              Submitting...
            </Button>
          ) : (
            <Button type="submit">Submit Request</Button>
          )}
        </div>
      </form>
    </Form>
  );
}
