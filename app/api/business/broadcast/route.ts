import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCardsByBusiness } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";
import { walletConfigured, syncLoyaltyObject } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { SEGMENTS, inSegment, type Segment } from "@/lib/segments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

// Send a marketing/announcement notification to all of a business's customers.
// Paid plans only, rate-limited per plan. Google: a per-object message; Apple: the
// pass renders the latest broadcast (changeMessage) and we push a refresh.
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

    const plan = effectivePlan(business);
    if (!plan.paid || plan.broadcastsPerDay <= 0) {
      return NextResponse.json({ error: "Mejora al plan Café o Negocio para enviar mensajes a tus clientes." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim().slice(0, 160);
    if (!message) return NextResponse.json({ error: "Escribe un mensaje." }, { status: 400 });
    const segment: Segment = SEGMENTS.find((s) => s.id === body.segment)?.id ?? "all";

    // Rate limit: rolling 24h count + minimum gap between sends.
    const now = Date.now();
    const history = business.broadcastHistory || [];
    const resetAt = business.broadcastRateResetAt || 0;
    const recent = history.filter((h) => now - h.at < DAY && h.at > resetAt);
    if (recent.length >= plan.broadcastsPerDay) {
      return NextResponse.json(
        { error: `Alcanzaste el límite de tu plan (${plan.broadcastsPerDay}/día). Inténtalo más tarde.`, nextAt: Math.min(...recent.map((h) => h.at)) + DAY },
        { status: 429 }
      );
    }
    if (plan.broadcastGapHours > 0 && recent.length) {
      const gap = plan.broadcastGapHours * 60 * 60 * 1000;
      const last = Math.max(...recent.map((h) => h.at));
      if (now - last < gap) {
        return NextResponse.json(
          { error: `Espera al menos ${plan.broadcastGapHours}h entre mensajes.`, nextAt: last + gap },
          { status: 429 }
        );
      }
    }

    // Resolve each card's logo (business logo as the default) + slots for segmenting.
    const cards = await getLoyaltyCardsByBusiness(business.id);
    const cardMap = new Map(cards.map((c) => [c.id, { ...c, logoPng: c.logoPng || business.logoPng }]));
    const slotsOf = (cid: string) => cardMap.get(cid)?.totalSlots ?? 0;

    // Filter the audience to the chosen segment.
    const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", business.id).get();
    const targets = snap.docs.filter((d) => {
      const c = d.data() as CustomerCard;
      return inSegment(c, segment, slotsOf(c.loyaltyCardId), now);
    });

    // Log the send (with audience + count) on the business; this is also the rate-limit source.
    const segLabel = SEGMENTS.find((s) => s.id === segment)?.label ?? "Todos los clientes";
    await adminDb()
      .collection(COLLECTIONS.BUSINESSES)
      .doc(business.id)
      .update({ broadcastHistory: [...history, { message, at: now, count: targets.length, segment: segLabel }].slice(-20) });

    // Apple: set the per-customer "Novedades" message + bump the tag on TARGETS only,
    // then push (only changed passes show the banner — keeps segmented messages private).
    for (let i = 0; i < targets.length; i += 400) {
      const batch = adminDb().batch();
      targets.slice(i, i + 400).forEach((d) => batch.update(d.ref, { broadcastMessage: message, appleUpdatedTag: now }));
      await batch.commit();
    }
    if (appleConfigured()) {
      try {
        await notifyAllCustomerPasses(business.id);
      } catch (e) {
        console.error("[broadcast] apple push:", e);
      }
    }

    // Google: per-object message, only to targets with a Google pass (chunked for timeout safety).
    if (walletConfigured()) {
      const gTargets = targets.filter((d) => (d.data() as CustomerCard).googleObjectId);
      const CHUNK = 15;
      for (let i = 0; i < gTargets.length; i += CHUNK) {
        await Promise.all(
          gTargets.slice(i, i + CHUNK).map((d) => {
            const c: CustomerCard = { id: d.id, ...(d.data() as Omit<CustomerCard, "id">) };
            const card = cardMap.get(c.loyaltyCardId) || cards[0];
            if (!card) return Promise.resolve();
            return syncLoyaltyObject(c, card, message, business.description, plan.removeBranding).catch((e) =>
              console.error("[broadcast] google:", c.id, e)
            );
          })
        );
      }
    }

    return NextResponse.json({ ok: true, recipients: targets.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
