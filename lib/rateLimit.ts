import "server-only";
import crypto from "node:crypto";
import { adminDb } from "./firebaseAdmin";

const COLL = "rateLimits";

// Approximate fixed-window rate limiter backed by Firestore (so it holds across
// serverless instances). Fail-OPEN: if the limiter itself errors we allow the
// request rather than block a real customer. Returns true when allowed.
export async function allowRequest(key: string, limit: number, windowMs: number): Promise<boolean> {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200);
  const ref = adminDb().collection(COLL).doc(safeKey);
  const now = Date.now();
  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : null;
      const windowStart = (data?.windowStart as number) || 0;
      const count = (data?.count as number) || 0;
      if (!data || now - windowStart > windowMs) {
        tx.set(ref, { windowStart: now, count: 1 });
        return true;
      }
      if (count >= limit) return false;
      tx.update(ref, { count: count + 1 });
      return true;
    });
  } catch {
    return true; // fail open
  }
}

// Best-effort client IP. Production sits behind a Cloudflare Worker
// (workers/soycasero-proxy.js), so the X-Forwarded-For Vercel sets is a Cloudflare
// address shared by unrelated visitors. The Worker forwards the real one alongside a
// shared secret; trust it only when the secret matches, because caseroapp.vercel.app
// is reachable directly and anyone could send the header themselves.
export function clientIp(req: Request): string {
  const secret = process.env.PROXY_SHARED_SECRET;
  const viaWorker = req.headers.get("x-soycasero-client-ip");
  const given = req.headers.get("x-soycasero-proxy-secret");
  if (secret && viaWorker && given) {
    const a = Buffer.from(given);
    const b = Buffer.from(secret);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return viaWorker.trim();
  }
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
