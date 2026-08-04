export interface HistoryItem {
  id: number | string;
  title: string;
  imageUrl: string;
  type: string; // 'movie' or 'tv'
  season?: number;
  episode?: number;
  timestamp: number;
}
