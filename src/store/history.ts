import { writable, get } from 'svelte/store';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { user } from './auth';
import type { HistoryItem } from '../types/history';

let currentUser: any = null;

function getItemKey(item: { id?: string | number, title?: string }): string {
  if (item.id !== undefined && item.id !== null && item.id !== "") {
    return String(item.id).trim();
  }
  return (item.title || '').trim().toLowerCase();
}

function deduplicateHistory(items: HistoryItem[]): HistoryItem[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: HistoryItem[] = [];
  
  for (const item of items) {
    if (!item) continue;
    const key = getItemKey(item);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push({
        ...item,
        id: String(item.id)
      });
    }
  }
  return result;
}

const storedHistory = typeof window !== 'undefined' ? localStorage.getItem('moov_history') : null;
const parsedHistory: HistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];
const initialHistory: HistoryItem[] = deduplicateHistory(parsedHistory);

export const historyStore = writable<HistoryItem[]>(initialHistory);

if (typeof window !== 'undefined') {
  user.subscribe(async (u) => {
    currentUser = u;
    if (u && db) {
      try {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().history) {
          const rawHistory = docSnap.data().history;
          const cleanHistory = deduplicateHistory(rawHistory);
          historyStore.set(cleanHistory);
        } else {
          const currentItems = get(historyStore);
          if (currentItems.length > 0) {
            const cleanValue = JSON.parse(JSON.stringify(currentItems));
            await setDoc(docRef, { history: cleanValue }, { merge: true });
          }
        }
      } catch (e) {
        console.error("Error fetching history from cloud:", e);
      }
    }
  });
}

historyStore.subscribe(async (value) => {
  if (typeof window !== 'undefined') {
    const cleanValue = deduplicateHistory(value);
    localStorage.setItem('moov_history', JSON.stringify(cleanValue));
    
    if (currentUser && db) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        await setDoc(docRef, { history: JSON.parse(JSON.stringify(cleanValue)) }, { merge: true });
      } catch (e) {
        console.error("Error saving history to cloud:", e);
      }
    }
  }
});

export function addToHistory(item: Omit<HistoryItem, 'timestamp'>) {
  if (!item || (item.id === undefined && !item.title)) return;
  const targetKey = getItemKey(item);

  historyStore.update(items => {
    // Filter out any matching entry to prevent duplicate
    const filtered = items.filter(i => {
      if (!i) return false;
      return getItemKey(i) !== targetKey;
    });

    const newItem: HistoryItem = {
      ...item,
      id: String(item.id),
      timestamp: Date.now()
    };

    return [newItem, ...deduplicateHistory(filtered)].slice(0, 50); // Keep max 50 history items
  });
}

export function removeFromHistory(id: string | number) {
  const targetId = String(id).trim();
  historyStore.update(items => items.filter(i => i && String(i.id).trim() !== targetId));
}

export function clearHistory() {
  historyStore.set([]);
}
