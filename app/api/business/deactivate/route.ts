import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCard, getLoyaltyCardByBusiness } from "@/lib/serverData";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { syncAllGooglePasses } from "@/lib/googleNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deactivate (void) or reactivate the business's program. Deactivating greys out
// every customer's wallet pass; reactivating restores them.
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const active = body.active === true;
    const cardId = typeof body.cardId === "string" ? body.cardId : "";

    // Target a specific card (multi-card) or fall back to the business's only card.
    const card = cardId ? await getLoyaltyCard(cardId) : await getLoyaltyCardByBusiness(business.id);
    if (!card || card.businessId !== business.id) {
      return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
    }

    await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(card.id).update({ isActive: active });
    await notifyAllCustomerPasses(business.id); // Apple: grey out / restore customers' passes
    await syncAllGooglePasses(business.id); // Google: set objects INACTIVE / ACTIVE

    return NextResponse.json({ isActive: active });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
