import { getLoyaltyCard } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: serves a card's business logo as a real image so Google Wallet can
// fetch it for the pass (Google needs a URL; we store the logo as base64 in
// Firestore). The URL is content-addressed via a ?v= hash, so it's cacheable.
export async function GET(_req: Request, ctx: { params: Promise<{ loyaltyCardId: string }> }) {
  const { loyaltyCardId } = await ctx.params;
  const card = await getLoyaltyCard(loyaltyCardId);
  if (!card?.logoPng) return new Response("Not Found", { status: 404 });

  const buf = Buffer.from(card.logoPng, "base64");
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
