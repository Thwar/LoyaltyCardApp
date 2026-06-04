import { NextResponse } from "next/server";
import sharp from "sharp";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS } from "@/lib/types";
import { getBusinessByOwner, getMembershipProgramByBusiness, getMembershipProgram } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hexOk = (s: string) => /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s);

// Create or edit the business's single membership program (VIP/club card).
// Owner-only; gated to plans with maxMemberships >= 1 (Negocio).
export async function POST(req: Request) {
  try {
    const session = await authenticate(req);
    if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

    const business = await getBusinessByOwner(session.uid);
    if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });
    if (effectivePlan(business).maxMemberships < 1) {
      return NextResponse.json({ error: "Las membresías están disponibles en el plan Negocio." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const programId = typeof body.programId === "string" ? body.programId : ""; // present = edit
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "Ponle un nombre a tu membresía." }, { status: 400 });

    const description = String(body.description || "").trim().slice(0, 240);
    const welcomeMessage = String(body.welcomeMessage || "").trim().slice(0, 240);
    const cardColorRaw = String(body.cardColor || "#1f2937").trim();
    const textColorRaw = String(body.textColor || "#FFFFFF").trim();
    const cardColor = hexOk(cardColorRaw) ? cardColorRaw : "#1f2937";
    const textColor = hexOk(textColorRaw) ? textColorRaw : "#FFFFFF";

    const tracksVisits = body.tracksVisits === true;
    // Visit allowance + membership length only matter for their respective modes.
    const rawLimit = Math.round(Number(body.defaultVisitLimit));
    const defaultVisitLimit = tracksVisits && Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : null;
    const rawDays = Math.round(Number(body.defaultDurationDays));
    const defaultDurationDays = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : null;

    // Optional logo (base64 PNG), resized like loyalty cards. "" clears it.
    let logoPng = "";
    if (typeof body.logo === "string" && body.logo.startsWith("data:image/")) {
      const b64 = body.logo.split(",")[1] || "";
      if (b64.length > 0 && b64.length < 2_000_000) {
        try {
          logoPng = (await sharp(Buffer.from(b64, "base64")).resize({ width: 480, height: 150, fit: "inside", withoutEnlargement: true }).png().toBuffer()).toString("base64");
        } catch {
          logoPng = "";
        }
      }
    }

    const fields = { businessId: business.id, name, description, welcomeMessage, cardColor, textColor, tracksVisits, defaultVisitLimit, defaultDurationDays, logoPng };

    if (programId) {
      const existing = await getMembershipProgram(programId);
      if (!existing || existing.businessId !== business.id) {
        return NextResponse.json({ error: "Membresía no encontrada." }, { status: 404 });
      }
      await adminDb().collection(COLLECTIONS.MEMBERSHIP_PROGRAMS).doc(programId).update(fields);
      return NextResponse.json({ program: { ...existing, ...fields } });
    }

    // Create — enforce the 1-per-business limit.
    const current = await getMembershipProgramByBusiness(business.id);
    if (current) return NextResponse.json({ error: "Ya tienes una membresía. Edítala en su lugar." }, { status: 409 });

    const ref = await adminDb().collection(COLLECTIONS.MEMBERSHIP_PROGRAMS).add({ ...fields, isActive: true, createdAt: Date.now() });
    return NextResponse.json({ program: { id: ref.id, ...fields, isActive: true } });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error del servidor" }, { status: 500 });
  }
}
