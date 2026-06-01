import { NextResponse } from "next/server";
import sharp from "sharp";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { CARD_DEFAULTS } from "@/lib/theme";
import { getBusinessByOwner, getLoyaltyCardByBusiness } from "@/lib/serverData";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { syncAllGooglePasses } from "@/lib/googleNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create or update the business's single stamp card (POC keeps it to one card).
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const totalSlots = Math.round(Number(body.totalSlots));
    const rewardDescription = String(body.rewardDescription || "").trim();
    const hexOk = (s: string) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s);
    const cardColorRaw = String(body.cardColor || "#E53935").trim();
    const textColorRaw = String(body.textColor || "#FFFFFF").trim();
    const cardColor = hexOk(cardColorRaw) ? cardColorRaw : "#E53935";
    const textColor = hexOk(textColorRaw) ? textColorRaw : "#FFFFFF";

    if (!Number.isFinite(totalSlots) || totalSlots < CARD_DEFAULTS.MIN_SLOTS || totalSlots > CARD_DEFAULTS.MAX_SLOTS) {
      return NextResponse.json(
        { error: `Los sellos deben estar entre ${CARD_DEFAULTS.MIN_SLOTS} y ${CARD_DEFAULTS.MAX_SLOTS}.` },
        { status: 400 }
      );
    }
    if (!rewardDescription) return NextResponse.json({ error: "Describe la recompensa." }, { status: 400 });

    // Optional logo: a small PNG kept as base64 on the card. "" clears it.
    let logoPng = "";
    if (typeof body.logo === "string" && body.logo.startsWith("data:image/")) {
      const b64 = body.logo.split(",")[1] || "";
      if (b64.length > 0 && b64.length < 2_000_000) {
        try {
          const out = await sharp(Buffer.from(b64, "base64"))
            .resize({ width: 480, height: 150, fit: "inside", withoutEnlargement: true })
            .png()
            .toBuffer();
          logoPng = out.toString("base64");
        } catch {
          logoPng = "";
        }
      }
    }

    const fields = {
      businessId: business.id,
      businessName: business.name,
      totalSlots,
      rewardDescription,
      cardColor,
      textColor,
      logoPng,
      isActive: true,
    };

    const existing = await getLoyaltyCardByBusiness(business.id);
    if (existing) {
      await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(existing.id).update(fields);
      await notifyAllCustomerPasses(business.id); // Apple: push the change to all current customers' passes
      await syncAllGooglePasses(business.id); // Google: PATCH the class + each customer object
      return NextResponse.json({ card: { ...existing, ...fields } });
    }
    const ref = await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).add({ ...fields, createdAt: Date.now() });
    return NextResponse.json({ card: { id: ref.id, ...fields } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
