"use client";
import { useState } from "react";
import { authedFetch } from "@/lib/clientApi";
import { ConfirmBar } from "@/components/ConfirmBar";
import { StatCard, fmtDay, fmtDateTime } from "@/components/dashboard/shared";
import { StatusBadge, memberEventLabel } from "@/components/dashboard/membership/MembershipTab";
import { memberStatus, visitsRemaining } from "@/lib/membership";
import type { Member, MembershipProgram } from "@/lib/types";

/* The member roster and the per-member modal (renew, reset visits, deactivate,
   delete). Split out of app/dashboard/page.tsx. */

const AVATAR_COLORS = ["#ef4444", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6", "#6366f1"];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export function MembersList({ members, onSelect }: { members: Member[]; onSelect: (m: Member) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "soon" | "expired">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const now = Date.now();
  const SOON = 7 * 24 * 60 * 60 * 1000;
  const term = q.trim().toLowerCase();

  let list = members;
  if (filter !== "all") {
    list = list.filter((m) => {
      const st = memberStatus(m, now);
      if (filter === "active") return st === "active";
      if (filter === "expired") return st !== "active";
      return m.expiresAt != null && m.expiresAt >= now && m.expiresAt - now <= SOON; // soon
    });
  }
  if (term) list = list.filter((m) => [m.memberName, m.memberEmail, m.memberPhone, m.memberCode].some((v) => (v || "").toLowerCase().includes(term)));

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const shown = list.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (!members.length)
    return (
      <p className="vip-on-dark-muted" style={{ marginTop: 4 }}>
        Aún no tienes socios. Agrega el primero arriba.
      </p>
    );

  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ flex: "2 1 200px" }}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nombre, correo, teléfono o código"
        />
        <select
          className="input"
          style={{ flex: "1 1 130px", maxWidth: 180 }}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as typeof filter);
            setPage(0);
          }}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="soon">Por vencer</option>
          <option value="expired">Vencidos</option>
        </select>
      </div>
      {!shown.length && (
        <p className="vip-on-dark-muted" style={{ fontSize: 14 }}>
          Ningún socio coincide con el filtro.
        </p>
      )}
      {shown.map((m) => {
        const st = memberStatus(m, now);
        const rem = visitsRemaining(m);
        const contact = m.memberEmail || m.memberPhone || "";
        const active = st === "active";
        const DAY = 24 * 60 * 60 * 1000;
        const expSoon = active && m.expiresAt != null && m.expiresAt - now <= SOON;
        // Status accent: green = active, amber = expiring soon, red = lapsed/no visits.
        const accent = !active ? "#dc2626" : expSoon ? "#d97706" : "#16a34a";
        let venc = "Sin vencimiento";
        let vencColor: string | undefined;
        if (m.expiresAt != null) {
          if (m.expiresAt < now) {
            const d = Math.max(1, Math.ceil((now - m.expiresAt) / DAY));
            venc = `Venció hace ${d} día${d === 1 ? "" : "s"}`;
            vencColor = "#dc2626";
          } else {
            const d = Math.max(1, Math.ceil((m.expiresAt - now) / DAY));
            venc = `Vence en ${d} día${d === 1 ? "" : "s"}`;
            if (expSoon) vencColor = "#d97706";
          }
        }
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              width: "100%",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              border: "1px solid var(--border)",
              borderLeft: `4px solid ${accent}`,
              borderRadius: 12,
              background: active ? "#fff" : "#f3f4f6",
              marginBottom: 8,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                flex: "0 0 auto",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: active ? avatarColor(m.memberName || "?") : "#9ca3af",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {initials(m.memberName || "?")}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? undefined : "var(--text-secondary)" }}>{m.memberName}</strong>
              <span className="muted" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {contact ? `${contact} · ` : ""}
                {rem != null ? `${rem} visita(s)` : "Ilimitado"} · <span style={vencColor ? { color: vencColor, fontWeight: 600 } : undefined}>{venc}</span>
              </span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "0 0 auto" }}>
              <StatusBadge status={st} />
              <span className="code-pill">{m.memberCode}</span>
            </span>
          </button>
        );
      })}
      {pageCount > 1 && (
        <div className="row" style={{ justifyContent: "center", gap: 12, marginTop: 6 }}>
          <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            ← Anterior
          </button>
          <span className="muted" style={{ fontSize: 13 }}>
            {safePage + 1} / {pageCount}
          </span>
          <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

export function MemberModal({ member, program, onChanged, onClose }: { member: Member; program: MembershipProgram; onChanged: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [days, setDays] = useState("30");
  const st = memberStatus(member);
  const rem = visitsRemaining(member);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    try {
      const res = await authedFetch("/api/membership/member", { method: "PATCH", body: JSON.stringify({ memberId: member.id, ...body }) });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) return setErr(json.error || `No se pudo actualizar (${res.status}).`);
      onChanged();
      onClose();
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setErr("");
    setConfirmDel(false);
    try {
      const res = await authedFetch("/api/membership/member", { method: "DELETE", body: JSON.stringify({ memberId: member.id }) });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) return setErr(json.error || `No se pudo eliminar (${res.status}).`);
      onChanged();
      onClose();
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{member.memberName}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
          <StatusBadge status={st} />
          <span className="code-pill">{member.memberCode}</span>
        </div>

        <div className="stat-grid" style={{ marginBottom: 14 }}>
          <StatCard label="Visitas" value={program.tracksVisits ? `${member.visitsUsed || 0}${member.visitLimit != null ? ` / ${member.visitLimit}` : ""}` : "Ilimitado"} />
          <StatCard label="Vence" value={fmtDay(member.expiresAt)} />
          <StatCard label="Socio desde" value={fmtDay(member.createdAt)} />
          {member.lastVisitDate ? <StatCard label="Última visita" value={fmtDay(member.lastVisitDate)} /> : null}
        </div>

        {err && <div className="error-box">{err}</div>}

        <div className="field">
          <label>Renovar / extender</label>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input className="input" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} style={{ flex: "0 0 90px" }} />
            <button className="btn btn-primary" style={{ flex: "1 1 120px" }} disabled={busy} onClick={() => patch({ addDays: Number(days) || 0 })}>
              + {Number(days) || 0} días
            </button>
            {program.tracksVisits && (
              <button className="btn btn-outline" style={{ flex: "1 1 120px" }} disabled={busy} onClick={() => patch({ resetVisits: true })}>
                Reiniciar visitas
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>Tarjeta del socio (wallet)</label>
          <a className="btn btn-outline" style={{ width: "100%", textAlign: "center" }} href={`/m/card/${member.id}`} target="_blank" rel="noreferrer">
            Abrir / compartir tarjeta
          </a>
        </div>

        {confirmDel ? (
          <ConfirmBar
            message={`¿Eliminar a ${member.memberName}? Su tarjeta dejará de funcionar. Esta acción no se puede deshacer.`}
            confirmLabel="Sí, eliminar"
            onConfirm={remove}
            onCancel={() => setConfirmDel(false)}
            busy={busy}
          />
        ) : (
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {st !== "expired" && (
              <button className="btn btn-outline" style={{ flex: "1 1 120px" }} disabled={busy} onClick={() => patch({ deactivate: true })}>
                Desactivar
              </button>
            )}
            <button className="btn btn-ghost" style={{ flex: "1 1 120px", color: "#c62828" }} disabled={busy} onClick={() => setConfirmDel(true)}>
              Eliminar
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>Historial</h4>
          {(() => {
            const events = [...(member.history || [])].sort((a, b) => b.t - a.t);
            if (!events.length)
              return (
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  Sin actividad todavía.
                </p>
              );
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {events.map((e, i) => (
                  <div key={i} className="row spread" style={{ alignItems: "baseline", gap: 12, fontSize: 13 }}>
                    <span>{memberEventLabel(e)}</span>
                    <span className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                      {fmtDateTime(e.t)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
