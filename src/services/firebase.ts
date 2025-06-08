import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your Firebase config object
// You can get this from your Firebase console -> Project Settings -> General tab
const firebaseConfig = {
  apiKey: "AIzaSyDFlVbiMMKSOOZHOgFCflsxMOdv-3xvORk",
  authDomain: "casero-app.firebaseapp.com",
  projectId: "casero-app",
  storageBucket: "casero-app.firebasestorage.app",
  messagingSenderId: "853612097033",
  appId: "1:853612097033:web:e654a256c23d978fca52d8",
  measurementId: "G-VVPKMS0QEH",
};

// Validate configuration
const validateConfig = () => {
  const requiredFields = ["apiKey", "authDomain", "projectId"];
  const missing = requiredFields.filter((field) => !firebaseConfig[field as keyof typeof firebaseConfig]);

  if (missing.length > 0) {
    console.error("Missing Firebase configuration fields:", missing);
    throw new Error(`Missing Firebase config: ${missing.join(", ")}`);
  }

  console.log("Firebase configuration validated successfully");
};

// Validate before initialization
validateConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Test the connection
console.log("Firebase initialized with project:", firebaseConfig.projectId);
console.log("Auth domain:", firebaseConfig.authDomain);

export default app;
