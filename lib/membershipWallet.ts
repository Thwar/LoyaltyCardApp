import "server-only";
import { adminDb } from "./firebaseAdmin";
import { COLLECTIONS, type Member } from "./types";
import { getMembershipProgram } from "./serverData";
import { walletConfigured, syncMembershipObject } from "./googleWallet";
import { appleConfigured } from "./appleWallet";
import { sendApplePassPush } from "./apns";

// Best-effort: push a member's updated pass to Apple + Google after a change
// (visit logged, renewed, deactivated). Never throws — wallet sync is non-critical.
export async function pushMemberPass(member: Member, eventMessage?: string): Promise<void> {
  const program = await getMembershipProgram(member.programId);
  if (!program) return;
  if (walletConfigured() && member.googleObjectId) {
    try {
      await syncMembershipObject(member, program, eventMessage);
    } catch (e) {
      console.error("[membership] google sync:", e);
    }
  }
  if (appleConfigured()) {
    try {
      const regs = await adminDb().collection(COLLECTIONS.APPLE_REGISTRATIONS).where("serialNumber", "==", member.id).get();
      await sendApplePassPush(regs.docs.map((d) => d.data().pushToken as string));
    } catch (e) {
      console.error("[membership] apple push:", e);
    }
  }
}
