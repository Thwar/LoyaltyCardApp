import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessForUser, getLoyaltyCardsByBusiness } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

// Every stamping visit in the last year, per live card, for the dashboard's "Visitas"
// chart (paid analytics). The chart used to plot each casero's lastStampDate — one
// point per person, at their most recent visit — so a regular with 20 visits counted
// once, in the current month, and past months always looked emptier than they were.
//
// A visit is one (customer card, timestamp) pair: a multi-stamp scan writes one ledger
// row per stamp, all with the same timestamp (see /api/stamp), but it's one visit.
// Queried by businessId alone — an equality filter needs no composite index — and
// windowed in memory. Owner or cajero, like /api/business/me.
export async function GET(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const resolved = await getBusinessForUser(session.uid);
    if (!resolved) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const business = resolved.business;
    if (!effectivePlan(business).paid) {
      return NextResponse.json({ error: "Las analíticas avanzadas son de los planes de pago." }, { status: 403 });
    }

    const live = new Set((await getLoyaltyCardsByBusiness(business.id)).map((c) => c.id));
    const since = Date.now() - 366 * DAY;
    const snap = await adminDb()
      .collection(COLLECTIONS.STAMPS)
      .where("businessId", "==", business.id)
      .select("customerCardId", "loyaltyCardId", "timestamp")
      .get();

    const seen = new Set<string>();
    const visits: Record<string, number[]> = {};
    for (const d of snap.docs) {
      const { customerCardId, loyaltyCardId, timestamp } = d.data() as { customerCardId?: string; loyaltyCardId?: string; timestamp?: number };
      if (!loyaltyCardId || !live.has(loyaltyCardId) || !timestamp || timestamp < since) continue;
      const key = `${customerCardId}|${timestamp}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!visits[loyaltyCardId]) visits[loyaltyCardId] = [];
      visits[loyaltyCardId].push(timestamp);
    }
    return NextResponse.json({ visits });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
