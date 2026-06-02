import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessByOwner } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Owner deletes one of their clients (typically after the customer removed their
// wallet pass). Removes the membership card(s) + their stamps, rewards, and Apple
// push registrations. Scoped to the owner's business.
export async function DELETE(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const requested: string[] = Array.isArray(body?.customerCardIds) ? body.customerCardIds.map(String).filter(Boolean) : [];
    if (!requested.length) return NextResponse.json({ error: "Falta el cliente." }, { status: 400 });

    const db = adminDb();

    // Only delete cards that actually belong to this business.
    const owned: string[] = [];
    await Promise.all(
      requested.map(async (id) => {
        const d = await db.collection(COLLECTIONS.CUSTOMER_CARDS).doc(id).get();
        if (d.exists && (d.data() as { businessId?: string }).businessId === business.id) owned.push(id);
      })
    );
    if (!owned.length) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

    // Gather every doc to remove: the membership cards + their ledger + registrations.
    const refs = owned.map((id) => db.collection(COLLECTIONS.CUSTOMER_CARDS).doc(id));
    for (let i = 0; i < owned.length; i += 30) {
      const chunk = owned.slice(i, i + 30);
      const [stamps, rewards, regs] = await Promise.all([
        db.collection(COLLECTIONS.STAMPS).where("customerCardId", "in", chunk).get(),
        db.collection(COLLECTIONS.REWARDS).where("customerCardId", "in", chunk).get(),
        db.collection(COLLECTIONS.APPLE_REGISTRATIONS).where("serialNumber", "in", chunk).get(),
      ]);
      stamps.docs.forEach((d) => refs.push(d.ref));
      rewards.docs.forEach((d) => refs.push(d.ref));
      regs.docs.forEach((d) => refs.push(d.ref));
    }

    for (let i = 0; i < refs.length; i += 400) {
      const batch = db.batch();
      refs.slice(i, i + 400).forEach((r) => batch.delete(r));
      await batch.commit();
    }

    return NextResponse.json({ ok: true, deleted: owned.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
