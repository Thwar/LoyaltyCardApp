import sharp from "sharp";
import { getLoyaltyCard } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hexToRgb(hex: string) {
  const h = (hex || "#E53935").replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return { r: parseInt(f.slice(0, 2), 16) || 0, g: parseInt(f.slice(2, 4), 16) || 0, b: parseInt(f.slice(4, 6), 16) || 0, alpha: 1 };
}

// Public: serves a card's business logo for the wallet pass (Google needs a URL;
// we store the logo as base64 in Firestore). `?shape=square` returns a square
// version centered on the card's color — for Google's circular program logo,
// where the wide/white wordmark would otherwise crop or vanish on the white
// circle. Without it, the raw (wide) logo is returned for the hero banner.
export async function GET(req: Request, ctx: { params: Promise<{ loyaltyCardId: string }> }) {
  const { loyaltyCardId } = await ctx.params;
  const card = await getLoyaltyCard(loyaltyCardId);
  if (!card?.logoPng) return new Response("Not Found", { status: 404 });

  const raw = Buffer.from(card.logoPng, "base64");
  const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" };

  if (new URL(req.url).searchParams.get("shape") === "square") {
    const size = 660;
    const inner = Math.round(size * 0.92); // fill most of the circle (small margin)
    const logo = await sharp(raw).trim().resize({ width: inner, height: inner, fit: "inside" }).png().toBuffer();
    const out = await sharp({ create: { width: size, height: size, channels: 4, background: hexToRgb(card.cardColor) } })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toBuffer();
    return new Response(new Uint8Array(out), { status: 200, headers });
  }

  return new Response(new Uint8Array(raw), { status: 200, headers });
}
