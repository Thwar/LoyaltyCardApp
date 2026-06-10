import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type Member } from "@/lib/types";
import { getBusinessByOwner, getMembershipProgramByBusiness } from "@/lib/serverData";
import { memberStatus, visitsRemaining, MEMBER_STATUS_LABEL } from "@/lib/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fmt(ts?: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/La_Paz",
  });
}

// Download the membership member list as CSV (Excel-friendly). Owner only.
export async function GET(req: Request) {
  const session = await authenticate(req);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

  const business = await getBusinessByOwner(session.uid);
  if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });
  const program = await getMembershipProgramByBusiness(business.id);
  if (!program) return NextResponse.json({ error: "Primero crea tu membresía." }, { status: 400 });

  const snap = await adminDb().collection(COLLECTIONS.MEMBERS).where("businessId", "==", business.id).get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const header = ["Nombre", "Correo", "Teléfono", "Código", "Estado", "Vence", "Visitas usadas", "Visitas restantes", "Socio desde", "Última visita", "Consentimiento marketing"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const rem = visitsRemaining(r);
    lines.push(
      [
        r.memberName,
        r.memberEmail,
        r.memberPhone,
        r.memberCode,
        MEMBER_STATUS_LABEL[memberStatus(r)],
        r.expiresAt != null ? fmt(r.expiresAt) : "Sin vencimiento",
        r.visitsUsed ?? 0,
        rem != null ? rem : "Ilimitado",
        fmt(r.createdAt),
        fmt(r.lastVisitDate),
        r.marketingConsent ? "Sí" : "No",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  // BOM so Excel reads UTF-8 (accents) correctly; CRLF line endings.
  const csv = "﻿" + lines.join("\r\n");
  const safe = (program.name || "socios").replace(/[^a-z0-9]/gi, "_");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}_socios.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
