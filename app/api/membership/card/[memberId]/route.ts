import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getMember, getMembershipProgram } from "@/lib/serverData";
import { walletConfigured, issueMembershipPass, membershipSaveUrl } from "@/lib/googleWallet";
import { appleConfigured } from "@/lib/appleWallet";
import { memberStatus, visitsRemaining, MEMBER_STATUS_LABEL } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the /m/card/[memberId] page reads the member's card display + a Google
// save URL. Issues the Google object on first view (counter-added members).
export async function GET(_req: Request, ctx: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await ctx.params;
    const member = await getMember(memberId);
    if (!member) return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    const program = await getMembershipProgram(member.programId);
    if (!program) return NextResponse.json({ error: "Membresía no encontrada." }, { status: 404 });

    let saveUrl: string | null = null;
    if (walletConfigured()) {
      try {
        if (!member.googleObjectId) {
          const issued = await issueMembershipPass(member, program);
          await adminDb().collection(COLLECTIONS.MEMBERS).doc(member.id).update({ googleObjectId: issued.objectId });
          saveUrl = issued.saveUrl;
        } else {
          saveUrl = membershipSaveUrl(member.id);
        }
      } catch (e) {
        console.error("Membership card wallet error:", e);
      }
    }

    return NextResponse.json({
      memberName: member.memberName,
      programName: program.name,
      status: memberStatus(member),
      statusLabel: MEMBER_STATUS_LABEL[memberStatus(member)],
      expiresAt: member.expiresAt ?? null,
      tracksVisits: program.tracksVisits,
      visitsRemaining: visitsRemaining(member),
      memberCode: member.memberCode,
      cardColor: program.cardColor,
      textColor: program.textColor || "#FFFFFF",
      logoPng: program.logoPng || "",
      saveUrl,
      appleConfigured: appleConfigured(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
