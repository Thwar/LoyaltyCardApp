"use client";
import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/clientApi";
import { ConfirmBar } from "@/components/ConfirmBar";
import { DetailRow, fmtDate } from "@/components/dashboard/shared";
import type { Business, CustomerCard, LoyaltyCard } from "@/lib/types";

/* A casero as the dashboard shows them: one person, who may hold several cards
   at the same business. Split out of app/dashboard/page.tsx. */

export interface Client {
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  consent: boolean;
  createdAt?: number;
  lastStampDate?: number;
  memberships: CustomerCard[];
}

// Group memberships into one entry per person (shared customerId). Identity is
// taken from the memberships; consent is client-level (any opt-in counts), which
// also smooths over the per-card consent-snapshot drift.
export function groupClients(memberships: CustomerCard[]): Client[] {
  const map = new Map<string, Client>();
  for (const m of memberships) {
    const key = m.customerId || m.id;
    let cl = map.get(key);
    if (!cl) {
      cl = { customerId: key, name: m.customerName || "Casero", consent: false, memberships: [] };
      map.set(key, cl);
    }
    cl.memberships.push(m);
    if (m.customerName && cl.name === "Casero") cl.name = m.customerName;
    if (!cl.email && m.customerEmail) cl.email = m.customerEmail;
    if (!cl.phone && m.customerPhone) cl.phone = m.customerPhone;
    if (m.marketingConsent === true) cl.consent = true;
    if (m.createdAt && (cl.createdAt == null || m.createdAt < cl.createdAt)) cl.createdAt = m.createdAt;
    if (m.lastStampDate && (cl.lastStampDate == null || m.lastStampDate > cl.lastStampDate)) cl.lastStampDate = m.lastStampDate;
  }
  return [...map.values()];
}

export function ClientModal({
  client,
  cardsById,
  plan,
  onChanged,
  onClose,
  cajero = false,
}: {
  client: Client;
  cardsById: Map<string, LoyaltyCard>;
  plan?: Business["plan"];
  onChanged: () => void;
  onClose: () => void;
  cajero?: boolean;
}) {
  const paid = plan === "cafe" || plan === "negocio";
  const canSeeContact = paid && client.consent;
  const hasRemovedPass = client.memberships.some((m) => m.passRemovedAt);
  const totalRewards = client.memberships.reduce((s, m) => s + (m.rewardsRedeemed || 0), 0);
  const totalStamps = client.memberships.reduce((s, m) => s + (m.rewardsRedeemed || 0) * (cardsById.get(m.loyaltyCardId)?.totalSlots ?? 0) + m.currentStamps, 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nCards = client.memberships.length;
  const deleteMsg =
    nCards > 1
      ? `¿Eliminar a ${client.name} y sus ${nCards} tarjetas? Se borran sus datos. No se puede deshacer.`
      : `¿Eliminar a ${client.name}? Se borra su tarjeta y datos. No se puede deshacer.`;

  async function deleteClient() {
    setBusy(true);
    setErr("");
    setConfirmDel(false);
    try {
      const res = await authedFetch("/api/business/customer", {
        method: "DELETE",
        body: JSON.stringify({ customerCardIds: client.memberships.map((m) => m.id) }),
      });
      if (res.ok) {
        onChanged();
        onClose();
        return;
      }
      const j = await res.json().catch(() => ({} as { error?: string }));
      setErr(j.error || `No se pudo eliminar (${res.status}).`);
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>{client.name}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {hasRemovedPass && !confirmDel && (
          <div className="warn-box" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>Este casero eliminó su pase del wallet.</span>
            {!cajero && (
              <button className="btn btn-sm" style={{ width: "auto", background: "#c62828", color: "#fff", flex: "0 0 auto" }} onClick={() => setConfirmDel(true)} disabled={busy}>
                {busy ? "Eliminando…" : "Eliminar casero"}
              </button>
            )}
          </div>
        )}
        {confirmDel && (
          <div style={{ marginBottom: 10 }}>
            <ConfirmBar message={deleteMsg} confirmLabel="Sí, eliminar" onConfirm={deleteClient} onCancel={() => setConfirmDel(false)} busy={busy} />
          </div>
        )}
        {err && (
          <div className="error-box" style={{ marginBottom: 10 }}>
            {err}
          </div>
        )}

        <div className="detail-list">
          <DetailRow label="Casero desde" value={fmtDate(client.createdAt)} />
          <DetailRow label="Última visita" value={fmtDate(client.lastStampDate)} />
          <DetailRow label="Recompensas canjeadas" value={String(totalRewards)} />
          <DetailRow label="Sellos acumulados" value={String(totalStamps)} />
        </div>

        {!cajero && (
          <>
            <h4 style={{ margin: "16px 0 4px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>Contacto</h4>
            {canSeeContact ? (
              <div className="detail-list">
                <DetailRow label="Correo" value={client.email || "—"} />
                <DetailRow label="Teléfono" value={client.phone || "No proporcionado"} />
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {!paid ? "🔒 Mejora a un plan Café o Negocio para ver el correo y teléfono de tus caseros." : "Este casero no autorizó compartir su contacto para fines de marketing."}
              </div>
            )}
          </>
        )}

        <h4 style={{ margin: "16px 0 4px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>Tarjetas ({client.memberships.length})</h4>
        <div className="detail-list">
          {client.memberships.map((m) => {
            const card = cardsById.get(m.loyaltyCardId);
            const slots = card?.totalSlots ?? 0;
            const total = (m.rewardsRedeemed || 0) * slots + m.currentStamps;
            return (
              <div key={m.id} className="cust-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {card?.rewardDescription || "Tarjeta"}
                    {m.passRemovedAt ? <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#c62828" }}>· pase eliminado</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {m.currentStamps}/{slots} sellos · {m.rewardsRedeemed || 0} canjes · {total} acumulados
                  </div>
                </div>
                {!cajero && <span className="code-pill">{m.cardCode}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
