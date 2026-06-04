import { NextResponse } from "next/server";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getBusinessForUser, getLoyaltyCard } from "@/lib/serverData";
import { walletConfigured, syncLoyaltyObject } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { sendApplePassPush } from "@/lib/apns";
import { effectivePlan } from "@/lib/plans";
import { awardReferralStamp } from "@/lib/referral";
import { NOTIF_DEFAULTS, renderNotif } from "@/lib/notifications";

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
    const pre = await cardsCol.where("businessId", "==", business.id).where("cardCode", "==", cardCode).limit(1).get();
    if (pre.empty) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });
    const docRef = pre.docs[0].ref;

    const loyalty = await getLoyaltyCard(pre.docs[0].data().loyaltyCardId);
    if (!loyalty) return NextResponse.json({ error: "Tarjeta de lealtad no encontrada." }, { status: 404 });
    const totalSlots = loyalty.totalSlots;
    // Custom notification templates are a paid feature; free plans get the defaults.
    const paid = effectivePlan(business).paid;
    const tmplStamp = (paid && loyalty.stampMessage) || NOTIF_DEFAULTS.stamp;
    const tmplComplete = (paid && loyalty.completeMessage) || NOTIF_DEFAULTS.complete;
    const tmplRedeem = (paid && loyalty.redeemMessage) || NOTIF_DEFAULTS.redeem;

    // Atomic read-check-write so concurrent stamps (double-tap / scan, owner + cajero
    // at once) can't over-stamp, double-redeem, or double-pay a referral.
    type StampTx =
      | { kind: "full"; current: number }
      | { kind: "ok"; data: DocumentData; newStamps: number; completed: boolean; redeemed: boolean; awardReferral: boolean; eventMessage: string };
    const result = await adminDb().runTransaction<StampTx>(async (t) => {
      const d = (await t.get(docRef)).data() || {};
      if (redeem) {
        const eventMessage = renderNotif(tmplRedeem, 0, totalSlots);
        t.update(docRef, {
          currentStamps: 0,
          isRewardClaimed: false,
          rewardsRedeemed: FieldValue.increment(1),
          lastStampDate: Date.now(),
          appleUpdatedTag: Date.now(),
          lastEvent: eventMessage,
        });
        t.set(adminDb().collection(COLLECTIONS.REWARDS).doc(), {
          customerCardId: docRef.id,
          businessId: business.id,
          loyaltyCardId: loyalty.id,
          cardCode,
          claimedAt: Date.now(),
        });
        return { kind: "ok", data: d, newStamps: 0, completed: false, redeemed: true, awardReferral: false, eventMessage };
      }
      const current = Number(d.currentStamps || 0);
      if (current >= totalSlots) return { kind: "full", current };
      const awardReferral = !!d.referredBy && !d.referralRewarded;
      const newStamps = current + 1;
      const completed = newStamps >= totalSlots;
      const eventMessage = renderNotif(completed ? tmplComplete : tmplStamp, newStamps, totalSlots);
      t.update(docRef, {
        currentStamps: FieldValue.increment(1),
        lastStampDate: Date.now(),
        appleUpdatedTag: Date.now(),
        lastEvent: eventMessage,
        ...(awardReferral ? { referralRewarded: true } : {}),
      });
      t.set(adminDb().collection(COLLECTIONS.STAMPS).doc(), {
        customerCardId: docRef.id,
        businessId: business.id,
        loyaltyCardId: loyalty.id,
        timestamp: Date.now(),
      });
      return { kind: "ok", data: d, newStamps, completed, redeemed: false, awardReferral, eventMessage };
    });

    if (result.kind === "full") {
      return NextResponse.json({ currentStamps: result.current, totalSlots, completed: true, alreadyFull: true });
    }

    const { data, newStamps, completed, redeemed, eventMessage } = result;

    // First real stamp for a referred customer → pay their referrer (once). The
    // referralRewarded flag was flipped inside the transaction, so only the winning
    // stamp reaches here even under concurrency.
    if (result.awardReferral) {
      try {
        await awardReferralStamp(data.referredBy as string, loyalty, data.customerId as string);
      } catch (re) {
        console.error("Referral reward error:", re);
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
