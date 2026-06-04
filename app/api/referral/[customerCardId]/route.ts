import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getLoyaltyCard } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the referral share page (/share/[customerCardId]) reads the referrer's
// name + their card's business so it can build and display the referral link.
export async function GET(_req: Request, ctx: { params: Promise<{ customerCardId: string }> }) {
  try {
    const { customerCardId } = await ctx.params;
    const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(customerCardId).get();
    if (!snap.exists) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
    const c = snap.data() as CustomerCard;

    const card = await getLoyaltyCard(c.loyaltyCardId);
    if (!card) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });

    return NextResponse.json({
      customerName: c.customerName || "",
      businessName: card.businessName,
      cardId: card.id,
      rewardDescription: card.rewardDescription,
      referralCount: c.referralCount || 0,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
