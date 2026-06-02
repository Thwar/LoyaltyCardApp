import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Business, type CustomerCard, type LoyaltyCard } from "@/lib/types";
import { effectivePlan, getPlan, type PlanId } from "@/lib/plans";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { syncAllGooglePasses } from "@/lib/googleNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Delete every doc in `coll` where `field == value`, in batches of 400.
async function deleteWhere(coll: string, field: string, value: string): Promise<number> {
  const snap = await adminDb().collection(coll).where(field, "==", value).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = adminDb().batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

// GET — full detail for one business: its cards + clients.
export async function GET(req: Request, ctx: Ctx) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.res;
  const { id } = await ctx.params;

  const db = adminDb();
  const bizDoc = await db.collection(COLLECTIONS.BUSINESSES).doc(id).get();
  if (!bizDoc.exists) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
  const business = { id, ...(bizDoc.data() as Omit<Business, "id">) };

  const [cardSnap, custSnap] = await Promise.all([
    db.collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", id).get(),
    db.collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", id).get(),
  ]);

  let ownerEmail = business.ownerEmail ?? null;
  if (!ownerEmail && business.ownerId) {
    try {
      ownerEmail = (await adminAuth().getUser(business.ownerId)).email ?? null;
    } catch {
      /* owner may have been removed */
    }
  }

  const cards = cardSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LoyaltyCard, "id">) }))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const customers = custSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerCard, "id">) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return NextResponse.json({
    business: { ...business, ownerEmail, effectivePlan: effectivePlan(business).id },
    cards,
    customers,
  });
}

// PATCH — set plan + expiration (god-mode billing-by-hand).
export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.res;
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));

  // Reset ONLY the rate-limit timer (keep the message history): mark "now" so
  // broadcasts at/before it no longer count toward the daily limit.
  if (body?.resetBroadcastTimer === true) {
    const ref = adminDb().collection(COLLECTIONS.BUSINESSES).doc(id);
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    await ref.update({ broadcastRateResetAt: Date.now() });
    return NextResponse.json({ ok: true, reset: "timer" });
  }
  // Clear the broadcast message history (the displayed log).
  if (body?.resetBroadcastHistory === true) {
    const ref = adminDb().collection(COLLECTIONS.BUSINESSES).doc(id);
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
    await ref.update({ broadcastHistory: [] });
    return NextResponse.json({ ok: true, reset: "history" });
  }

  const plan = String(body?.plan || "") as PlanId;
  if (!getPlan(plan) || !["gratis", "cafe", "negocio"].includes(plan)) {
    return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  }
  const rawExp = body?.planExpiresAt;
  const exp = rawExp == null || rawExp === "" ? null : Number(rawExp);
  // Free plans never carry an expiry; paid plans keep one only if it's a valid future-ish number.
  const planExpiresAt = plan === "gratis" ? null : Number.isFinite(exp) ? exp : null;

  const ref = adminDb().collection(COLLECTIONS.BUSINESSES).doc(id);
  if (!(await ref.get()).exists) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
  await ref.update({ plan, planExpiresAt });
  return NextResponse.json({ ok: true, plan, planExpiresAt });
}

// DELETE — remove a business, greying out customers' wallet passes the same way
// program-deactivation does. We first set the program(s) inactive and push so the
// passes rebuild as VOIDED; Apple needs the card record to keep serving that voided
// pass, so we KEEP the (now scrubbed) cards rather than nuke them. Then we scrub
// customer PII and delete the ledgers + the business record. Requires the business
// name typed back. Leaves the owner's Firebase Auth login intact (per the chosen scope).
export async function DELETE(req: Request, ctx: Ctx) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.res;
  const { id } = await ctx.params;

  const db = adminDb();
  const bizDoc = await db.collection(COLLECTIONS.BUSINESSES).doc(id).get();
  if (!bizDoc.exists) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
  const business = bizDoc.data() as Omit<Business, "id">;

  const body = await req.json().catch(() => ({}));
  const confirm = String(body?.confirm || "").trim();
  if (confirm.toLowerCase() !== (business.name || "").trim().toLowerCase()) {
    return NextResponse.json(
      { error: `Para eliminar, escribe el nombre exacto del negocio: "${business.name}".` },
      { status: 400 }
    );
  }

  // 1. Deactivate the program(s) so the passes rebuild as voided (greyed out).
  const cards = await db.collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", id).get();
  await Promise.all(cards.docs.map((d) => d.ref.update({ isActive: false })));

  // 2. Scrub customer PII, but KEEP the (now voided) cards so the greyed pass keeps serving.
  const custs = await db.collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", id).get();
  for (let i = 0; i < custs.docs.length; i += 400) {
    const batch = db.batch();
    custs.docs
      .slice(i, i + 400)
      .forEach((d) => batch.update(d.ref, { customerName: "", customerEmail: "", customerPhone: "" }));
    await batch.commit();
  }

  // 3. Push the grey-out to both wallets (best-effort — never block the delete).
  try {
    await notifyAllCustomerPasses(id); // Apple APNs
  } catch (e) {
    console.error("[admin delete] apple push:", e);
  }
  try {
    await syncAllGooglePasses(id); // Google object state -> INACTIVE
  } catch (e) {
    console.error("[admin delete] google sync:", e);
  }

  // 4. Remove the ledgers + the business record (keep the voided customer/loyalty cards).
  const deleted = {
    stamps: await deleteWhere(COLLECTIONS.STAMPS, "businessId", id),
    rewards: await deleteWhere(COLLECTIONS.REWARDS, "businessId", id),
  };
  await db.collection(COLLECTIONS.BUSINESSES).doc(id).delete();

  return NextResponse.json({ ok: true, deactivatedCards: cards.size, voidedCustomers: custs.size, deleted });
}
