import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type CustomerCard, type LoyaltyCard } from "./types";
import { getBusinessById } from "./serverData";
import { walletConfigured, syncLoyaltyObject } from "./googleWallet";
import { appleConfigured } from "./appleWallet";
import { sendApplePassPush } from "./apns";
import { effectivePlan } from "./plans";

// Give the referrer one stamp — called when the customer THEY referred earns their
// first real (business-added) stamp. This is what prevents bogus-email farming:
// a fake signup that never visits never triggers a payout. Best-effort.
export async function awardReferralStamp(referrerId: string, card: LoyaltyCard, referredClientId: string) {
  const cardsCol = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS);
  const snap = await cardsCol.doc(referrerId).get();
  if (!snap.exists) return;
  const ref = snap.data() as CustomerCard;
  // Must be a real customer of THIS card, and not the same person.
  if (ref.businessId !== card.businessId || ref.loyaltyCardId !== card.id || ref.customerId === referredClientId) return;
  const current = Number(ref.currentStamps || 0);
  if (current >= card.totalSlots) return; // card already complete

  const next = Math.min(current + 1, card.totalSlots);
  await snap.ref.update({
    currentStamps: next,
    lastStampDate: Date.now(),
    referralCount: FieldValue.increment(1),
    appleUpdatedTag: Date.now(),
  });

  const business = await getBusinessById(card.businessId);
  if (walletConfigured() && ref.googleObjectId) {
    try {
      const updated: CustomerCard = { ...ref, id: snap.id, currentStamps: next };
      const cardForPass = { ...card, logoPng: card.logoPng || business?.logoPng };
      await syncLoyaltyObject(updated, cardForPass, "🎉 ¡Ganaste un sello por invitar a un amigo!", business?.description, business ? effectivePlan(business).removeBranding : false);
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
