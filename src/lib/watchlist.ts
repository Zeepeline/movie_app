import { writable, get } from 'svelte/store';

export interface WatchlistItem {
  id: number | string;
  title: string;
  poster_path: string | null;
  vote_average: number;
  media_type: string;
  release_date: string;
}

// Load from localStorage if available
const storedWatchlist = typeof window !== 'undefined' ? localStorage.getItem('moov_watchlist') : null;
const initialWatchlist: WatchlistItem[] = storedWatchlist ? JSON.parse(storedWatchlist) : [];

export const watchlistStore = writable<WatchlistItem[]>(initialWatchlist);

// Subscribe to changes and save to localStorage
watchlistStore.subscribe(value => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('moov_watchlist', JSON.stringify(value));
  }
});

export function addToWatchlist(item: WatchlistItem) {
  watchlistStore.update(items => {
    // Prevent duplicates
    if (!items.find(i => i.id === item.id)) {
      return [item, ...items];
    }
    return items;
  });
}

export function removeFromWatchlist(id: number | string) {
  watchlistStore.update(items => items.filter(i => i.id !== id));
}

export function isInWatchlist(id: number | string): boolean {
  const items = get(watchlistStore);
  return items.some(i => i.id === id);
}
