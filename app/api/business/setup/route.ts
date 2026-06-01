import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessByOwner } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create (or rename) the owner's business. Called right after signup.
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const body = await req.json().catch(() => ({}));
    const name = String(body.businessName || "").trim();
    if (!name) return NextResponse.json({ error: "El nombre del negocio es obligatorio." }, { status: 400 });

    const existing = await getBusinessByOwner(session.uid);
    if (existing) {
      await adminDb().collection(COLLECTIONS.BUSINESSES).doc(existing.id).update({ name });
      // Keep the denormalized name on the loyalty card(s) in sync so the dashboard,
      // pass, and join page all reflect the new name.
      const cards = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).where("businessId", "==", existing.id).get();
      await Promise.all(cards.docs.map((d) => d.ref.update({ businessName: name })));
      return NextResponse.json({ business: { ...existing, name } });
    }

    const data = { name, ownerId: session.uid, ownerEmail: session.email || "", createdAt: Date.now() };
    const ref = await adminDb().collection(COLLECTIONS.BUSINESSES).add(data);
    return NextResponse.json({ business: { id: ref.id, ...data } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
