import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Static description of the data model (mirrors lib/types.ts). Every doc also has
// an implicit `id` (the Firestore document id).
const SCHEMA: { collection: string; label: string; note?: string; fields: { name: string; type: string }[] }[] = [
  {
    collection: COLLECTIONS.BUSINESSES,
    label: "Negocios",
    fields: [
      { name: "name", type: "string" },
      { name: "ownerId", type: "string (Firebase Auth uid)" },
      { name: "ownerEmail?", type: "string" },
      { name: "logoUrl?", type: "string" },
      { name: "plan?", type: '"gratis" | "cafe" | "negocio"' },
      { name: "planExpiresAt?", type: "number (ms) | null" },
      { name: "createdAt?", type: "number (ms)" },
    ],
  },
  {
    collection: COLLECTIONS.LOYALTY_CARDS,
    label: "Tarjetas de lealtad (programas)",
    fields: [
      { name: "businessId", type: "string" },
      { name: "businessName", type: "string" },
      { name: "totalSlots", type: "number" },
      { name: "rewardDescription", type: "string" },
      { name: "cardColor", type: "string (#hex)" },
      { name: "textColor?", type: "string (#hex)" },
      { name: "logoPng?", type: "string (base64)" },
      { name: "isActive", type: "boolean" },
      { name: "createdAt?", type: "number (ms)" },
    ],
  },
  {
    collection: COLLECTIONS.CUSTOMER_CARDS,
    label: "Tarjetas de clientes (membresías)",
    fields: [
      { name: "loyaltyCardId", type: "string" },
      { name: "businessId", type: "string" },
      { name: "customerId", type: "string (id de cliente compartido)" },
      { name: "customerName", type: "string" },
      { name: "customerEmail?", type: "string" },
      { name: "customerPhone?", type: "string" },
      { name: "currentStamps", type: "number" },
      { name: "isRewardClaimed", type: "boolean" },
      { name: "rewardsRedeemed?", type: "number" },
      { name: "cardCode", type: "string (código corto)" },
      { name: "googleObjectId?", type: "string" },
      { name: "appleUpdatedTag?", type: "number" },
      { name: "passActive?", type: "boolean" },
      { name: "passRemovedAt?", type: "number | null" },
      { name: "marketingConsent?", type: "boolean" },
      { name: "createdAt?", type: "number (ms)" },
      { name: "lastStampDate?", type: "number (ms)" },
    ],
  },
  {
    collection: COLLECTIONS.STAMPS,
    label: "Sellos (registro)",
    fields: [
      { name: "customerCardId", type: "string" },
      { name: "businessId", type: "string" },
      { name: "loyaltyCardId", type: "string" },
      { name: "timestamp", type: "number (ms)" },
    ],
  },
  {
    collection: COLLECTIONS.REWARDS,
    label: "Recompensas canjeadas (registro)",
    fields: [
      { name: "customerCardId", type: "string" },
      { name: "businessId", type: "string" },
      { name: "loyaltyCardId", type: "string" },
      { name: "cardCode", type: "string" },
      { name: "claimedAt", type: "number (ms)" },
    ],
  },
  {
    collection: COLLECTIONS.APPLE_REGISTRATIONS,
    label: "Registros Apple Wallet (push)",
    fields: [
      { name: "deviceLibraryIdentifier", type: "string" },
      { name: "passTypeIdentifier", type: "string" },
      { name: "serialNumber", type: "string (= id de membresía)" },
      { name: "pushToken", type: "string" },
      { name: "updatedAt", type: "number (ms)" },
    ],
  },
  {
    collection: COLLECTIONS.USERS,
    label: "Usuarios",
    note: "Heredada del modelo anterior; los clientes ahora son sin cuenta. Normalmente vacía.",
    fields: [],
  },
];

const ALLOWED = new Set(SCHEMA.map((s) => s.collection));

// Long strings (e.g. base64 logos) are clipped so the response stays small.
function clip(v: unknown): unknown {
  if (typeof v === "string" && v.length > 200) return `«${v.length} chars»`;
  return v;
}

async function count(coll: string): Promise<number> {
  try {
    return (await adminDb().collection(coll).count().get()).data().count;
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const collection = url.searchParams.get("collection");

  // Raw document browser for a single collection.
  if (collection) {
    if (!ALLOWED.has(collection)) return NextResponse.json({ error: "Colección no permitida." }, { status: 400 });
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 25, 1), 100);
    const snap = await adminDb().collection(collection).limit(limit).get();
    const docs = snap.docs.map((d) => {
      const data = d.data();
      const clipped: Record<string, unknown> = { id: d.id };
      for (const k of Object.keys(data)) clipped[k] = clip(data[k]);
      return clipped;
    });
    return NextResponse.json({ collection, limit, docs });
  }

  // Default: schema + live counts.
  const counts = await Promise.all(SCHEMA.map((s) => count(s.collection)));
  const collections = SCHEMA.map((s, i) => ({ ...s, count: counts[i] }));
  return NextResponse.json({ collections });
}
