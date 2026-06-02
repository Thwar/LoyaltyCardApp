import "server-only";
import { NextResponse } from "next/server";
import { authenticate } from "./serverAuth";

// ─── GOD MODE ────────────────────────────────────────────────────────────────
// The founder's email(s). Anyone signed in with one of these gets full admin
// access at /admin (see all businesses, set plans, delete, browse the DB).
//
// 👉 EDIT THIS to the email you log into SoyCasero with. Everyone else is denied
//    — the gate is fail-closed (empty list = nobody gets in).
export const ADMIN_EMAILS = ["thomaswar3@gmail.com"];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === e);
}

type AdminOk = { ok: true; uid: string; email: string };
type AdminErr = { ok: false; res: NextResponse };

// Verify the Firebase session AND require an admin email. On failure returns a
// ready-to-return NextResponse (401 if not signed in, 403 if signed in but not an admin).
export async function requireAdmin(req: Request): Promise<AdminOk | AdminErr> {
  const session = await authenticate(req);
  if (!session.ok) {
    return { ok: false, res: NextResponse.json({ error: session.reason }, { status: session.status }) };
  }
  if (!isAdminEmail(session.email)) {
    return { ok: false, res: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }
  return { ok: true, uid: session.uid, email: session.email! };
}
