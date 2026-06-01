"use client";
import { getClientAuth } from "./firebaseClient";

// fetch() that attaches the current business owner's Firebase ID token.
export async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const user = getClientAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...options, headers });
}
