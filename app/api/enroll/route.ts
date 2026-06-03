import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard, type LoyaltyCard } from "@/lib/types";
import { getLoyaltyCard, getBusinessById } from "@/lib/serverData";
import { generateUniqueCardCode } from "@/lib/cardCode";
import { walletConfigured, issuePass, syncLoyaltyObject } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { sendApplePassPush } from "@/lib/apns";
import { effectivePlan } from "@/lib/plans";
import { allowRequest, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Issue the wallet pass (best-effort) and build the enrollment response.
async function cardResponse(ref: DocumentReference, customer: CustomerCard, card: LoyaltyCard, existing: boolean) {
  let saveUrl: string | null = null;
  if (walletConfigured()) {
    try {
      const business = await getBusinessById(card.businessId);
      const cardForPass = { ...card, logoPng: card.logoPng || business?.logoPng };
      const issued = await issuePass(customer, cardForPass, business?.description, business ? effectivePlan(business).removeBranding : false);
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

// Referral reward: when a NEW customer enrolls via someone's ?ref link, that
// referrer earns one stamp on the same card. Best-effort — never blocks the enroll.
async function awardReferral(referrerId: string, card: LoyaltyCard, newClientId: string) {
  const cardsCol = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS);
  const snap = await cardsCol.doc(referrerId).get();
  if (!snap.exists) return;
  const ref = snap.data() as CustomerCard;
  // Must be a real customer of THIS card, and not the same person referring themselves.
  if (ref.businessId !== card.businessId || ref.loyaltyCardId !== card.id || ref.customerId === newClientId) return;
  const current = Number(ref.currentStamps || 0);
  if (current >= card.totalSlots) return; // card already complete — nothing to add

  const next = Math.min(current + 1, card.totalSlots);
  await snap.ref.update({
    currentStamps: next,
    lastStampDate: Date.now(),
    referralCount: FieldValue.increment(1),
    appleUpdatedTag: Date.now(),
  });

  const business = await getBusinessById(card.businessId);
  const message = "🎉 ¡Ganaste un sello por invitar a un amigo!";
  if (walletConfigured() && ref.googleObjectId) {
    try {
      const updated: CustomerCard = { ...ref, id: snap.id, currentStamps: next };
      const cardForPass = { ...card, logoPng: card.logoPng || business?.logoPng };
      await syncLoyaltyObject(updated, cardForPass, message, business?.description, business ? effectivePlan(business).removeBranding : false);
    } catch (e) {
      console.error("[referral] google:", e);
    }
  }
  if (appleConfigured()) {
    try {
      const regs = await cardsCol.firestore.collection(COLLECTIONS.APPLE_REGISTRATIONS).where("serialNumber", "==", snap.id).get();
      await sendApplePassPush(regs.docs.map((d) => d.data().pushToken as string));
    } catch (e) {
      console.error("[referral] apple:", e);
    }
  }
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
    const marketingConsent = body.marketingConsent === true;
    const referrerId = String(body.ref || "").trim();

    if (!loyaltyCardId) return NextResponse.json({ error: "Falta la tarjeta." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Tu nombre es obligatorio." }, { status: 400 });
    if (!email) return NextResponse.json({ error: "El correo electrónico es obligatorio." }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });

    const card = await getLoyaltyCard(loyaltyCardId);
    if (!card || !card.isActive) return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });

    const cardsCol = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS);

    // All of this email's cards at this business belong to ONE client (the same
    // person can hold multiple cards), linked by a shared customerId + identity —
    // re-enrolling never creates a duplicate client.
    const clientSnap = await cardsCol
      .where("businessId", "==", card.businessId)
      .where("customerEmail", "==", email)
      .get();

    // Resolve the client: reuse their existing id/identity, or mint a new one.
    let customerId: string = randomUUID();
    let clientName = name;
    let clientPhone = phone;
    let clientConsent = marketingConsent;
    if (!clientSnap.empty) {
      const first = clientSnap.docs[0].data() as CustomerCard;
      customerId = first.customerId || customerId;
      clientName = first.customerName || name;
      clientPhone = first.customerPhone || phone;
      clientConsent = first.marketingConsent === true || marketingConsent; // consent is sticky per client

      // Already enrolled in THIS card? Return it (honoring a re-opt-in).
      const sameCard = clientSnap.docs.find((d) => (d.data() as CustomerCard).loyaltyCardId === loyaltyCardId);
      if (sameCard) {
        if (clientConsent && sameCard.data().marketingConsent !== true) {
          await sameCard.ref.update({ marketingConsent: true });
        }
        const customer: CustomerCard = { id: sameCard.id, ...(sameCard.data() as Omit<CustomerCard, "id">) };
        return cardResponse(sameCard.ref, customer, card, true);
      }
    }

    // New membership (= this card) for the client, with the welcome stamp.
    const cardCode = await generateUniqueCardCode(async (code) => {
      const s = await cardsCol.where("businessId", "==", card.businessId).where("cardCode", "==", code).limit(1).get();
      return !s.empty;
    });

    const data = {
      loyaltyCardId,
      businessId: card.businessId,
      customerId,
      customerName: clientName,
      customerEmail: email,
      customerPhone: clientPhone,
      currentStamps: 1, // welcome stamp
      isRewardClaimed: false,
      marketingConsent: clientConsent,
      cardCode,
      createdAt: Date.now(),
      lastStampDate: Date.now(),
      appleUpdatedTag: Date.now(),
      ...(referrerId ? { referredBy: referrerId } : {}),
    };
    const newRef = await cardsCol.add(data);
    const customer: CustomerCard = { id: newRef.id, ...data };
    if (referrerId) {
      try {
        await awardReferral(referrerId, card, customerId);
      } catch (e) {
        console.error("[referral] award:", e);
      }
    }
    return cardResponse(newRef, customer, card, false);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
