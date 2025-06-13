import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
