import { NextResponse } from "next/server";
import { getMembershipProgram } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: the enroll page (/m/[programId]) reads program display info from here.
export async function GET(_req: Request, ctx: { params: Promise<{ programId: string }> }) {
  try {
    const { programId } = await ctx.params;
    const program = await getMembershipProgram(programId);
    if (!program || program.isActive === false || program.deletedAt) {
      return NextResponse.json({ error: "Membresía no encontrada." }, { status: 404 });
    }
    return NextResponse.json({
      program: {
        id: program.id,
        name: program.name,
        description: program.description || "",
        cardColor: program.cardColor,
        textColor: program.textColor || "#FFFFFF",
        logoPng: program.logoPng || "",
        tracksVisits: program.tracksVisits,
        defaultVisitLimit: program.defaultVisitLimit ?? null,
        defaultDurationDays: program.defaultDurationDays ?? null,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
