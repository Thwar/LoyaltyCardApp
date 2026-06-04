import { NextResponse } from "next/server";
import sharp from "sharp";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type StampShape } from "@/lib/types";
import { STAMP_SHAPE_IDS } from "@/lib/stampShapes";
import { CARD_DEFAULTS } from "@/lib/theme";
import { getBusinessByOwner, getLoyaltyCard, getLoyaltyCardsByBusiness } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";
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
    const cardId = typeof body.cardId === "string" ? body.cardId : ""; // present = edit that card; absent = create
    const totalSlots = Math.round(Number(body.totalSlots));
    const rewardDescription = String(body.rewardDescription || "").trim().slice(0, 120);
    const welcomeMessage = String(body.welcomeMessage || "").trim().slice(0, 240);
    const hexOk = (s: string) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s);
    const cardColorRaw = String(body.cardColor || "#E53935").trim();
    const textColorRaw = String(body.textColor || "#FFFFFF").trim();
    const cardColor = hexOk(cardColorRaw) ? cardColorRaw : "#E53935";
    const textColor = hexOk(textColorRaw) ? textColorRaw : "#FFFFFF";

    const paid = effectivePlan(business).paid;

    // Custom stamp shapes/icons are a paid feature; free plans are forced to circle.
    const shapeRaw = String(body.stampShape || "circle") as StampShape;
    const stampShape = paid && STAMP_SHAPE_IDS.includes(shapeRaw) ? shapeRaw : "circle";

    // Custom notification templates are paid-only; free plans store none (defaults apply).
    const notif = (v: unknown) => (paid ? String(v || "").trim().slice(0, 180) : "");
    const stampMessage = notif(body.stampMessage);
    const completeMessage = notif(body.completeMessage);
    const redeemMessage = notif(body.redeemMessage);

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
      welcomeMessage,
      stampMessage,
      completeMessage,
      redeemMessage,
      cardColor,
      textColor,
      stampShape,
      logoPng,
    };

    if (cardId) {
      // Edit a specific card. Don't touch isActive here — that's the deactivate flow.
      const existing = await getLoyaltyCard(cardId);
      if (!existing || existing.businessId !== business.id) {
        return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
      }
      await adminDb().collection(COLLECTIONS.LOYALTY_CARDS).doc(cardId).update(fields);
      await notifyAllCustomerPasses(business.id); // Apple: push the change to current customers' passes
      await syncAllGooglePasses(business.id); // Google: PATCH the class + each customer object
      return NextResponse.json({ card: { ...existing, ...fields } });
    }

    // Create a new card — enforce the plan's card limit.
    const cards = await getLoyaltyCardsByBusiness(business.id);
    const max = effectivePlan(business).maxCards;
    if (cards.length >= max) {
      return NextResponse.json(
        { error: `Tu plan permite ${max} tarjeta(s). Mejora tu plan para crear más.` },
        { status: 403 }
      );
    }
    const ref = await adminDb()
      .collection(COLLECTIONS.LOYALTY_CARDS)
      .add({ ...fields, isActive: true, createdAt: Date.now() });
    return NextResponse.json({ card: { id: ref.id, ...fields, isActive: true } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
