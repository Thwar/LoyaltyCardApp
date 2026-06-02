import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "./types";
import { walletConfigured, syncLoyaltyClass, syncLoyaltyObject } from "./googleWallet";
import { getLoyaltyCardByBusiness, getBusinessById } from "./serverData";

// Google analog of notifyAllCustomerPasses: after a card edit or a (de)activation,
// PATCH the loyalty class (color/name) and every issued customer object (balance,
// reward, ACTIVE/INACTIVE state). Best-effort and per-object resilient. Google
// syncs the change to each phone on its own — no push server needed.
export async function syncAllGooglePasses(businessId: string): Promise<void> {
  if (!walletConfigured()) return;
  try {
    const card = await getLoyaltyCardByBusiness(businessId);
    if (!card) return;
    const business = await getBusinessById(businessId);
    const cardForPass = { ...card, logoPng: card.logoPng || business?.logoPng };

    try {
      await syncLoyaltyClass(cardForPass);
    } catch (e) {
      console.error("[google sync] class error:", e);
    }

    const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", businessId).get();
    for (const doc of snap.docs) {
      const c: CustomerCard = { id: doc.id, ...(doc.data() as Omit<CustomerCard, "id">) };
      if (!c.googleObjectId) continue; // no Google pass issued for this customer
      try {
        await syncLoyaltyObject(c, cardForPass, undefined, business?.description);
      } catch (e) {
        console.error("[google sync] object error:", c.id, e);
      }
    }
  } catch (e) {
    console.error("[google sync] error:", e);
  }
}
