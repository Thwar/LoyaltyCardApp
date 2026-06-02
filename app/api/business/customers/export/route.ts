import { NextResponse } from "next/server";
import { authenticate } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";
import { COLLECTIONS, type CustomerCard } from "@/lib/types";
import { getBusinessByOwner, getLoyaltyCardsByBusiness } from "@/lib/serverData";
import { effectivePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fmt(ts?: number): string {
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

// Download the business's customer list as CSV. Paid plans only.
export async function GET(req: Request) {
  const session = await authenticate(req);
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: session.status });

  const business = await getBusinessByOwner(session.uid);
  if (!business) return NextResponse.json({ error: "Primero crea tu negocio." }, { status: 400 });
  if (!effectivePlan(business).paid) {
    return NextResponse.json({ error: "Exportar clientes es una función de los planes de pago." }, { status: 403 });
  }

  const cards = await getLoyaltyCardsByBusiness(business.id);
  const cardName = new Map(cards.map((c) => [c.id, c.rewardDescription || ""]));
  const snap = await adminDb().collection(COLLECTIONS.CUSTOMER_CARDS).where("businessId", "==", business.id).get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerCard, "id">) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const header = ["Nombre", "Correo", "Teléfono", "Código", "Sellos", "Recompensas canjeadas", "Tarjeta", "Cliente desde", "Última visita", "Consentimiento marketing"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.customerName,
        r.customerEmail,
        r.customerPhone,
        r.cardCode,
        r.currentStamps ?? 0,
        r.rewardsRedeemed ?? 0,
        cardName.get(r.loyaltyCardId) || "",
        fmt(r.createdAt),
        fmt(r.lastStampDate),
        r.marketingConsent ? "Sí" : "No",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  // BOM so Excel reads UTF-8 (accents) correctly; CRLF line endings.
  const csv = "﻿" + lines.join("\r\n");
  const safe = (business.name || "clientes").replace(/[^a-z0-9]/gi, "_");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safe}_clientes.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
