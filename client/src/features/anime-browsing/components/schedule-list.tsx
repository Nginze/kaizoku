import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { getScheduleListOptions } from "../queries";
import { Loader } from "@/components/loader";

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleTimeString("en-US", {
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

const hasAired = (airDate: string) => {
  return new Date(airDate) < new Date();
};

const getWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust to get Monday
  const monday = new Date(today.setDate(today.getDate() + diff));

  const week = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    week.push(day.toISOString().split("T")[0]);
  }
  return week;
};

const formatWeekDay = (date: string) => {
  const d = new Date(date);
  const isToday = new Date().toDateString() === d.toDateString();
  return `${d.toLocaleDateString("en-US", { weekday: "long" })}${
    isToday ? " (Today)" : ""
  }`;
};

type ScheduleListProps = {};

export const ScheduleList: React.FC<ScheduleListProps> = () => {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const { data: scheduleList, isPending: scheduleListPending } = useQuery(
    getScheduleListOptions()
  );

  const weeklySchedule = React.useMemo(() => {
    if (!scheduleList?.schedule) return [];

    const weekDates = getWeekDates();
    const scheduleMap = new Map(
      scheduleList.schedule.map((day) => [day.date, day])
    );

    return weekDates.map((date) => ({
      date,
      dateFormatted: formatWeekDay(date),
      anime: scheduleMap.get(date)?.anime || [],
    }));
  }, [scheduleList]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#191919] text-white min-h-screen h-screen w-full overflow-auto flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between w-full">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="text-4xl font-semibold text-primary">
              {currentTime}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2  flex-1">
        {scheduleListPending ? (
          <div className="flex justify-center items-center h-40">
            <Loader size="md" className="text-primary" />
          </div>
        ) : (
          weeklySchedule.map((day) => (
            <div key={day.date} className="mb-6">
              <div className="text-lg font-semibold mb-3 text-center py-2">
                {day.dateFormatted}
              </div>

              <div className="space-y-1">
                {day.anime.length === 0 ? (
                  <div className="text-sm text-center opacity-50">
                    No releases scheduled
                  </div>
                ) : (
                  day.anime.map((anime, animeIndex) => (
                    <div
                      key={`${day.date}-${animeIndex}`}
                      className={`flex items-center justify-between cursor-pointer rounded transition-opacity ${
                        hasAired(anime.airingTime)
                          ? "opacity-50"
                          : "opacity-100"
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="text-sm text-primary hover:text-primary-2 line-clamp-1">
                          {anime.title}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300 ml-4">
                        {formatTime(anime.airingTime)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex py-3 px-4 w-full bg-secondary-2 rounded-sm justify-center items-center">
        <span className="text-sm">Release time is estimated</span>
      </div>
    </div>
  );
};
