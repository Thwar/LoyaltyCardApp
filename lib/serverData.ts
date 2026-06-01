import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type Business, type LoyaltyCard } from "./types";

export async function getBusinessByOwner(uid: string): Promise<Business | null> {
  const snap = await adminDb().collection(COLLECTIONS.BUSINESSES).where("ownerId", "==", uid).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Business, "id">) };
}

export async function getLoyaltyCardByBusiness(businessId: string): Promise<LoyaltyCard | null> {
  const snap = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", businessId).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) };
}

export async function getLoyaltyCard(id: string): Promise<LoyaltyCard | null> {
  const d = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) };
}
