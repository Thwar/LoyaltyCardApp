import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCard } from "@/lib/serverData";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { syncAllGooglePasses } from "@/lib/googleNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function deleteWhere(coll: string, field: string, value: string): Promise<number> {
  const snap = await adminDb().collection(coll).where(field, "==", value).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = adminDb().batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

// Permanently remove a loyalty card. We first void it + push the grey-out (while
// the card is still resolvable, so customers' passes finalize correctly), then
// mark it deletedAt so it disappears from the dashboard and frees the plan slot.
// The card + customer docs are KEPT (voided) so those greyed passes keep serving —
// same reason the admin hard-delete keeps voided cards. The stamp/reward ledgers
// for the card are dropped.
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const cardId = typeof body.cardId === "string" ? body.cardId : "";
    const card = await getLoyaltyCard(cardId);
    if (!card || card.businessId !== business.id) {
      return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
    }

    const ref = adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(card.id);

    // 1. Void + push the grey-out while the card is still resolvable.
    await ref.update({ isActive: false });
    try {
      await notifyAllCustomerPasses(business.id); // Apple: grey out customers' passes
    } catch (e) {
      console.error("[card delete] apple push:", e);
    }
    try {
      await syncAllGooglePasses(business.id); // Google: set objects INACTIVE
    } catch (e) {
      console.error("[card delete] google sync:", e);
    }

    // 2. Hide from the owner + free the plan slot (keep the voided card serving passes).
    await ref.update({ deletedAt: Date.now() });

    // 3. Drop the card's stamp/reward ledgers.
    const removed = {
      stamps: await deleteWhere(COLLECTIONS.STAMPS, "loyaltyCardId", card.id),
      rewards: await deleteWhere(COLLECTIONS.REWARDS, "loyaltyCardId", card.id),
    };

    return NextResponse.json({ ok: true, removed });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
