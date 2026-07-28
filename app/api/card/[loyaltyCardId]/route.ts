import { NextResponse } from "next/server";
import { getLoyaltyCard, getBusinessById, countClients } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";
import { logoVersion } from "@/lib/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the enrollment page (/join/[cardId]) reads card display info from here.
export async function GET(_req: Request, ctx: { params: Promise<{ loyaltyCardId: string }> }) {
  try {
    const { loyaltyCardId } = await ctx.params;
    const card = await getLoyaltyCard(loyaltyCardId);
    if (!card || !card.isActive) return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });

    // Surface "full" at scan time so new customers see it before filling the form.
    // (Existing caseros can still enroll their email — enforced authoritatively in /api/enroll.)
    let full = false;
    const business = await getBusinessById(card.businessId);
    const maxClients = business ? effectivePlan(business).maxClients : null;
    if (maxClients != null) full = (await countClients(card.businessId)) >= maxClients;

    // Exactly what /api/card/[id]/logo will serve (see its own fallback order).
    const logoSrc = card.logoPng || business?.logoPng;

    // Scan-time display data changes rarely, but every QR scan used to cost two
    // sequential Firestore round trips. A short shared cache lets the CDN serve the
    // burst of scans that follows one person putting the table tent out, and
    // stale-while-revalidate means nobody ever waits on the refresh.
    //
    // `full` can be up to 30s stale — deliberately fine, because /api/enroll
    // re-checks the cap authoritatively before creating anything (see below).
    return NextResponse.json(
      {
        full,
        card: {
          id: card.id,
          businessName: card.businessName,
          totalSlots: card.totalSlots,
          rewardDescription: card.rewardDescription,
          cardColor: card.cardColor,
          textColor: card.textColor || "#FFFFFF",
          stampShape: card.stampShape || "circle",
          // A URL, not the base64 bytes. Inlining logoPng made this response ~85KB,
          // of which >99% was the logo, re-downloaded on every scan. The /logo route
          // serves the same image with immutable caching, and the browser fetches it
          // in parallel instead of the form waiting behind it.
          //
          // ?v= is required, not decoration: /logo is immutable for a year and its
          // URL is content-independent (editing a logo overwrites logoPng on the same
          // doc id), so without it a rebrand would never reach customers. Hash the
          // same source /logo resolves — card logo first, then the business logo.
          logoUrl: logoSrc ? `/api/card/${card.id}/logo?v=${logoVersion(logoSrc)}` : null,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } }
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
