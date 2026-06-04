import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Member } from "@/lib/types";
import { getBusinessByOwner, getMembershipProgramByBusiness } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";
import { memberStatus } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dashboard data for the Membresías tab: the program, its members, and counts.
export async function GET(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const eligible = effectivePlan(business).maxMemberships >= 1;
    const program = await getMembershipProgramByBusiness(business.id);
    if (!program) return NextResponse.json({ eligible, program: null, members: [], stats: null });

    const snap = await adminDb().collection(COLLECTIONS.MEMBERS).where("businessId", "==", business.id).limit(500).get();
    const members: Member[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }));
    members.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const now = Date.now();
    const SOON = 7 * 24 * 60 * 60 * 1000;
    let active = 0;
    let expired = 0;
    let expiringSoon = 0;
    let visitsTotal = 0;
    for (const m of members) {
      const st = memberStatus(m, now);
      if (st === "active") active++;
      else expired++;
      if (m.expiresAt != null && m.expiresAt >= now && m.expiresAt - now <= SOON) expiringSoon++;
      visitsTotal += m.visitsUsed || 0;
    }

    return NextResponse.json({
      eligible,
      program,
      members,
      stats: { total: members.length, active, expired, expiringSoon, visitsTotal },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
