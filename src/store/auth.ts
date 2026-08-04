import { writable } from 'svelte/store';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

// Stores
export const user = writable<User | null>(null);
export const authLoading = writable<boolean>(true);

// Initialize listener
if (typeof window !== "undefined") {
  if (auth) {
    onAuthStateChanged(auth, (currentUser) => {
      user.set(currentUser);
      authLoading.set(false);
    });
  } else {
    console.error("Auth is not initialized, skipping onAuthStateChanged");
    authLoading.set(false);
  }
}

// Actions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
