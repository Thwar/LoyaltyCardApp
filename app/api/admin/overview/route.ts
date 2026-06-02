import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Business, type CustomerCard, type LoyaltyCard } from "@/lib/types";
import { effectivePlan, getPlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function count(coll: string): Promise<number> {
  try {
    const s = await adminDb().collection(coll).count().get();
    return s.data().count;
  } catch {
    return 0;
  }
}

// God-mode overview: system-wide totals + every business with its plan + stats.
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.res;

  const db = adminDb();
  const [bizSnap, cardSnap, custSnap, stamps, rewards, appleRegs] = await Promise.all([
    db.collection(COLLECTIONS.BUSINESSES).get(),
    db.collection(COLLECTIONS.LOYALTY_CARDS).get(),
    db.collection(COLLECTIONS.CUSTOMER_CARDS).get(),
    count(COLLECTIONS.STAMPS),
    count(COLLECTIONS.REWARDS),
    count(COLLECTIONS.APPLE_REGISTRATIONS),
  ]);

  const cards = cardSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) }));
  const custs = custSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerCard, "id">) }));
  const slotsByCard = new Map(cards.map((c) => [c.id, c.totalSlots || 0]));
  const clientKey = (c: CustomerCard) => c.customerId || c.id;

  // Owner emails (prefer the stored value; fall back to the auth record).
  const ownerEmails = await Promise.all(
    bizSnap.docs.map(async (d) => {
      const b = d.data() as Omit<Business, "id">;
      if (b.ownerEmail) return b.ownerEmail;
      try {
        return (await adminAuth().getUser(b.ownerId)).email || null;
      } catch {
        return null;
      }
    })
  );

  const businesses = bizSnap.docs
    .map((d, i) => {
      const b = { id: d.id, ...(d.data() as Omit<Business, "id">) };
      const bizCusts = custs.filter((c) => c.businessId === b.id);
      const base = getPlan(b.plan);
      const eff = effectivePlan(b);
      return {
        id: b.id,
        name: b.name,
        ownerEmail: ownerEmails[i],
        createdAt: b.createdAt ?? null,
        plan: eff.id,
        planLabel: eff.label,
        storedPlan: base.id,
        planExpiresAt: b.planExpiresAt ?? null,
        expired: base.paid && eff.id === "gratis",
        stats: {
          clients: new Set(bizCusts.map(clientKey)).size,
          cards: cards.filter((c) => c.businessId === b.id).length,
          memberships: bizCusts.length,
          redemptions: bizCusts.reduce((s, c) => s + (c.rewardsRedeemed || 0), 0),
          stampsGiven: bizCusts.reduce(
            (s, c) => s + (c.rewardsRedeemed || 0) * (slotsByCard.get(c.loyaltyCardId) || 0) + (c.currentStamps || 0),
            0
          ),
        },
      };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return NextResponse.json({
    totals: {
      businesses: bizSnap.size,
      clients: new Set(custs.map(clientKey)).size,
      memberships: custSnap.size,
      cards: cardSnap.size,
      stamps,
      rewards,
      appleRegistrations: appleRegs,
    },
    businesses,
  });
}
