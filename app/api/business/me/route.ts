import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Business, type CustomerCard } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCardsByBusiness, getStaffByUid, getBusinessById } from "@/lib/serverData";
import { walletConfigured } from "@/lib/googleWallet";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the dashboard needs in one call: business, its card, recent customers.
export async function GET(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    // Resolve the business for the owner OR a cajero (cashier) login.
    let business = await getBusinessByOwner(session.uid);
    let role: "owner" | "cajero" = "owner";
    let staffName: string | undefined;
    if (!business) {
      const staff = await getStaffByUid(session.uid);
      if (!staff) return NextResponse.json({ business: null, walletConfigured: walletConfigured() });
      business = await getBusinessById(staff.businessId);
      role = "cajero";
      staffName = staff.name;
      if (!business) return NextResponse.json({ business: null, walletConfigured: walletConfigured() });
    }

    const cards = await getLoyaltyCardsByBusiness(business.id);
    const card = cards[0] ?? null; // primary card (current UI); cards[] is the multi-card foundation
    const liveCardIds = new Set(cards.map((c) => c.id)); // excludes soft-deleted cards

    const snap = await adminDb()
      .collection(COLLECTIONS.CUSTOMER_CARDS)
      .where("businessId", "==", business.id)
      .limit(100)
      .get();
    // Contact (email/phone) is for the OWNER only, and only on a paid plan with the
    // customer's marketing consent. Cajeros never see contact. Stripped server-side.
    const showContact = role === "owner" && effectivePlan(business).paid;
    const customers: CustomerCard[] = snap.docs
      .map((d) => {
        const c: CustomerCard = { id: d.id, ...(d.data() as Omit<CustomerCard, "id">) };
        if (!(showContact && c.marketingConsent === true)) {
          delete c.customerEmail;
          delete c.customerPhone;
        }
        return c;
      })
      .filter((c) => liveCardIds.has(c.loyaltyCardId)); // hide memberships of deleted cards
    customers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Cajeros get a slim business object (no owner email/phone, broadcast history, etc.).
    const businessOut: Business =
      role === "cajero"
        ? ({ id: business.id, name: business.name, ownerId: "", plan: business.plan, planExpiresAt: business.planExpiresAt ?? null } as Business)
        : business;

    return NextResponse.json({
      role,
      staffName,
      business: businessOut,
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
