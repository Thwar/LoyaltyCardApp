import { NextResponse } from "next/server";
import sharp from "sharp";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessByOwner } from "@/lib/serverData";
import { notifyAllCustomerPasses } from "@/lib/appleNotify";
import { syncAllGooglePasses } from "@/lib/googleNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Update the business brand: logo + description. Re-syncs existing passes so the
// new logo/description flow through (cards without their own logo use this one).
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const update: { description: string; logoPng?: string } = {
      description: String(body.description || "").trim().slice(0, 240),
    };

    // Optional logo: a small PNG data URL → base64. "" clears it.
    if (typeof body.logo === "string") {
      if (body.logo === "") {
        update.logoPng = "";
      } else if (body.logo.startsWith("data:image/")) {
        const b64 = body.logo.split(",")[1] || "";
        if (b64.length > 0 && b64.length < 2_000_000) {
          try {
            const out = await sharp(Buffer.from(b64, "base64"))
              .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
              .png()
              .toBuffer();
            update.logoPng = out.toString("base64");
          } catch {
            // ignore an unreadable image
          }
        }
      }
    }

    await adminDb().collection(COLLECTIONS.BUSINESSES).doc(business.id).update(update);

    // Best-effort: refresh existing passes (a logo change is silent — no field
    // value changes — so it won't spam customers with notifications).
    try {
      await notifyAllCustomerPasses(business.id);
    } catch (e) {
      console.error("[profile] apple sync:", e);
    }
    try {
      await syncAllGooglePasses(business.id);
    } catch (e) {
      console.error("[profile] google sync:", e);
    }

    return NextResponse.json({ ok: true, description: update.description, logoPng: update.logoPng });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
