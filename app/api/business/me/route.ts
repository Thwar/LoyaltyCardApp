import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCardsByBusiness } from "@/lib/serverData";
import { walletConfigured } from "@/lib/googleWallet";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the dashboard needs in one call: business, its card, recent customers.
export async function GET(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ business: null, walletConfigured: walletConfigured() });

    const cards = await getLoyaltyCardsByBusiness(business.id);
    const card = cards[0] ?? null; // primary card (current UI); cards[] is the multi-card foundation
    const liveCardIds = new Set(cards.map((c) => c.id)); // excludes soft-deleted cards

    const snap = await adminDb()
      .collection(COLLECTIONS.CUSTOMER_CARDS)
      .where("businessId", "==", business.id)
      .limit(100)
      .get();
    // Customer contact is gated: only paid plans (café/negocio) AND customers who
    // opted in to marketing may have their email/phone surfaced. Strip them
    // server-side so hidden contact never reaches the dashboard. We keep
    // marketingConsent so the UI can explain *why* contact is hidden.
    const paid = effectivePlan(business).paid;
    const customers: CustomerCard[] = snap.docs
      .map((d) => {
        const c: CustomerCard = { id: d.id, ...(d.data() as Omit<CustomerCard, "id">) };
        if (!(paid && c.marketingConsent === true)) {
          delete c.customerEmail;
          delete c.customerPhone;
        }
        return c;
      })
      .filter((c) => liveCardIds.has(c.loyaltyCardId)); // hide memberships of deleted cards
    customers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      business,
      card,
      cards,
      customers,
      count: new Set(customers.map((c) => c.customerId || c.id)).size, // distinct clients, not memberships
      walletConfigured: walletConfigured(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
