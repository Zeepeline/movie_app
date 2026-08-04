import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYScPGDafCKhf5Qy-y7K6La8BgOBpmgCQ",
  authDomain: "movie-app-d1bf3.firebaseapp.com",
  projectId: "movie-app-d1bf3",
  storageBucket: "movie-app-d1bf3.firebasestorage.app",
  messagingSenderId: "391485159558",
  appId: "1:391485159558:web:4ef26f48d1997f116e7907",
  measurementId: "G-TLC52RC6FY",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics if supported in the environment (browser)
let analytics: any;
if (typeof window !== "undefined") {
  // Use dynamic import so adblockers won't crash the entire app
  import("firebase/analytics").then(({ getAnalytics }) => {
    try {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized");
    } catch (e) {
      console.error("Firebase Analytics failed to initialize", e);
    }
  }).catch(e => {
    console.warn("Firebase Analytics blocked by Content Blocker:", e);
  });
}

// Initialize Auth
let auth: any;
let googleProvider: any;

try {
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  console.log("Firebase Auth initialized");
} catch (e) {
  console.error("Firebase Auth failed to initialize", e);
}

export { analytics, app, auth, googleProvider };
