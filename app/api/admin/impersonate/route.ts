import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Business } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// God-mode "log in as a business". Returns a Firebase custom token for the
// business's owner; the client signs in with it to view their dashboard.
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.res;

  const body = await req.json().catch(() => ({}));
  const businessId = String(body?.businessId || "");
  if (!businessId) return NextResponse.json({ error: "Falta el negocio." }, { status: 400 });

  const doc = await adminDb().collection(COLLECTIONS.BUSINESSES).doc(businessId).get();
  if (!doc.exists) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
  const business = doc.data() as Omit<Business, "id">;
  if (!business.ownerId) return NextResponse.json({ error: "Este negocio no tiene dueño." }, { status: 400 });

  // Audit trail (admin email → impersonated owner).
  console.log(`[admin] ${admin.email} impersonating business ${businessId} (owner ${business.ownerId})`);

  const token = await adminAuth().createCustomToken(business.ownerId);
  return NextResponse.json({ token, businessName: business.name });
}
