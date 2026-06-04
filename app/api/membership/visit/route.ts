import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Member } from "@/lib/types";
import { getBusinessForUser } from "@/lib/serverData";
import { memberStatus, visitsRemaining } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Staff scans/enters a member code to verify status and (optionally) log a visit.
// Owner OR cajero. verifyOnly=true checks status without logging.
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const resolved = await getBusinessForUser(session.uid);
    if (!resolved) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const business = resolved.business;

    const body = await req.json().catch(() => ({}));
    const memberCode = String(body.memberCode || "").trim();
    const verifyOnly = body.verifyOnly === true;
    if (!memberCode) return NextResponse.json({ error: "Ingresa el código del socio." }, { status: 400 });

    const membersCol = adminDb().collection(COLLECTIONS.MEMBERS);
    const pre = await membersCol.where("businessId", "==", business.id).where("memberCode", "==", memberCode).limit(1).get();
    if (pre.empty) return NextResponse.json({ error: "Código no encontrado." }, { status: 404 });
    const docRef = pre.docs[0].ref;
    const member = { id: pre.docs[0].id, ...(pre.docs[0].data() as Omit<Member, "id">) };

    const result = (data: Member, logged: boolean) => {
      const st = memberStatus(data);
      return NextResponse.json({
        status: st,
        logged,
        memberName: data.memberName || "",
        expiresAt: data.expiresAt ?? null,
        visitLimit: data.visitLimit ?? null,
        visitsUsed: data.visitsUsed || 0,
        visitsRemaining: visitsRemaining(data),
      });
    };

    // Just checking the card — no write.
    if (verifyOnly) return result(member, false);

    // Don't log a visit on an expired / used-up membership.
    if (memberStatus(member) !== "active") return result(member, false);

    // Atomic: re-check status inside the tx so concurrent scans can't overshoot a limit.
    const txData = await adminDb().runTransaction<Member | null>(async (t) => {
      const snap = await t.get(docRef);
      const d = { id: docRef.id, ...(snap.data() as Omit<Member, "id">) };
      if (memberStatus(d) !== "active") return null; // expired / no visits since pre-read
      const now = Date.now();
      const remaining = visitsRemaining(d);
      const last = remaining != null && remaining <= 1; // this visit uses the final one
      const eventMessage = d.visitLimit != null ? `Visita registrada. Te ${last ? "queda 0" : `quedan ${remaining! - 1}`}.` : "Visita registrada. ¡Gracias por venir!";
      t.update(docRef, { visitsUsed: FieldValue.increment(1), lastVisitDate: now, appleUpdatedTag: now, lastEvent: eventMessage });
      t.set(adminDb().collection(COLLECTIONS.VISITS).doc(), { memberId: docRef.id, businessId: business.id, programId: d.programId, timestamp: now, by: session.uid });
      return { ...d, visitsUsed: (d.visitsUsed || 0) + 1, lastVisitDate: now };
    });

    if (!txData) return result(member, false); // lost the race; report current state
    return result(txData, true);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
