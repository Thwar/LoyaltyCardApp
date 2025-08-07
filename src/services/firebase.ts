import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFlVbiMMKSOOZHOgFCflsxMOdv-3xvORk",
  authDomain: "casero-app.firebaseapp.com",
  projectId: "casero-app",
  storageBucket: "casero-app.firebasestorage.app",
  messagingSenderId: "853612097033",
  appId: "1:853612097033:web:e654a256c23d978fca52d8",
  measurementId: "G-VVPKMS0QEH",
};

const app = initializeApp(firebaseConfig);

// Initialize auth based on platform
let auth;
if (Platform.OS === "web") {
  // For web, use the default getAuth which handles persistence automatically
  auth = getAuth(app);
} else {
  // For React Native, use initializeAuth with AsyncStorage persistence
  const { getReactNativePersistence } = require("firebase/auth");
  const ReactNativeAsyncStorage = require("@react-native-async-storage/async-storage").default;

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence for better caching
// Note: In React Native, offline persistence is enabled by default
// But we can optimize cache settings
if (Platform.OS === "web") {
  // For web, we need to explicitly enable persistence
  import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code === "unimplemented") {
        console.warn("The current browser does not support all of the features required to enable persistence");
      }
    });
  });
}

export { auth };
export { db };
export const storage = getStorage(app);

// Auth providers for SSO
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Configure providers
googleProvider.addScope("profile");
googleProvider.addScope("email");

export default app;
