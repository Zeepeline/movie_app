import { writable, get } from 'svelte/store';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { user } from './auth';
import type { WatchlistItem } from '../types/watchlist';

let currentUser: any = null;

// Load from localStorage if available
const storedWatchlist = typeof window !== 'undefined' ? localStorage.getItem('moov_watchlist') : null;
const initialWatchlist: WatchlistItem[] = storedWatchlist ? JSON.parse(storedWatchlist) : [];

export const watchlistStore = writable<WatchlistItem[]>(initialWatchlist);

// Subscribe to auth state
if (typeof window !== 'undefined') {
  user.subscribe(async (u) => {
    currentUser = u;
    if (u && db) {
      // User logged in, fetch cloud watchlist
      try {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().watchlist) {
          // Merge logic: If cloud has data, use it. 
          // You could also merge local and cloud, but keeping it simple for now.
          watchlistStore.set(docSnap.data().watchlist);
        } else {
          // If no cloud data exists yet, sync the current local data to cloud
          const currentItems = get(watchlistStore);
          if (currentItems.length > 0) {
            const cleanValue = JSON.parse(JSON.stringify(currentItems));
            await setDoc(docRef, { watchlist: cleanValue }, { merge: true });
          }
        }
      } catch (e) {
        console.error("Error fetching watchlist from cloud:", e);
      }
    }
  });
}

// Subscribe to changes and save
watchlistStore.subscribe(async (value) => {
  if (typeof window !== 'undefined') {
    // Always save to local storage as fallback/cache
    localStorage.setItem('moov_watchlist', JSON.stringify(value));
    
    // If logged in, also sync to cloud
    if (currentUser && db) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const cleanValue = JSON.parse(JSON.stringify(value));
        await setDoc(docRef, { watchlist: cleanValue }, { merge: true });
      } catch (e) {
        console.error("Error saving watchlist to cloud:", e);
      }
    }
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
