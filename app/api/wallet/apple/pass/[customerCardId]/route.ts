import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getLoyaltyCard, getBusinessById } from "@/lib/serverData";
import { appleConfigured, buildPkpass } from "@/lib/appleWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: returns the signed .pkpass for a customer card. The /join page links
// here so the customer can add the card to Apple Wallet on their iPhone.
export async function GET(_req: Request, ctx: { params: Promise<{ customerCardId: string }> }) {
  try {
    if (!appleConfigured()) {
      return NextResponse.json({ error: "Apple Wallet no está configurado." }, { status: 503 });
    }
    const { customerCardId } = await ctx.params;

    const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(customerCardId).get();
    if (!snap.exists) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
    const customer: CustomerCard = { id: snap.id, ...(snap.data() as Omit<CustomerCard, "id">) };

    const card = await getLoyaltyCard(customer.loyaltyCardId);
    if (!card) return NextResponse.json({ error: "Programa no encontrado." }, { status: 404 });

    const business = await getBusinessById(card.businessId);
    const cardForPass = { ...card, logoPng: card.logoPng || business?.logoPng };
    const buffer = await buildPkpass(customer, cardForPass, business?.description);
    const safeName = (card.businessName || "tarjeta").replace(/[^a-z0-9]/gi, "_");
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${safeName}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    console.error("[apple] pass generation error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
