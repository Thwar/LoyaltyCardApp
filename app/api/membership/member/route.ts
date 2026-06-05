import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { MemberEvent } from "@/lib/types";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Member } from "@/lib/types";
import { getBusinessByOwner, getMembershipProgramByBusiness, getMember } from "@/lib/serverData";
import { generateUniqueCardCode } from "@/lib/cardCode";
import { pushMemberPass } from "@/lib/membershipWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Resolve the owner + their membership program for a mutating request.
async function ownerProgram(req: Request) {
  const session = await authenticate(req);
  if (!session.ok) return { error: NextResponse.json({ error: session.reason }, { status: session.status }) };
  const business = await getBusinessByOwner(session.uid);
  if (!business) return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  const program = await getMembershipProgramByBusiness(business.id);
  if (!program) return { error: NextResponse.json({ error: "Primero crea tu membresía." }, { status: 400 }) };
  return { business, program };
}

// Create a member (owner adds someone at the counter). Idempotent by email.
export async function POST(req: Request) {
  try {
    const ctx = await ownerProgram(req);
    if ("error" in ctx) return ctx.error;
    const { business, program } = ctx;

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 80);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim().slice(0, 40);
    if (!name) return NextResponse.json({ error: "El nombre del socio es obligatorio." }, { status: 400 });
    if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 400 });

    const membersCol = adminDb().collection(COLLECTIONS.MEMBERS);

    // Same email at this business = same person; return the existing member.
    if (email) {
      const dup = await membersCol.where("businessId", "==", business.id).where("memberEmail", "==", email).limit(1).get();
      if (!dup.empty) {
        const d = dup.docs[0];
        return NextResponse.json({ member: { id: d.id, ...(d.data() as Omit<Member, "id">) }, existing: true });
      }
    }

    const memberCode = await generateUniqueCardCode(async (code) => {
      const s = await membersCol.where("businessId", "==", business.id).where("memberCode", "==", code).limit(1).get();
      return !s.empty;
    });

    const now = Date.now();
    const data = {
      programId: program.id,
      businessId: business.id,
      memberPersonId: randomUUID(),
      memberName: name,
      memberEmail: email,
      memberPhone: phone,
      memberCode,
      expiresAt: program.defaultDurationDays ? now + program.defaultDurationDays * DAY : null,
      visitLimit: program.tracksVisits ? program.defaultVisitLimit ?? null : null,
      visitsUsed: 0,
      createdAt: now,
      appleUpdatedTag: now,
      history: [{ t: now, kind: "created" as const }],
    };
    const ref = await membersCol.add(data);
    return NextResponse.json({ member: { id: ref.id, ...data } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}

// Edit a member: extend/set expiry, change visit allowance, rename, or deactivate.
export async function PATCH(req: Request) {
  try {
    const ctx = await ownerProgram(req);
    if ("error" in ctx) return ctx.error;
    const { business } = ctx;

    const body = await req.json().catch(() => ({}));
    const memberId = String(body.memberId || "");
    const member = await getMember(memberId);
    if (!member || member.businessId !== business.id) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });

    const now = Date.now();
    const update: Record<string, unknown> = { appleUpdatedTag: now };

    if (body.deactivate === true) {
      update.expiresAt = now; // immediately expired
    } else if (Number.isFinite(Number(body.addDays)) && Number(body.addDays) !== 0) {
      const base = Math.max(now, member.expiresAt ?? now);
      update.expiresAt = base + Math.round(Number(body.addDays)) * DAY;
    } else if (body.expiresAt === null || Number.isFinite(Number(body.expiresAt))) {
      update.expiresAt = body.expiresAt === null ? null : Math.round(Number(body.expiresAt));
    }

    if (body.visitLimit === null) update.visitLimit = null;
    else if (Number.isFinite(Number(body.visitLimit))) update.visitLimit = Math.max(0, Math.round(Number(body.visitLimit)));

    if (body.resetVisits === true) update.visitsUsed = 0; // renewal: clear the visit counter

    if (typeof body.name === "string" && body.name.trim()) update.memberName = body.name.trim().slice(0, 80);

    // A short message for the wallet notification, based on what changed.
    const msg = body.deactivate === true ? "Tu membresía fue desactivada." : body.resetVisits === true ? "¡Tus visitas se reiniciaron!" : update.expiresAt !== undefined ? "¡Tu membresía fue renovada!" : "";
    if (msg) update.lastEvent = msg;

    // Audit-log entries for what changed.
    const events: MemberEvent[] = [];
    if (body.deactivate === true) events.push({ t: now, kind: "deactivated" });
    else if (update.expiresAt !== undefined) events.push({ t: now, kind: "renewed", days: Number.isFinite(Number(body.addDays)) ? Math.round(Number(body.addDays)) : undefined, until: update.expiresAt as number | null });
    if (body.resetVisits === true) events.push({ t: now, kind: "reset" });
    if (events.length) update.history = FieldValue.arrayUnion(...events);

    await adminDb().collection(COLLECTIONS.MEMBERS).doc(memberId).update(update);
    const updated = { ...member, ...update, history: [...(member.history || []), ...events] } as Member;
    await pushMemberPass(updated, msg || undefined); // best-effort pass refresh
    return NextResponse.json({ member: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await ownerProgram(req);
    if ("error" in ctx) return ctx.error;
    const { business } = ctx;

    const body = await req.json().catch(() => ({}));
    const memberId = String(body.memberId || "");
    const member = await getMember(memberId);
    if (!member || member.businessId !== business.id) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });

    await adminDb().collection(COLLECTIONS.MEMBERS).doc(memberId).delete();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
