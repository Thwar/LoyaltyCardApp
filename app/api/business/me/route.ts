import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCardByBusiness } from "@/lib/serverData";
import { walletConfigured } from "@/lib/googleWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the dashboard needs in one call: business, its card, recent customers.
export async function GET(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ business: null, walletConfigured: walletConfigured() });

    const card = await getLoyaltyCardByBusiness(business.id);

    const snap = await adminDb()
      .collection(COLLECTIONS.CUSTOMER_CARDS)
      .where("businessId", "==", business.id)
      .limit(100)
      .get();
    const customers: CustomerCard[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerCard, "id">) }));
    customers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({
      business,
      card,
      customers: customers.slice(0, 50),
      count: customers.length,
      walletConfigured: walletConfigured(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
