export interface AnimeScheduleExtras {
  provider: string;
}

export interface AnimeScheduleItem {
  malid: number;
  time: number;
  lastep: number;
  title: string;
  totalep: number | null;
  picture: string;
  members: number;
  score: number | null;
  extras: AnimeScheduleExtras;
  formattedTime: string;
  airingTime: string;
}

export interface ScheduleDay {
  date: string;
  dateFormatted: string;
  anime: AnimeScheduleItem[];
}

export interface ScheduleResponse {
  schedule: ScheduleDay[];
  totalDays: number;
  totalAnime: number;
}

export interface ScheduleData {
  json: {
    schedule: ScheduleDay[];
    totalDays: number;
    totalAnime: number;
  };
}