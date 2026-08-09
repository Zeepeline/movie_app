import { writable, get } from 'svelte/store';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { user } from './auth';
import type { HistoryItem } from '../types/history';

let currentUser: any = null;

const storedHistory = typeof window !== 'undefined' ? localStorage.getItem('moov_history') : null;
const initialHistory: HistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];

export const historyStore = writable<HistoryItem[]>(initialHistory);

if (typeof window !== 'undefined') {
  user.subscribe(async (u) => {
    currentUser = u;
    if (u && db) {
      try {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().history) {
          historyStore.set(docSnap.data().history);
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
    localStorage.setItem('moov_history', JSON.stringify(value));
    
    if (currentUser && db) {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const cleanValue = JSON.parse(JSON.stringify(value));
        await setDoc(docRef, { history: cleanValue }, { merge: true });
      } catch (e) {
        console.error("Error saving history to cloud:", e);
      }
    }
  }
});

export function addToHistory(item: Omit<HistoryItem, 'timestamp'>) {
  historyStore.update(items => {
    // Remove existing entry if any to move it to the front
    const filtered = items.filter(i => String(i.id) !== String(item.id));
    const newItem = { ...item, timestamp: Date.now() };
    return [newItem, ...filtered].slice(0, 50); // Keep max 50 history items
  });
}
