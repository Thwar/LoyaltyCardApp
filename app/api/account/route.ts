import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Member } from "@/lib/types";
import { getBusinessByOwner } from "@/lib/serverData";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { syncAllGooglePasses } from "@/lib/googleNotify";
import { pushMemberPass } from "@/lib/membershipWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function deleteWhere(coll: string, field: string, value: string): Promise<void> {
  const snap = await adminDb().collection(coll).where(field, "==", value).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = adminDb().batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Close the owner's account. Customers' wallet passes are VOIDED (greyed out)
// rather than orphaned: we deactivate the program and scrub customer PII, but
// keep the (now voided) card records so Apple can keep serving the greyed pass.
// The business record and the owner's login are removed.
export async function DELETE(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    // Irreversible: require explicit confirmation in the body, not just the UI gate.
    const body = await req.json().catch(() => ({}));
    if (String(body?.confirm || "").trim().toUpperCase() !== "ELIMINAR") {
      return NextResponse.json({ error: "Confirmación requerida para eliminar la cuenta." }, { status: 400 });
    }

    const business = await getBusinessByOwner(session.uid);
    if (business) {
      const bid = business.id;

      // Deactivate the program(s) so passes rebuild as voided.
      const cards = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", bid).get();
      await Promise.all(cards.docs.map((d) => d.ref.update({ isActive: false })));

      // Scrub PII from customer cards, but keep them so the voided pass still serves.
      const custs = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", bid).get();
      for (let i = 0; i < custs.docs.length; i += 400) {
        const batch = adminDb().batch();
        custs.docs
          .slice(i, i + 400)
          .forEach((d) => batch.update(d.ref, { customerName: "", customerEmail: "", customerPhone: "" }));
        await batch.commit();
      }

      // Push so every customer's pass greys out (both wallets).
      await notifyAllCustomerPasses(bid);
      await syncAllGooglePasses(bid);

      // Memberships get the same treatment as loyalty cards. Without this, a closed
      // gym's members kept a fully ACTIVE-looking pass forever and their name/email/
      // phone stayed in Firestore — while the account screen promises otherwise.
      // Soft-delete the programs FIRST: pushMemberPass re-reads the program, and the
      // pass builder only voids on isActive===false / deletedAt.
      const programs = await adminDb().collection(COLLECTIONS.MEMBERSHIP_PROGRAMS).where("businessId", "==", bid).get();
      await Promise.all(programs.docs.map((d) => d.ref.update({ isActive: false, deletedAt: Date.now() })));

      const members = await adminDb().collection(COLLECTIONS.MEMBERS).where("businessId", "==", bid).get();
      const now = Date.now();
      for (let i = 0; i < members.docs.length; i += 400) {
        const batch = adminDb().batch();
        members.docs
          .slice(i, i + 400)
          .forEach((d) => batch.update(d.ref, { memberName: "", memberEmail: "", memberPhone: "", appleUpdatedTag: now }));
        await batch.commit();
      }
      await Promise.all(
        members.docs.map((d) =>
          pushMemberPass({ id: d.id, ...(d.data() as Omit<Member, "id">), memberName: "", memberEmail: "", memberPhone: "", appleUpdatedTag: now }).catch(() => {})
        )
      );

      // Remove ledgers + the business record (keep the voided customer/loyalty cards
      // and member docs so their greyed passes keep serving).
      await deleteWhere(COLLECTIONS.STAMPS, "businessId", bid);
      await deleteWhere(COLLECTIONS.REWARDS, "businessId", bid);
      await deleteWhere(COLLECTIONS.VISITS, "businessId", bid);

      // Cajero logins would otherwise keep authenticating after the business is gone.
      const staff = await adminDb().collection(COLLECTIONS.STAFF).where("businessId", "==", bid).get();
      for (const d of staff.docs) {
        try {
          await adminAuth().deleteUser(d.id);
        } catch (e) {
          console.error("[account] staff deleteUser failed:", d.id, e);
        }
        await d.ref.delete();
      }

      await adminDb().collection(COLLECTIONS.BUSINESSES).doc(bid).delete();
    }

    // Remove the owner's login last.
    try {
      await adminAuth().deleteUser(session.uid);
    } catch (e) {
      console.error("[account] deleteUser failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
