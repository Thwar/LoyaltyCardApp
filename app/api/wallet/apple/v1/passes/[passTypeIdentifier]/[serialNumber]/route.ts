import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getLoyaltyCard } from "@/lib/serverData";
import { buildPkpass, verifyApplePassAuth } from "@/lib/appleWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { passTypeIdentifier: string; serialNumber: string };

// Apple fetches the rebuilt pass here after a push / poll says it changed.
export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const { serialNumber } = await ctx.params;
  if (!verifyApplePassAuth(req.headers.get("authorization"), serialNumber)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(serialNumber).get();
  if (!snap.exists) return new Response("Not Found", { status: 404 });
  const customer: CustomerCard = { id: snap.id, ...(snap.data() as Omit<CustomerCard, "id">) };

  const card = await getLoyaltyCard(customer.loyaltyCardId);
  if (!card) return new Response("Not Found", { status: 404 });

  const buffer = await buildPkpass(customer, card);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": new Date(Number(customer.appleUpdatedTag || Date.now())).toUTCString(),
    },
  });
}
