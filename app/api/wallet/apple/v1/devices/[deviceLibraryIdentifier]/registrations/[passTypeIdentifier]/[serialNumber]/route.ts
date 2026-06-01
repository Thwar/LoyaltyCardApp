import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { verifyApplePassAuth } from "@/lib/appleWallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string };

// Apple calls this when a device adds the pass: stores the APNs push token.
export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await ctx.params;
  if (!verifyApplePassAuth(req.headers.get("authorization"), serialNumber)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const pushToken = body?.pushToken as string | undefined;
  if (!pushToken) return new Response("Bad Request", { status: 400 });

  const id = `${deviceLibraryIdentifier}__${serialNumber}`;
  const ref = adminDb().collection(COLLECTIONS.APPLE_REGISTRATIONS).doc(id);
  const existed = (await ref.get()).exists;
  await ref.set({ deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken, updatedAt: Date.now() });
  // Mark the customer's card as active (clears any prior "removed" state on re-add).
  try {
    await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(serialNumber).update({ passActive: true, passRemovedAt: null });
  } catch {
    // card may not exist for a test serial — ignore
  }
  return new Response(null, { status: existed ? 200 : 201 });
}

// Apple calls this when the user removes the pass.
export async function DELETE(req: Request, ctx: { params: Promise<Params> }) {
  const { deviceLibraryIdentifier, serialNumber } = await ctx.params;
  if (!verifyApplePassAuth(req.headers.get("authorization"), serialNumber)) {
    return new Response("Unauthorized", { status: 401 });
  }
  await adminDb()
    .collection(COLLECTIONS.APPLE_REGISTRATIONS)
    .doc(`${deviceLibraryIdentifier}__${serialNumber}`)
    .delete();

  // If no devices remain registered for this pass, the customer removed their card.
  const remaining = await adminDb()
    .collection(COLLECTIONS.APPLE_REGISTRATIONS)
    .where("serialNumber", "==", serialNumber)
    .limit(1)
    .get();
  if (remaining.empty) {
    try {
      await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(serialNumber).update({ passActive: false, passRemovedAt: Date.now() });
    } catch {
      // ignore
    }
  }
  return new Response(null, { status: 200 });
}
