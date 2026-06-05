import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { verifyApplePassAuth } from "@/lib/appleWallet";
import { sendApplePassPush } from "@/lib/apns";

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
  // Mark the card active (clears any prior "removed" state on re-add). On the
  // first registration, arm the welcome: set the flag + nudge a refresh so the
  // pass rebuilds with the welcome field, firing a one-time welcome notification.
  try {
    // The serial is a loyalty card OR a membership — arm the welcome on whichever exists.
    let ref2 = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(serialNumber);
    let snap = await ref2.get();
    if (!snap.exists) {
      ref2 = adminDb().collection(COLLECTIONS.MEMBERS).doc(serialNumber);
      snap = await ref2.get();
    }
    if (snap.exists) {
      const firstWelcome = snap.data()?.welcomeNotified !== true;
      await ref2.update({
        passActive: true,
        passRemovedAt: null,
        ...(firstWelcome ? { welcomeNotified: true, appleUpdatedTag: Date.now() } : {}),
      });
      if (firstWelcome) await sendApplePassPush([pushToken]);
    }
  } catch {
    // serial may not exist for a test pass — ignore
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
    const patch = { passActive: false, passRemovedAt: Date.now() };
    try {
      const card = adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).doc(serialNumber);
      if ((await card.get()).exists) await card.update(patch);
      else await adminDb().collection(COLLECTIONS.MEMBERS).doc(serialNumber).update(patch);
    } catch {
      // ignore
    }
  }
  return new Response(null, { status: 200 });
}
