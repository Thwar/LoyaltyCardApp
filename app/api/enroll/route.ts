import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard, type LoyaltyCard } from "@/lib/types";
import { getLoyaltyCard } from "@/lib/serverData";
import { generateUniqueCardCode } from "@/lib/cardCode";
import { walletConfigured, issuePass } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { allowRequest, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Issue the wallet pass (best-effort) and build the enrollment response.
async function cardResponse(ref: DocumentReference, customer: CustomerCard, card: LoyaltyCard, existing: boolean) {
  let saveUrl: string | null = null;
  if (walletConfigured()) {
    try {
      const issued = await issuePass(customer, card);
      saveUrl = issued.saveUrl;
      if (!customer.googleObjectId) await ref.update({ googleObjectId: issued.objectId });
    } catch (we) {
      console.error("Wallet issue error:", we);
      return NextResponse.json({
        cardCode: customer.cardCode,
        customerCardId: customer.id,
        saveUrl: null,
        walletConfigured: true,
        appleConfigured: appleConfigured(),
        existing,
        walletError: we instanceof Error ? we.message : "Error de Wallet",
      });
    }
  }
  return NextResponse.json({
    cardCode: customer.cardCode,
    customerCardId: customer.id,
    saveUrl,
    walletConfigured: walletConfigured(),
    appleConfigured: appleConfigured(),
    existing,
  });
}

// Public: a customer enrolls from /join/[cardId]. One card per email per business.
export async function POST(req: Request) {
  try {
    // Public + unauthenticated, and each new enrollment hits the wallet APIs, so
    // cap per-IP to blunt scripted abuse. Generous window (a busy café shares one
    // Wi-Fi IP); fail-open so a limiter hiccup never blocks a real customer.
    if (!(await allowRequest(`enroll:${clientIp(req)}`, 30, 10 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const loyaltyCardId = String(body.loyaltyCardId || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();

    if (!loyaltyCardId) return NextResponse.json({ error: "Falta la tarjeta." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Tu nombre es obligatorio." }, { status: 400 });
    if (!email) return NextResponse.json({ error: "El correo electrónico es obligatorio." }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });

    const card = await getLoyaltyCard(loyaltyCardId);
    if (!card || !card.isActive) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });

    const cardsCol = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS);

    // One card per email per business: if this email already has a card, return it.
    const existingSnap = await cardsCol
      .where("businessId", "==", card.businessId)
      .where("customerEmail", "==", email)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      const customer: CustomerCard = { id: doc.id, ...(doc.data() as Omit<CustomerCard, "id">) };
      return cardResponse(doc.ref, customer, card, true);
    }

    // Otherwise create a new card with the welcome stamp.
    const cardCode = await generateUniqueCardCode(async (code) => {
      const s = await cardsCol.where("businessId", "==", card.businessId).where("cardCode", "==", code).limit(1).get();
      return !s.empty;
    });

    const data = {
      loyaltyCardId,
      businessId: card.businessId,
      customerId: randomUUID(),
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      currentStamps: 1, // welcome stamp
      isRewardClaimed: false,
      cardCode,
      createdAt: Date.now(),
      lastStampDate: Date.now(),
      appleUpdatedTag: Date.now(),
    };
    const ref = await cardsCol.add(data);
    const customer: CustomerCard = { id: ref.id, ...data };
    return cardResponse(ref, customer, card, false);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
