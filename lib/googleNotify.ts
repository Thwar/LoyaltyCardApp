import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type CustomerCard, type LoyaltyCard } from "./types";
import { walletConfigured, syncLoyaltyClass, syncLoyaltyObject } from "./googleWallet";
import { getLoyaltyCardsByBusiness, getLoyaltyCard, getBusinessById } from "./serverData";
import { effectivePlan } from "./plans";

const CHUNK = 15;

// Google analog of notifyAllCustomerPasses: after a card edit or a (de)activation,
// PATCH the loyalty class (color/name) and every issued customer object (balance,
// reward, ACTIVE/INACTIVE state). Best-effort and per-object resilient. Google
// syncs the change to each phone on its own — no push server needed.
//
// Each customer is synced against THEIR OWN card, never the business's primary one:
// a business can hold several cards, and writing card A's reward text, slot count
// and active state onto a card-B holder's pass would silently no-op the owner's
// action (or void a live program). `cardId` names a card that may already be
// soft-deleted — the delete flow calls this while voiding, and soft-deleted cards
// are excluded from getLoyaltyCardsByBusiness.
export async function syncAllGooglePasses(businessId: string, cardId?: string): Promise<void> {
  if (!walletConfigured()) return;
  try {
    const business = await getBusinessById(businessId);
    const hideBranding = business ? effectivePlan(business).removeBranding : false;
    const withLogo = (c: LoyaltyCard) => ({ ...c, logoPng: c.logoPng || business?.logoPng });

    const cardMap = new Map<string, LoyaltyCard>();
    for (const c of await getLoyaltyCardsByBusiness(businessId)) cardMap.set(c.id, withLogo(c));
    if (cardId && !cardMap.has(cardId)) {
      const target = await getLoyaltyCard(cardId);
      if (target && target.businessId === businessId) cardMap.set(target.id, withLogo(target));
    }
    if (!cardMap.size) return;

    // Refresh the class (name/colour/logo) of every card we're about to touch.
    for (const card of cardMap.values()) {
      try {
        await syncLoyaltyClass(card);
      } catch (e) {
        console.error("[google sync] class error:", card.id, e);
      }
    }

    const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", businessId).get();
    const pending = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerCard, "id">) }))
      // No Google pass issued, or the holder's card isn't one we resolved — skip
      // rather than fall back to another card and corrupt their pass.
      .filter((c) => c.googleObjectId && cardMap.has(c.loyaltyCardId));

    // Chunked instead of one-at-a-time: this runs inline in the deactivate/delete
    // request, so a business with hundreds of customers used to serialise hundreds
    // of round-trips to Google before the owner got a response.
    for (let i = 0; i < pending.length; i += CHUNK) {
      await Promise.all(
        pending.slice(i, i + CHUNK).map((c) =>
          syncLoyaltyObject(c, cardMap.get(c.loyaltyCardId)!, undefined, business?.description, hideBranding).catch((e) =>
            console.error("[google sync] object error:", c.id, e)
          )
        )
      );
    }
  } catch (e) {
    console.error("[google sync] error:", e);
  }
}
