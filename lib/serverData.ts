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

// Primary (oldest non-deleted) card. Soft-deleted cards are excluded.
export async function getLoyaltyCardByBusiness(businessId: string): Promise<LoyaltyCard | null> {
  const cards = await getLoyaltyCardsByBusiness(businessId);
  return cards[0] ?? null;
}

// All of a business's loyalty cards (oldest first = primary), excluding soft-deleted
// ones. Deleted cards stay in Firestore (voided) so existing passes keep serving via
// getLoyaltyCard(id), but they no longer show up for the owner or count toward limits.
export async function getLoyaltyCardsByBusiness(businessId: string): Promise<LoyaltyCard[]> {
  const snap = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", businessId).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) }))
    .filter((c) => !c.deletedAt)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function getLoyaltyCard(id: string): Promise<LoyaltyCard | null> {
  const d = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) };
}
