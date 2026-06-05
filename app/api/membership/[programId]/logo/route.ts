import { getMembershipProgram, getBusinessById } from "@/lib/serverData";
import { squareLogo } from "@/lib/logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: serves a membership program's logo for the Google Wallet pass (Google
// needs a URL; logos are stored as base64). ?shape=square centers it on the card
// color for Google's circular logo slot. Falls back to the business logo.
export async function GET(req: Request, ctx: { params: Promise<{ programId: string }> }) {
  const { programId } = await ctx.params;
  const program = await getMembershipProgram(programId);
  if (!program) return new Response("Not Found", { status: 404 });

  let logoB64 = program.logoPng;
  if (!logoB64) logoB64 = (await getBusinessById(program.businessId))?.logoPng;
  if (!logoB64) return new Response("Not Found", { status: 404 });

  const raw = Buffer.from(logoB64, "base64");
  const headers = { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" };
  if (new URL(req.url).searchParams.get("shape") === "square") {
    const out = await squareLogo(raw, program.cardColor || "#1f2937");
    return new Response(new Uint8Array(out), { status: 200, headers });
  }
  return new Response(new Uint8Array(raw), { status: 200, headers });
}
