import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type Business, type LoyaltyCard } from "./types";

export async function getBusinessByOwner(uid: string): Promise<Business | null> {
  const snap = await adminDb().collection(COLLECTIONS.BUSINESSES).where("ownerId", "==", uid).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Business, "id">) };
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const d = await adminDb().collection(COLLECTIONS.BUSINESSES).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<Business, "id">) };
}

export async function getLoyaltyCardByBusiness(businessId: string): Promise<LoyaltyCard | null> {
  const snap = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", businessId).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) };
}

// All of a business's loyalty cards (oldest first = primary). One today, but the
// data layer is ready for multi-card (negocio plan).
export async function getLoyaltyCardsByBusiness(businessId: string): Promise<LoyaltyCard[]> {
  const snap = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", businessId).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function getLoyaltyCard(id: string): Promise<LoyaltyCard | null> {
  const d = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) };
}
