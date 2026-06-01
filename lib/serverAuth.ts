import "server-only";
import { adminAuth } from "./firebaseAdmin";

export type AuthResult =
  | { ok: true; uid: string; email?: string }
  | { ok: false; status: number; reason: string };

// Verifies the Firebase ID token sent by the business-owner client and returns
// a precise reason on failure (logged + surfaced) so 401s are debuggable.
export async function authenticate(req: Request): Promise<AuthResult> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return { ok: false, status: 401, reason: "No se envió el token de sesión (encabezado Authorization ausente)." };
  }
  const token = header.slice(7).trim();
  if (!token) return { ok: false, status: 401, reason: "Token de sesión vacío." };

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { ok: true, uid: decoded.uid, email: decoded.email ?? undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Surfaces the real cause in the `next dev` terminal.
    console.error("[auth] verifyIdToken failed:", msg);
    return { ok: false, status: 401, reason: `No se pudo verificar la sesión: ${msg}` };
  }
}
