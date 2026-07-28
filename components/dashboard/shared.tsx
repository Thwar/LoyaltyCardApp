"use client";
import type { ReactNode } from "react";

// Small presentational pieces and date formatters shared across the dashboard's
// tabs and modals. Split out of app/dashboard/page.tsx, which had grown past 3k
// lines; these are the bits several of those components need in common.
//
// All dates are pinned to Bolivia time — the server runs UTC, so formatting in
// the browser's own zone would show the wrong hour for a business in La Paz.
const TZ = "America/La_Paz";

// "17 de junio de 2026 a las 20:09" — the long form, for detail rows.
export function fmtDate(ts?: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ,
    });
  } catch {
    return "—";
  }
}

// "17 jun 2026" — compact, for table cells and stat tiles.
export function fmtDay(ts?: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

// "17 jun 2026, 20:09" — for activity/history lists.
export function fmtDateTime(ts?: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  }
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
