import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Staff } from "@/lib/types";
import { getBusinessByOwner } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listStaff(businessId: string): Promise<Staff[]> {
  const snap = await adminDb().collection(COLLECTIONS.STAFF).where("businessId", "==", businessId).get();
  return snap.docs.map((d) => d.data() as Staff).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// GET — list this owner's cajeros + the plan cap.
export async function GET(req: Request) {
  const session = await authenticate(req);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });
  const business = await getBusinessByOwner(session.uid);
  if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });
  const staff = await listStaff(business.id);
  return NextResponse.json({ staff: staff.map((s) => ({ uid: s.uid, name: s.name, email: s.email })), max: effectivePlan(business).maxCashiers });
}

// POST — create a cajero (owner-only, plan-gated, capped). Makes a Firebase Auth
// login + a staff record mapping that uid to this business (stamp-only access).
export async function POST(req: Request) {
  const session = await authenticate(req);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });
  const business = await getBusinessByOwner(session.uid);
  if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

  const max = effectivePlan(business).maxCashiers;
  if (max <= 0) return NextResponse.json({ error: "Mejora al plan Negocio para agregar cajeros." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name) return NextResponse.json({ error: "Ingresa el nombre del cajero." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });

  if ((await listStaff(business.id)).length >= max) {
    return NextResponse.json({ error: `Tu plan permite ${max} cajeros.` }, { status: 403 });
  }

  let uid: string;
  try {
    uid = (await adminAuth().createUser({ email, password, displayName: name })).uid;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "auth/email-already-exists") return NextResponse.json({ error: "Ese correo ya está en uso." }, { status: 400 });
    return NextResponse.json({ error: "No se pudo crear el cajero." }, { status: 500 });
  }

  const staff: Staff = { uid, businessId: business.id, name, email, role: "cajero", createdAt: Date.now() };
  await adminDb().collection(COLLECTIONS.STAFF).doc(uid).set(staff);
  return NextResponse.json({ ok: true, staff: { uid, name, email } });
}

// DELETE — remove a cajero (must belong to this owner's business).
export async function DELETE(req: Request) {
  const session = await authenticate(req);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });
  const business = await getBusinessByOwner(session.uid);
  if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });

  const uid = String((await req.json().catch(() => ({}))).uid || "");
  const doc = await adminDb().collection(COLLECTIONS.STAFF).doc(uid).get();
  if (!doc.exists || (doc.data() as Staff).businessId !== business.id) {
    return NextResponse.json({ error: "Cajero no encontrado." }, { status: 404 });
  }
  try {
    await adminAuth().deleteUser(uid);
  } catch (e) {
    console.error("[staff] deleteUser:", e);
  }
  await doc.ref.delete();
  return NextResponse.json({ ok: true });
}
