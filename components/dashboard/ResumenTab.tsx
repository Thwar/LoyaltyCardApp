"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { authedFetch } from "@/lib/clientApi";
import { StampBox } from "@/components/dashboard/StampBox";
import { groupClients, type Client } from "@/components/dashboard/ClientModal";
import { StatCard } from "@/components/dashboard/shared";
import type { CustomerCard, LoyaltyCard } from "@/lib/types";
import type { PlanInfo } from "@/lib/plans";

/* Resumen tab: headline stats, the stamping tool, and the client list.
   Split out of app/dashboard/page.tsx. */

/* ---------- Resumen tab: analytics, client limit, stamping, recent clients ---------- */
export function ResumenTab({
  cards,
  customers,
  count,
  planInfo,
  onChanged,
  onSelect,
  onShowQr,
  cajero = false,
}: {
  cards: LoyaltyCard[];
  customers: CustomerCard[];
  count: number;
  planInfo: PlanInfo;
  onChanged: () => void;
  onSelect: (c: Client) => void;
  onShowQr?: () => void; // owner only: jump to the Tarjetas tab (enrollment QR)
  cajero?: boolean;
}) {
  const [sortBy, setSortBy] = useState<"recent" | "stamps" | "rewards" | "closest">("recent");
  const [page, setPage] = useState(0);
  const [filterCardId, setFilterCardId] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const [chartRange, setChartRange] = useState<string>("6m");
  const [chartMetric, setChartMetric] = useState<"nuevos" | "visitas">("nuevos");
  const [hoverPt, setHoverPt] = useState<number | null>(null);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await authedFetch("/api/business/customers/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "caseros.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const slotsOf = (m: CustomerCard) => cardsById.get(m.loyaltyCardId)?.totalSlots ?? 0;

  // Filter memberships to one card (or all), then group into people for the list.
  const filtered = filterCardId === "all" ? customers : customers.filter((c) => c.loyaltyCardId === filterCardId);
  const lifetimeStamps = (cl: Client) => cl.memberships.reduce((s, m) => s + (m.rewardsRedeemed || 0) * slotsOf(m) + m.currentStamps, 0);
  const totalRedeemed = (cl: Client) => cl.memberships.reduce((s, m) => s + (m.rewardsRedeemed || 0), 0);
  const remainingToComplete = (cl: Client) => {
    let best = 9999; // clients with no in-progress card sort last
    for (const m of cl.memberships) {
      const s = slotsOf(m);
      if (s > 0 && m.currentStamps < s) best = Math.min(best, s - m.currentStamps);
    }
    return best;
  };
  const clients = groupClients(filtered).sort((a, b) => {
    if (sortBy === "stamps") return lifetimeStamps(b) - lifetimeStamps(a);
    if (sortBy === "rewards") return totalRedeemed(b) - totalRedeemed(a);
    if (sortBy === "closest") return remainingToComplete(a) - remainingToComplete(b);
    return (b.lastStampDate || b.createdAt || 0) - (a.lastStampDate || a.createdAt || 0);
  });

  const completed = filtered.filter((c) => slotsOf(c) > 0 && c.currentStamps >= slotsOf(c)).length;
  const rewards = filtered.reduce((s, c) => s + (c.rewardsRedeemed || 0), 0);
  const stampsGiven = filtered.reduce((s, c) => s + (c.rewardsRedeemed || 0) * slotsOf(c) + c.currentStamps, 0);

  // Advanced analytics (paid). Derived from the in-memory client list — no backend.
  const since30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const nuevos = clients.filter((c) => (c.createdAt || 0) >= since30).length;
  const activos = clients.filter((c) => (c.lastStampDate || 0) >= since30).length;
  const inactivos = clients.length - activos;
  // A client "returned" if their lifetime stamps exceed the single welcome stamp.
  const returned = clients.filter((c) => c.memberships.reduce((s, m) => s + (m.rewardsRedeemed || 0) * slotsOf(m) + m.currentStamps, 0) > 1).length;
  const retencion = clients.length ? Math.round((returned / clients.length) * 100) : 0;
  const aboutToWin = filtered.filter((m) => slotsOf(m) > 0 && m.currentStamps === slotsOf(m) - 1).length;
  const avgStamps = clients.length ? Math.round((stampsGiven / clients.length) * 10) / 10 : 0;

  // Filterable time series for the analytics chart (metric + range; day or month buckets).
  const CHART_RANGES = [
    { id: "3d", label: "Últimos 3 días", unit: "day", count: 3 },
    { id: "7d", label: "Última semana", unit: "day", count: 7 },
    { id: "30d", label: "Último mes", unit: "day", count: 30 },
    { id: "6m", label: "Últimos 6 meses", unit: "month", count: 6 },
    { id: "12m", label: "Últimos 12 meses", unit: "month", count: 12 },
  ] as const;
  const range = CHART_RANGES.find((r) => r.id === chartRange) ?? CHART_RANGES[3];
  const series = (() => {
    const now = new Date();
    const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const monKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
    const buckets =
      range.unit === "day"
        ? Array.from({ length: range.count }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (range.count - 1 - i));
            const lab = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
            return { key: dayKey(d), label: lab, full: lab, count: 0 };
          })
        : Array.from({ length: range.count }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (range.count - 1 - i), 1);
            const m = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
            const full = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
            return { key: monKey(d), label: m.charAt(0).toUpperCase() + m.slice(1), full: full.charAt(0).toUpperCase() + full.slice(1), count: 0 };
          });
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const c of clients) {
      const ts = chartMetric === "nuevos" ? c.createdAt : c.lastStampDate;
      if (!ts) continue;
      const d = new Date(ts);
      const i = idx.get(range.unit === "day" ? dayKey(d) : monKey(d));
      if (i != null) buckets[i].count++;
    }
    return buckets;
  })();
  const seriesMax = Math.max(1, ...series.map((s) => s.count));

  // The client limit is business-wide (uses the distinct count), only on the free tier.
  const limit = planInfo.maxClients; // null = unlimited (paid plans)
  const pct = limit != null ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const nearLimit = limit != null && count >= limit * 0.8;
  const limitLabel = limit != null ? `${count} / ${limit}` : "";
  const atLimit = limit != null && count >= limit;
  const remainingText =
    limit == null
      ? ""
      : atLimit
        ? "Alcanzaste el límite de tu plan. Los nuevos caseros no pueden inscribirse hasta que mejores tu plan."
        : `Te quedan ${limit - count} caseros en tu plan ${planInfo.label}.`;
  const upgradeHref = `https://wa.me/59175983004?text=${encodeURIComponent("Hola, quiero mejorar mi plan de SoyCasero para tener más caseros.")}`;
  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const shown = clients.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      {limit != null && (
        <div
          className="card"
          style={{
            // Neutral until ~80% of the cap — red is reserved for when it matters.
            ...(nearLimit ? { border: "1px solid #e0796f", background: "#fbdedb" } : {}),
            marginTop: 14,
            marginBottom: 16,
          }}
        >
          <div className="row spread" style={{ alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 17, margin: 0 }}>👥 Caseros activos</h3>
            <span style={{ fontWeight: 800, fontSize: 22, color: nearLimit ? "#c62828" : "inherit" }}>{limitLabel}</span>
          </div>
          <div className="progress" style={nearLimit ? { background: "#fff" } : undefined}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: nearLimit ? "#c62828" : undefined }} />
          </div>
          <p style={{ fontSize: 14, marginTop: 10, marginBottom: 0, color: nearLimit ? "#c62828" : "var(--text-secondary)", fontWeight: nearLimit ? 600 : 400 }}>
            {atLimit ? "⚠️ " : ""}
            {remainingText}
          </p>
          {nearLimit && !cajero && (
            <a className="btn btn-primary mt" href={upgradeHref} target="_blank" rel="noreferrer" style={{ width: "auto" }}>
              Mejorar mi plan
            </a>
          )}
        </div>
      )}

      <StampBox onChanged={onChanged} />

      {cards.length > 1 && (
        <div className="field mt">
          <label>Tarjeta</label>
          <select
            className="input"
            value={filterCardId}
            onChange={(e) => {
              setFilterCardId(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Todas las tarjetas</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rewardDescription || "Tarjeta"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="stat-grid mt">
        <StatCard label="Caseros" value={clients.length} />
        <StatCard label="Tarjetas completas" value={completed} />
        <StatCard label="Recompensas canjeadas" value={rewards} />
        <StatCard label="Sellos otorgados" value={stampsGiven} />
      </div>

      <div className="card mt" style={{ position: "relative", overflow: "hidden" }}>
        <h3 style={{ fontSize: 18, margin: "0 0 12px" }}>Analíticas avanzadas</h3>
        <div style={planInfo.paid ? undefined : { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }} aria-hidden={!planInfo.paid}>
          <div className="stat-grid">
            <StatCard label="Nuevos (30 días)" value={nuevos} />
            <StatCard label="Activos (30 días)" value={activos} />
            <StatCard label="Inactivos" value={inactivos} />
            <StatCard label="Tasa de retorno" value={`${retencion}%`} />
            <StatCard label="A 1 sello del premio" value={aboutToWin} />
            <StatCard label="Sellos por casero" value={avgStamps} />
          </div>

          <div className="row spread" style={{ alignItems: "center", margin: "20px 0 6px", flexWrap: "wrap", gap: 8 }}>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)", margin: 0 }}>
              {chartMetric === "nuevos" ? "Nuevos caseros" : "Visitas recientes"}
            </h4>
            <div className="row" style={{ width: "auto", gap: 8 }}>
              <select className="input" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={chartMetric} onChange={(e) => setChartMetric(e.target.value as "nuevos" | "visitas")}>
                <option value="nuevos">Nuevos caseros</option>
                <option value="visitas">Visitas recientes</option>
              </select>
              <select className="input" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }} value={chartRange} onChange={(e) => setChartRange(e.target.value)}>
                {CHART_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(() => {
            const W = 620,
              H = 204,
              padL = 44,
              padR = 16,
              padTop = 22,
              padBottom = 36;
            const innerW = W - padL - padR;
            const innerH = H - padTop - padBottom;
            const n = series.length;
            const cx = (i: number) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
            const cy = (v: number) => padTop + innerH - (v / seriesMax) * innerH;
            const line = series.map((s, i) => `${cx(i)},${cy(s.count)}`).join(" ");
            const area = `M ${cx(0)},${padTop + innerH} ` + series.map((s, i) => `L ${cx(i)},${cy(s.count)}`).join(" ") + ` L ${cx(n - 1)},${padTop + innerH} Z`;
            const gridVals = Array.from(new Set([0, 0.5, 1].map((f) => Math.round(seriesMax * f))));
            const labelEvery = Math.max(1, Math.ceil(n / 8));
            const showValues = n <= 12;
            const band = n <= 1 ? innerW : innerW / (n - 1);
            const noun = chartMetric === "nuevos" ? "nuevos" : "visitas";
            return (
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} onMouseLeave={() => setHoverPt(null)}>
                {gridVals.map((v) => (
                  <g key={v}>
                    <line x1={padL} y1={cy(v)} x2={W - padR} y2={cy(v)} stroke="var(--border)" strokeWidth="1" />
                    <text x={padL - 8} y={cy(v) + 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                      {v}
                    </text>
                  </g>
                ))}
                {/* axis titles */}
                <text transform={`rotate(-90 13 ${padTop + innerH / 2})`} x={13} y={padTop + innerH / 2} textAnchor="middle" fontSize="10" fontWeight="700" fill="#9ca3af">
                  CLIENTES
                </text>
                <text x={padL + innerW / 2} y={H - 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#9ca3af">
                  {range.unit === "day" ? "FECHA" : "MES"}
                </text>

                <path d={area} fill="var(--primary)" opacity="0.08" />
                <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {series.map((s, i) => (
                  <g key={s.key}>
                    <circle cx={cx(i)} cy={cy(s.count)} r={hoverPt === i ? 5 : 3} fill="var(--primary)" />
                    {showValues && hoverPt == null && (
                      <text x={cx(i)} y={cy(s.count) - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">
                        {s.count}
                      </text>
                    )}
                    {(i % labelEvery === 0 || i === n - 1) && (
                      <text x={cx(i)} y={padTop + innerH + 16} textAnchor="middle" fontSize="10" fill="#9ca3af">
                        {s.label}
                      </text>
                    )}
                  </g>
                ))}
                {/* hover hit areas */}
                {series.map((s, i) => (
                  <rect key={`hit-${i}`} x={cx(i) - band / 2} y={padTop} width={band} height={innerH} fill="transparent" style={{ cursor: "pointer" }} onMouseEnter={() => setHoverPt(i)} />
                ))}
                {/* tooltip */}
                {hoverPt != null &&
                  (() => {
                    const s = series[hoverPt];
                    const px = cx(hoverPt);
                    const tw = 124,
                      th = 40;
                    const tx = Math.max(2, Math.min(W - tw - 2, px - tw / 2));
                    const ty = Math.max(2, cy(s.count) - th - 12);
                    return (
                      <g pointerEvents="none">
                        <line x1={px} y1={padTop} x2={px} y2={padTop + innerH} stroke="var(--primary)" strokeWidth="1" opacity="0.35" />
                        <rect x={tx} y={ty} width={tw} height={th} rx="8" fill="#1f2937" />
                        <text x={tx + tw / 2} y={ty + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                          {s.full}
                        </text>
                        <text x={tx + tw / 2} y={ty + 31} textAnchor="middle" fontSize="11" fill="#e5e7eb">
                          {s.count} {noun}
                        </text>
                      </g>
                    );
                  })()}
              </svg>
            );
          })()}
        </div>
        {!planInfo.paid && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: "rgba(255,255,255,0.55)",
              textAlign: "center",
              padding: 16,
            }}
          >
            <Lock size={22} aria-hidden />
            <strong>Analíticas avanzadas</strong>
            <span className="muted" style={{ fontSize: 13, maxWidth: 300 }}>
              Mejora al plan Café o Negocio para ver retención, caseros en riesgo y más.
            </span>
          </div>
        )}
      </div>

      <div className="card mt">
        <div className="row spread" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>Caseros</h3>
          <div className="row" style={{ width: "auto", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {clients.length > 0 && (
              <select
                className="input"
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "recent" | "stamps" | "rewards" | "closest");
                  setPage(0);
                }}
              >
                <option value="recent">Visita más reciente</option>
                <option value="stamps">Más sellos</option>
                <option value="rewards">Más recompensas</option>
                <option value="closest">Cerca de completar</option>
              </select>
            )}
            {!cajero &&
              clients.length > 0 &&
              (planInfo.paid ? (
                <button className="btn btn-sm btn-outline" style={{ width: "auto" }} onClick={exportCsv} disabled={exporting}>
                  {exporting ? "Exportando…" : "Exportar CSV"}
                </button>
              ) : (
                <span title="Mejora a un plan de pago para exportar tus caseros" style={{ display: "inline-flex" }}>
                  <button className="btn btn-sm btn-outline" style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.6, cursor: "not-allowed" }} disabled>
                    <Lock size={14} aria-hidden /> Exportar CSV
                  </button>
                </span>
              ))}
          </div>
        </div>
        {clients.length === 0 ? (
          <div className="mt">
            <p className="muted" style={{ marginBottom: onShowQr ? 12 : 0 }}>
              Aún no tienes caseros. Comparte el QR de tu tarjeta en el mostrador para inscribir al primero.
            </p>
            {onShowQr && (
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={onShowQr}>
                Ver mi QR de inscripción
              </button>
            )}
          </div>
        ) : (
          <div className="mt">
            {shown.map((cl) => {
              const single = cl.memberships.length === 1 ? cl.memberships[0] : null;
              return (
                <div
                  key={cl.customerId}
                  className="cust-row clickable"
                  style={single?.passRemovedAt ? { opacity: 0.55 } : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(cl)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(cl)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{cl.name}</div>
                    <div className="muted">{single ? `${single.currentStamps}/${slotsOf(single)} sellos` : `${cl.memberships.length} tarjetas`}</div>
                  </div>
                  <div className="row" style={{ width: "auto", gap: 10, alignItems: "center" }}>
                    {!cajero && single && <span className="code-pill">{single.cardCode}</span>}
                    <span aria-hidden style={{ color: "var(--text-secondary)", fontSize: 20, lineHeight: 1 }}>
                      ›
                    </span>
                  </div>
                </div>
              );
            })}
            {clients.length > PAGE_SIZE && (
              <div className="row spread" style={{ alignItems: "center", marginTop: 12 }}>
                <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
                  ← Anterior
                </button>
                <span className="muted" style={{ fontSize: 13 }}>
                  {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, clients.length)} de {clients.length}
                </span>
                <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
