import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, GoogleAuthProvider, FacebookAuthProvider, Auth } from "firebase/auth";
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import { env } from "../../config/env";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY,
  authDomain: env.FIREBASE_AUTH_DOMAIN,
  projectId: env.FIREBASE_PROJECT_ID,
  storageBucket: env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
  appId: env.FIREBASE_APP_ID,
  measurementId: env.FIREBASE_MEASUREMENT_ID,
};

// Guarded initialization to prevent duplicate app errors
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Initialize auth based on platform
let auth: Auth;
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
      } else {
        console.warn("Failed to enable IndexedDB persistence:", err);
      }
    });
  });

  // Monitor Firestore connection state
  import("firebase/firestore").then(({ enableNetwork, disableNetwork }) => {
    // Handle online/offline events
    window.addEventListener("online", async () => {
      console.log("Network online - enabling Firestore network");
      try {
        await enableNetwork(db);
      } catch (error) {
        console.warn("Failed to enable Firestore network:", error);
      }
    });

    window.addEventListener("offline", async () => {
      console.log("Network offline - disabling Firestore network");
      try {
        await disableNetwork(db);
      } catch (error) {
        console.warn("Failed to disable Firestore network:", error);
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

// // Configure Facebook provider
// facebookProvider.addScope("email");
// facebookProvider.addScope("public_profile");
// facebookProvider.setCustomParameters({
//   display: 'popup'
// });

export default app;
