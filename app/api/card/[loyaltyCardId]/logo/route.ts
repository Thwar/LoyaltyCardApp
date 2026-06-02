import { getLoyaltyCard, getBusinessById } from "@/lib/serverData";
import { squareLogo } from "@/lib/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: serves the logo for a card's wallet pass (Google needs a URL; logos are
// stored as base64 in Firestore). Uses the card's own logo, falling back to the
// business logo. `?shape=square` returns a square version centered on the card
// color — for Google's circular program logo, where a wide/white wordmark would
// otherwise crop or vanish. Without it, the raw (wide) logo is returned.
export async function GET(req: Request, ctx: { params: Promise<{ loyaltyCardId: string }> }) {
  const { loyaltyCardId } = await ctx.params;
  const card = await getLoyaltyCard(loyaltyCardId);
  if (!card) return new Response("Not Found", { status: 404 });

  let logoB64 = card.logoPng;
  if (!logoB64) logoB64 = (await getBusinessById(card.businessId))?.logoPng;
  if (!logoB64) return new Response("Not Found", { status: 404 });

  const raw = Buffer.from(logoB64, "base64");
  const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" };

  if (new URL(req.url).searchParams.get("shape") === "square") {
    const out = await squareLogo(raw, card.cardColor);
    return new Response(new Uint8Array(out), { status: 200, headers });
  }
  return new Response(new Uint8Array(raw), { status: 200, headers });
}
