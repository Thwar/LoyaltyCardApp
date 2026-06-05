import { NextResponse } from "next/server";
import { getMember, getMembershipProgram, getBusinessById } from "@/lib/serverData";
import { appleConfigured, buildMembershipPkpass } from "@/lib/appleWallet";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: returns the signed .pkpass for a member. The /m/card page links here so
// the member can add the membership card to Apple Wallet on their iPhone.
export async function GET(_req: Request, ctx: { params: Promise<{ memberId: string }> }) {
  try {
    if (!appleConfigured()) return NextResponse.json({ error: "Apple Wallet no está configurado." }, { status: 503 });
    const { memberId } = await ctx.params;

    const member = await getMember(memberId);
    if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    const program = await getMembershipProgram(member.programId);
    if (!program) return NextResponse.json({ error: "Membresía no encontrada." }, { status: 404 });

    const business = await getBusinessById(program.businessId);
    const hideBranding = business ? effectivePlan(business).removeBranding : false;
    const buffer = await buildMembershipPkpass(member, program, hideBranding);
    const safeName = (program.name || "membresia").replace(/[^a-z0-9]/gi, "_");
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${safeName}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    console.error("[apple] membership pass error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
