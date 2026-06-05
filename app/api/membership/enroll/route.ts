import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Member } from "@/lib/types";
import { getMembershipProgram } from "@/lib/serverData";
import { generateUniqueCardCode } from "@/lib/cardCode";
import { walletConfigured, issueMembershipPass } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { allowRequest, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 24 * 60 * 60 * 1000;

// Public: a person enrolls in a membership from /m/[programId].
export async function POST(req: Request) {
  try {
    if (!(await allowRequest(`menroll:${clientIp(req)}`, 30, 10 * 60 * 1000))) {
      return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const programId = String(body.programId || "").trim();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const marketingConsent = body.marketingConsent === true;

    if (!name) return NextResponse.json({ error: "Tu nombre es obligatorio." }, { status: 400 });
    if (!email) return NextResponse.json({ error: "El correo electrónico es obligatorio." }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });

    const program = await getMembershipProgram(programId);
    if (!program || program.isActive === false || program.deletedAt) {
      return NextResponse.json({ error: "Membresía no encontrada." }, { status: 404 });
    }

    const membersCol = adminDb().collection(COLLECTIONS.MEMBERS);

    // Same email at this business = same person. Return their existing membership.
    const dup = await membersCol.where("businessId", "==", program.businessId).where("memberEmail", "==", email).limit(1).get();
    if (!dup.empty) {
      const d = dup.docs[0];
      const member: Member = { id: d.id, ...(d.data() as Omit<Member, "id">) };
      return NextResponse.json({ memberId: member.id, memberCode: member.memberCode, existing: true, appleConfigured: appleConfigured() });
    }

    const memberCode = await generateUniqueCardCode(async (code) => {
      const s = await membersCol.where("businessId", "==", program.businessId).where("memberCode", "==", code).limit(1).get();
      return !s.empty;
    });

    const now = Date.now();
    const data = {
      programId: program.id,
      businessId: program.businessId,
      memberPersonId: randomUUID(),
      memberName: name,
      memberEmail: email,
      memberPhone: phone,
      memberCode,
      expiresAt: program.defaultDurationDays ? now + program.defaultDurationDays * DAY : null,
      visitLimit: program.tracksVisits ? program.defaultVisitLimit ?? null : null,
      visitsUsed: 0,
      marketingConsent,
      createdAt: now,
      appleUpdatedTag: now,
      history: [{ t: now, kind: "created" as const }],
    };
    const ref = await membersCol.add(data);
    const member: Member = { id: ref.id, ...data };

    // Issue the Google pass (best-effort) so the done screen has a save URL.
    if (walletConfigured()) {
      try {
        const issued = await issueMembershipPass(member, program);
        await ref.update({ googleObjectId: issued.objectId });
      } catch (we) {
        console.error("Membership wallet issue error:", we);
      }
    }

    return NextResponse.json({ memberId: member.id, memberCode, existing: false, appleConfigured: appleConfigured() });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
