import { NextResponse } from "next/server";
import { getLoyaltyCard } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the enrollment page (/join/[cardId]) reads card display info from here.
export async function GET(_req: Request, ctx: { params: Promise<{ loyaltyCardId: string }> }) {
  try {
    const { loyaltyCardId } = await ctx.params;
    const card = await getLoyaltyCard(loyaltyCardId);
    if (!card || !card.isActive) return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
    return NextResponse.json({
      card: {
        id: card.id,
        businessName: card.businessName,
        totalSlots: card.totalSlots,
        rewardDescription: card.rewardDescription,
        cardColor: card.cardColor,
        textColor: card.textColor || "#FFFFFF",
        logoPng: card.logoPng || "",
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
