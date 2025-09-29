import React, { useState, useEffect } from "react";

type ScheduleListProps = {};

const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const getCurrentTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const ScheduleList: React.FC<ScheduleListProps> = () => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const scheduleData = {
    schedule: [
      {
        date: "2025-01-13",
        dateFormatted: "Monday (Today)",
        anime: [
          {
            title: { romaji: "Management of a Novice Alchemist" },
            formattedTime: "2025-01-13T13:30:00.000Z",
          },
          {
            title: { romaji: "Bleach: Thousand-Year Blood War" },
            formattedTime: "2025-01-13T17:00:00.000Z",
          },
          {
            title: { romaji: "Play It Cool, Guys" },
            formattedTime: "2025-01-13T19:30:00.000Z",
          },
        ],
      },
      {
        date: "2025-01-14",
        dateFormatted: "Tuesday",
        anime: [
          {
            title: { romaji: "The Seven Deadly Sins: Grudge of Edinburgh" },
            formattedTime: "2025-01-14T10:00:00.000Z",
          },
          {
            title: { romaji: "Shinobi no Ittoki" },
            formattedTime: "2025-01-14T14:30:00.000Z",
          },
          {
            title: { romaji: "Vazzrock the Animation" },
            formattedTime: "2025-01-14T16:00:00.000Z",
          },
          {
            title: { romaji: "Encouragement of Climb: Next Summit" },
            formattedTime: "2025-01-14T16:30:00.000Z",
          },
          {
            title: { romaji: "The Quintessential Quintuplets Movie" },
            formattedTime: "2025-01-14T17:00:00.000Z",
          },
          {
            title: { romaji: "Mirage QUEEN Prefers Circus" },
            formattedTime: "2025-01-14T17:00:00.000Z",
          },
          {
            title: { romaji: "Chainsaw Man" },
            formattedTime: "2025-01-14T17:30:00.000Z",
          },
        ],
      },
      {
        date: "2025-01-15",
        dateFormatted: "Wednesday",
        anime: [
          {
            title: { romaji: "The Eminence in Shadow" },
            formattedTime: "2025-01-15T15:00:00.000Z",
          },
          {
            title: { romaji: "Immoral Guild" },
            formattedTime: "2025-01-15T16:30:00.000Z",
          },
          {
            title: { romaji: "Love Flops" },
            formattedTime: "2025-01-15T16:30:00.000Z",
          },
          {
            title: { romaji: "Mob Psycho 100 III" },
            formattedTime: "2025-01-15T17:30:00.000Z",
          },
          {
            title: { romaji: "Do It Yourself!!" },
            formattedTime: "2025-01-15T18:30:00.000Z",
          },
          {
            title: { romaji: "Muv-Luv Alternative 2nd Season" },
            formattedTime: "2025-01-15T19:00:00.000Z",
          },
        ],
      },
      {
        date: "2025-01-16",
        dateFormatted: "Thursday",
        anime: [
          {
            title: { romaji: "Bibliophile Princess" },
            formattedTime: "2025-01-16T15:00:00.000Z",
          },
          {
            title: { romaji: "Akiba Maid War" },
            formattedTime: "2025-01-16T16:30:00.000Z",
          },
          {
            title: { romaji: "Kagami no Kojou" },
            formattedTime: "2025-01-16T17:00:00.000Z",
          },
          {
            title: { romaji: "Lupin Zero" },
            formattedTime: "2025-01-16T17:00:00.000Z",
          },
          {
            title: { romaji: "KanColle Season 2: Let's Meet at Sea" },
            formattedTime: "2025-01-16T17:30:00.000Z",
          },
          {
            title: { romaji: "Urusei Yatsura" },
            formattedTime: "2025-01-16T18:45:00.000Z",
          },

          {
            title: { romaji: "Urusei Yatsura" },
            formattedTime: "2025-01-16T18:45:00.000Z",
          },
          {
            title: { romaji: "Urusei Yatsura" },
            formattedTime: "2025-01-16T18:45:00.000Z",
          },
          {
            title: { romaji: "Urusei Yatsura" },
            formattedTime: "2025-01-16T18:45:00.000Z",
          },
          {
            title: { romaji: "Urusei Yatsura" },
            formattedTime: "2025-01-16T18:45:00.000Z",
          },
        ],
      },
      {
        date: "2025-01-17",
        dateFormatted: "Friday",
        anime: [
          {
            title: { romaji: "Obey Me! Season 2" },
            formattedTime: "2025-01-17T10:00:00.000Z",
          },
          {
            title: { romaji: "My Master Has No Tail" },
            formattedTime: "2025-01-17T15:30:00.000Z",
          },
          {
            title: { romaji: "Lucifer and the Biscuit Hammer" },
            formattedTime: "2025-01-17T19:00:00.000Z",
          },
          {
            title: { romaji: "Legend of Mana -The Teardrop Crystal-" },
            formattedTime: "2025-01-17T19:30:00.000Z",
          },
        ],
      },
      {
        date: "2025-01-18",
        dateFormatted: "Saturday",
        anime: [
          {
            title: { romaji: "Shadowverse Flame" },
            formattedTime: "2025-01-18T03:00:00.000Z",
          },
          {
            title: { romaji: "My Hero Academia Season 6" },
            formattedTime: "2025-01-18T11:00:00.000Z",
          },
          {
            title: { romaji: "Welcome to Demon School! Iruma-kun Season 3" },
            formattedTime: "2025-01-18T15:30:00.000Z",
          },
          {
            title: { romaji: "Uzaki-chan Wa Asobitai! Double Season" },
            formattedTime: "2025-01-18T16:00:00.000Z",
          },
          {
            title: { romaji: "Beast Tamer" },
            formattedTime: "2025-01-18T16:30:00.000Z",
          },
          {
            title: { romaji: "Yowamushi Pedal: Limit Break" },
            formattedTime: "2025-01-18T17:00:00.000Z",
          },
          {
            title: { romaji: "Spy x Family Part 2" },
            formattedTime: "2025-01-18T17:00:00.000Z",
          },
        ],
      },
    ],
  };

  return (
    <div className="bg-[#191919] text-white min-h-screen h-screen w-full overflow-auto">
      <div className="px-4 py-3 flex items-center justify-between w-full">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="text-4xl font-semibold text-primary">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        {scheduleData.schedule.map((day, dayIndex) => (
          <div key={day.date} className="mb-6">
            <div className="text-lg font-semibold mb-3 text-center py-2">
              {day.dateFormatted}
            </div>

            <div className="space-y-1">
              {day.anime.map((anime, animeIndex) => (
                <div
                  key={`${day.date}-${animeIndex}`}
                  className="flex items-center justify-between cursor-pointer rounded"
                >
                  <div className="flex-1 text-sm text-primary hover:text-primary-2">
                    {anime.title.romaji}
                  </div>
                  <div className="text-sm text-gray-300 ml-4 ">
                    {formatTime(anime.formattedTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex py-3 px-4 w-full bg-secondary-2 rounded-sm  justify-center items-center">
        <span className="text-sm">Release time is estimated</span>
      </div>
    </div>
  );
};
