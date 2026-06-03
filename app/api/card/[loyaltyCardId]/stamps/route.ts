import { getLoyaltyCard } from "@/lib/serverData";
import { renderStampHero } from "@/lib/stampStrip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the Google Wallet hero banner — the stamp grid for a given fill count.
// Google fetches this server-side. The URL carries ?filled= (and ?v= for design),
// so each stamp change is a new URL and Google re-fetches the updated banner.
export async function GET(req: Request, ctx: { params: Promise<{ loyaltyCardId: string }> }) {
  const { loyaltyCardId } = await ctx.params;
  const card = await getLoyaltyCard(loyaltyCardId);
  if (!card) return new Response("Not Found", { status: 404 });

  const total = card.totalSlots;
  const filled = Math.max(0, Math.min(Number(new URL(req.url).searchParams.get("filled")) || 0, total));
  const png = await renderStampHero(filled, total, card.stampShape || "circle", card.textColor || "#FFFFFF", card.cardColor || "#E53935");

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
