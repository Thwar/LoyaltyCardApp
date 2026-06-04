import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type Business, type LoyaltyCard, type MembershipProgram, type Member, type Staff } from "./types";

export async function getBusinessByOwner(uid: string): Promise<Business | null> {
  const snap = await adminDb().collection(COLLECTIONS.BUSINESSES).where("ownerId", "==", uid).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Business, "id">) };
}

// A cajero (cashier) login → their staff record (or null if not a cajero).
export async function getStaffByUid(uid: string): Promise<Staff | null> {
  const d = await adminDb().collection(COLLECTIONS.STAFF).doc(uid).get();
  if (!d.exists) return null;
  return d.data() as Staff;
}

// Resolve the business for a logged-in user, whether they're the owner or a cajero.
export async function getBusinessForUser(uid: string): Promise<{ business: Business; role: "owner" | "cajero" } | null> {
  const owned = await getBusinessByOwner(uid);
  if (owned) return { business: owned, role: "owner" };
  const staff = await getStaffByUid(uid);
  if (staff) {
    const business = await getBusinessById(staff.businessId);
    if (business) return { business, role: "cajero" };
  }
  return null;
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const d = await adminDb().collection(COLLECTIONS.BUSINESSES).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<Business, "id">) };
}

// The business's membership program (≤1 in V1), excluding soft-deleted ones.
export async function getMembershipProgramByBusiness(businessId: string): Promise<MembershipProgram | null> {
  const snap = await adminDb().collection(COLLECTIONS.MEMBERSHIP_PROGRAMS).where("businessId", "==", businessId).get();
  const live = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<MembershipProgram, "id">) }))
    .filter((p) => !p.deletedAt)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return live[0] ?? null;
}

export async function getMembershipProgram(id: string): Promise<MembershipProgram | null> {
  const d = await adminDb().collection(COLLECTIONS.MEMBERSHIP_PROGRAMS).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<MembershipProgram, "id">) };
}

export async function getMember(id: string): Promise<Member | null> {
  const d = await adminDb().collection(COLLECTIONS.MEMBERS).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<Member, "id">) };
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

// Distinct clients (caseros) of a business — one person can hold several cards but
// counts once (shared customerId). Used to enforce the free plan's client cap.
export async function countClients(businessId: string): Promise<number> {
  const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", businessId).get();
  const ids = new Set(snap.docs.map((d) => (d.data().customerId as string) || d.id));
  return ids.size;
}

export async function getLoyaltyCard(id: string): Promise<LoyaltyCard | null> {
  const d = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(id).get();
  if (!d.exists) return null;
  return { id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) };
}
