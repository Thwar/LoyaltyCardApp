"use client";

// Client-side Firebase — used ONLY for business-owner authentication.
// All data reads/writes go through our /api routes (Firebase Admin), so the
// browser never talks to Firestore directly.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedAuth: Auth | undefined;

// Lazily initialize Firebase Auth — ONLY when called (in the browser). This keeps
// Firebase out of the server/static prerender at build time, where env vars or a
// browser context may be absent and getAuth() would otherwise crash the build.
export function getClientAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
}
