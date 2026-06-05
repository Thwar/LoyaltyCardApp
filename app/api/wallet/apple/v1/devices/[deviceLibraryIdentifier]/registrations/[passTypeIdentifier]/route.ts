import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { deviceLibraryIdentifier: string; passTypeIdentifier: string };

// Apple polls this to learn which of a device's passes changed since `tag`.
export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const { deviceLibraryIdentifier, passTypeIdentifier } = await ctx.params;
  const since = Number(new URL(req.url).searchParams.get("passesUpdatedSince") || 0);

  const regs = await adminDb()
    .collection(COLLECTIONS.APPLE_REGISTRATIONS)
    .where("deviceLibraryIdentifier", "==", deviceLibraryIdentifier)
    .where("passTypeIdentifier", "==", passTypeIdentifier)
    .get();
  if (regs.empty) return new Response(null, { status: 204 });

  const serialNumbers: string[] = [];
  let maxTag = since;
  for (const r of regs.docs) {
    const serial = r.data().serialNumber as string;
    // The serial is a loyalty card OR a membership; check both.
    let data = (await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(serial).get()).data();
    if (!data) data = (await adminDb().collection(COLLECTIONS.MEMBERS).doc(serial).get()).data();
    if (!data) continue;
    const tag = Number((data as { appleUpdatedTag?: number })?.appleUpdatedTag || 0);
    if (tag > since) {
      serialNumbers.push(serial);
      if (tag > maxTag) maxTag = tag;
    }
  }
  if (!serialNumbers.length) return new Response(null, { status: 204 });
  return Response.json({ lastUpdated: String(maxTag), serialNumbers });
}
