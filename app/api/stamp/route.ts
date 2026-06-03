import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getBusinessForUser, getLoyaltyCard } from "@/lib/serverData";
import { walletConfigured, syncLoyaltyObject } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { sendApplePassPush } from "@/lib/apns";
import { effectivePlan } from "@/lib/plans";
import { awardReferralStamp } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Business owner adds a stamp (or redeems) by the customer's short code.
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    // Owner OR one of their cajeros may add/redeem stamps.
    const resolved = await getBusinessForUser(session.uid);
    if (!resolved) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const business = resolved.business;

    const body = await req.json().catch(() => ({}));
    const cardCode = String(body.cardCode || "").trim();
    const redeem = body.redeem === true;
    if (!cardCode) return NextResponse.json({ error: "Ingresa el código del cliente." }, { status: 400 });

    const cardsCol = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS);
    const snap = await cardsCol.where("businessId", "==", business.id).where("cardCode", "==", cardCode).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });

    const docRef = snap.docs[0].ref;
    const data = snap.docs[0].data();

    const loyalty = await getLoyaltyCard(data.loyaltyCardId);
    if (!loyalty) return NextResponse.json({ error: "Tarjeta de lealtad no encontrada." }, { status: 404 });
    const totalSlots = loyalty.totalSlots;

    let newStamps: number;
    let completed = false;
    let redeemed = false;
    let eventMessage = "";

    if (redeem) {
      newStamps = 0;
      redeemed = true;
      eventMessage = "🎁 ¡Recompensa canjeada! Tu tarjeta se reinició.";
      await docRef.update({
        currentStamps: 0,
        isRewardClaimed: false,
        rewardsRedeemed: FieldValue.increment(1),
        lastStampDate: Date.now(),
        appleUpdatedTag: Date.now(),
      });
      await adminDb().collection(COLLECTIONS.REWARDS).add({
        customerCardId: docRef.id,
        businessId: business.id,
        loyaltyCardId: loyalty.id,
        cardCode,
        claimedAt: Date.now(),
      });
    } else {
      const current = Number(data.currentStamps || 0);
      if (current >= totalSlots) {
        return NextResponse.json({ currentStamps: current, totalSlots, completed: true, alreadyFull: true });
      }
      newStamps = current + 1;
      completed = newStamps >= totalSlots;
      eventMessage = completed
        ? `¡Tarjeta completa (${newStamps}/${totalSlots})! Ya puedes canjear tu recompensa 🎁`
        : `¡Nuevo sello! Llevas ${newStamps}/${totalSlots}.`;
      await docRef.update({ currentStamps: FieldValue.increment(1), lastStampDate: Date.now(), appleUpdatedTag: Date.now() });
      await adminDb().collection(COLLECTIONS.STAMPS).add({
        customerCardId: docRef.id,
        businessId: business.id,
        loyaltyCardId: loyalty.id,
        timestamp: Date.now(),
      });

      // First real stamp for a referred customer → pay out their referrer (once).
      if (data.referredBy && !data.referralRewarded) {
        try {
          await awardReferralStamp(data.referredBy as string, loyalty, data.customerId as string);
          await docRef.update({ referralRewarded: true });
        } catch (re) {
          console.error("Referral reward error:", re);
        }
      }
    }

    // Best-effort: sync the whole Google Wallet object (balance, "Sellos
    // acumulados", and ACTIVE/INACTIVE) so the lifetime total stays current —
    // not just the balance.
    if (walletConfigured() && data.googleObjectId) {
      try {
        const updated: CustomerCard = {
          ...(data as Omit<CustomerCard, "id">),
          id: docRef.id,
          currentStamps: newStamps,
          rewardsRedeemed: redeemed ? Number(data.rewardsRedeemed || 0) + 1 : Number(data.rewardsRedeemed || 0),
        };
        const cardForPass = { ...loyalty, logoPng: loyalty.logoPng || business.logoPng };
        await syncLoyaltyObject(updated, cardForPass, eventMessage, business.description, effectivePlan(business).removeBranding);
      } catch (we) {
        console.error("Wallet update error:", we);
      }
    }

    // Best-effort: push the update to the customer's Apple Wallet pass.
    if (appleConfigured()) {
      try {
        const regs = await adminDb()
          .collection(COLLECTIONS.APPLE_REGISTRATIONS)
          .where("serialNumber", "==", docRef.id)
          .get();
        await sendApplePassPush(regs.docs.map((d) => d.data().pushToken as string));
      } catch (ae) {
        console.error("Apple push error:", ae);
      }
    }

    return NextResponse.json({
      currentStamps: newStamps,
      totalSlots,
      completed,
      redeemed,
      customerName: data.customerName || "",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
