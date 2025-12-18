export type Video = {
  url: string;
  quality: string;
  isM3U8: boolean;
};

export type Subtitle = {
  url: string;
  lang: string;
};

export type Intro = {
  start: number;
  end: number;
};
