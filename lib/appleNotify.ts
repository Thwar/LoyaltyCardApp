import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS } from "./types";
import { appleConfigured } from "./appleWallet";
import { sendApplePassPush } from "./apns";

// Bump every customer pass for a business and push so Apple Wallet re-fetches
// the rebuilt pass. Used after a card edit, a deactivation, or account deletion.
// Fine for prototype customer counts; move to a queue at scale.
export async function notifyAllCustomerPasses(businessId: string): Promise<void> {
  if (!appleConfigured()) return;
  try {
    const custSnap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", businessId).get();
    if (custSnap.empty) return;

    const now = Date.now();
    for (let i = 0; i < custSnap.docs.length; i += 400) {
      const batch = adminDb().batch();
      custSnap.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { appleUpdatedTag: now }));
      await batch.commit();
    }

    const serials = custSnap.docs.map((d) => d.id);
    const tokens: string[] = [];
    for (let i = 0; i < serials.length; i += 30) {
      const regs = await adminDb()
        .collection(COLLECTIONS.APPLE_REGISTRATIONS)
        .where("serialNumber", "in", serials.slice(i, i + 30))
        .get();
      regs.docs.forEach((r) => {
        const t = r.data().pushToken as string | undefined;
        if (t) tokens.push(t);
      });
    }
    await sendApplePassPush(tokens);
  } catch (e) {
    console.error("[apple notify] error:", e);
  }
}
