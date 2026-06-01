import "server-only";

// Server-side Firebase Admin. Initialised lazily from a service-account key so
// that client bundles never touch it and missing creds only fail on use.
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

export interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedSa: ServiceAccountJson | null = null;

export function getServiceAccount(): ServiceAccountJson {
  if (cachedSa) return cachedSa;
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!raw || !raw.trim()) {
    throw new Error(
      "GCP_SERVICE_ACCOUNT_KEY is not set. Add the Firebase service-account JSON to .env.local (see SETUP.md)."
    );
  }
  const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  cachedSa = JSON.parse(json) as ServiceAccountJson;
  return cachedSa;
}

let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }
  const sa = getServiceAccount();
  app = initializeApp({
    credential: cert(sa as unknown as ServiceAccount),
    projectId: sa.project_id || process.env.FIREBASE_PROJECT_ID,
  });
  return app;
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
