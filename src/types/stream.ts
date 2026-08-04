export interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface Subtitle {
  url: string;
  lang: string;
}

export interface StreamData {
  sources: StreamSource[];
  subtitles: Subtitle[];
}
