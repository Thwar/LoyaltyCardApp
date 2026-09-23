import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Business, type CustomerCard, type LoyaltyCard } from "@/lib/types";
import { getLoyaltyCard, getBusinessById, countClients, getLoyaltyCardsByBusiness } from "@/lib/serverData";
import { generateUniqueCardCode } from "@/lib/cardCode";
import { walletConfigured, issuePass } from "@/lib/googleWallet";
import { appleConfigured, passDownloadUrl } from "@/lib/appleWallet";
import { effectivePlan } from "@/lib/plans";
import { allowRequest, clientIp } from "@/lib/rateLimit";
import { nameMatches } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// Issue the wallet pass (best-effort) and build the enrollment response.
// `business` is passed in — the caller has already read it for the plan check, and
// re-reading it here cost another Firestore round trip on every enrollment.
async function cardResponse(ref: DocumentReference, customer: CustomerCard, card: LoyaltyCard, existing: boolean, business: Business | null) {
  let saveUrl: string | null = null;
  // Signed: the bare /api/wallet/apple/pass/<id> URL is refused (see that route).
  const applePassUrl = appleConfigured() ? passDownloadUrl(customer.id) : null;
  if (walletConfigured()) {
    try {
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
        applePassUrl,
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
    applePassUrl,
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
    //
    // Fetched together with the business: they're independent, and running them
    // back to back added a whole Firestore round trip to every enrollment.
    const [clientSnap, business] = await Promise.all([
      cardsCol.where("businessId", "==", card.businessId).where("customerEmail", "==", email).get(),
      getBusinessById(card.businessId),
    ]);

    // Resolve the client: reuse their existing id/identity, or mint a new one.
    let customerId: string = randomUUID();
    let clientName = name;
    let clientPhone = phone;
    let clientConsent = marketingConsent;
    if (!clientSnap.empty) {
      const first = clientSnap.docs[0].data() as CustomerCard;

      // This endpoint is public and unauthenticated, and the response below carries
      // the customer's cardCode — the credential a cashier redeems against. Knowing
      // an email address alone must not be enough to pull someone else's card, so
      // the name has to match the one on record too. Legitimate re-enrollment (lost
      // phone, adding a second card) is unaffected: they know their own name.
      if (!nameMatches(name, first.customerName || "")) {
        return NextResponse.json(
          { error: "Ya hay una tarjeta registrada con este correo. Si es tuya, pídesela al negocio." },
          { status: 409 }
        );
      }

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
        return cardResponse(sameCard.ref, customer, card, true, business);
      }
    }

    // Enforce the plan's client cap, but ONLY for genuinely new clients — an existing
    // casero re-opening or adding another card must never be turned away. Free plans
    // cap at maxClients; paid plans have maxClients = null (unlimited).
    //
    // Everything here is skipped entirely on paid plans: resolving the business's live
    // cards costs a Firestore query, and this runs on the enrollment hot path (someone
    // standing at a counter with their phone out).
    const maxClients = business ? effectivePlan(business).maxClients : null;
    if (maxClients != null) {
      // "Existing" means they hold a card that still counts, i.e. one of the
      // business's LIVE cards — the same rule countClients() applies. Skipping the cap
      // for anyone who ever enrolled would let an owner delete a full card and then
      // re-admit every past customer past the limit countClients had just reset.
      const liveCardIds = new Set((await getLoyaltyCardsByBusiness(card.businessId)).map((c) => c.id));
      const countsAlready = clientSnap.docs.some((d) => liveCardIds.has((d.data() as CustomerCard).loyaltyCardId));
      if (!countsAlready && (await countClients(card.businessId, liveCardIds)) >= maxClients) {
        return NextResponse.json(
          { error: "Esta promoción alcanzó su límite de caseros por ahora. Vuelve a intentarlo más tarde.", full: true },
          { status: 403 }
        );
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
    // We only RECORD the referrer here. The stamp is awarded later, when this new
    // customer earns their first real stamp (see /api/stamp) — prevents bogus-email farming.
    const newRef = await cardsCol.add(data);
    const customer: CustomerCard = { id: newRef.id, ...data };
    return cardResponse(newRef, customer, card, false, business);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
