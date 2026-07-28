"use client";
import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { authedFetch } from "@/lib/clientApi";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CardPreview } from "@/components/CardPreview";
import { DetailRow, fmtDate } from "@/components/dashboard/shared";
import type { StampShape } from "@/lib/types";

/* The counter's stamping flow: resolve a code, show the casero's card, then act.
   Split out of app/dashboard/page.tsx. */

// What /api/stamp returns for a lookupOnly probe — the card as it stands right
// now, before anything is written.
export interface CardLookup {
  cardCode: string;
  customerName: string;
  businessName: string;
  currentStamps: number;
  totalSlots: number;
  remaining: number;
  completed: boolean;
  rewardsRedeemed: number;
  rewardDescription: string;
  cardColor: string;
  textColor: string;
  stampShape: StampShape;
  lastStampDate: number | null;
  createdAt: number | null;
}

export function StampBox({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "full"; text: string } | null>(null);
  // The scanned/typed card, resolved but untouched. Scanning no longer stamps on
  // its own: the counter confirms who it is (and how many sellos) first.
  const [lookup, setLookup] = useState<CardLookup | null>(null);

  async function openCard(override?: string) {
    if (busy) return; // guard against double-submit (Enter + click, double-tap, scan)
    const cc = (override ?? code).trim();
    if (!cc) return setMsg({ kind: "err", text: "Ingresa el código del casero." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await authedFetch("/api/stamp", { method: "POST", body: JSON.stringify({ cardCode: cc, lookupOnly: true }) });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) return setMsg({ kind: "err", text: json.error || `No se pudo leer la tarjeta (${res.status}).` });
      setLookup(json as CardLookup);
      setCode("");
    } catch {
      setMsg({ kind: "err", text: "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt">
      <h3 style={{ fontSize: 18 }}>Sumar sellos</h3>
      <p className="muted">Escanea la tarjeta del casero o escribe su código. Verás su tarjeta antes de sumar, y podrás elegir cuántos sellos dar.</p>
      {msg && <div className={msg.kind === "err" ? "error-box" : msg.kind === "full" ? "warn-box" : "success-box"}>{msg.text}</div>}

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          inputMode="numeric"
          placeholder="Ej: 482"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openCard()}
          style={{ flex: "1 1 120px" }}
        />
        <button className="btn" style={{ flex: "0 0 auto", width: "auto", background: "#e53935", color: "#fff" }} onClick={() => openCard()} disabled={busy}>
          {busy ? "…" : "Buscar"}
        </button>
        <button className="btn btn-outline" style={{ flex: "0 0 auto", width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setScanning(true)} disabled={busy}>
          <ScanLine size={16} aria-hidden /> Escanear
        </button>
      </div>

      {scanning && (
        <BarcodeScanner
          onDetected={(value) => {
            setScanning(false);
            openCard(value);
          }}
          onClose={() => setScanning(false)}
        />
      )}

      {lookup && (
        <StampModal
          // Keyed by code so looking up a second casero can never inherit the
          // previous one's quantity or card state.
          key={lookup.cardCode}
          lookup={lookup}
          // `wrote` is true when sellos were already added and the counter closed
          // instead of redeeming — the dashboard behind us is stale either way.
          onClose={(wrote) => {
            setLookup(null);
            if (wrote) onChanged();
          }}
          onDone={(text, kind) => {
            setMsg({ kind, text });
            setLookup(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* Scanned card: who it is, where they're at, and how many sellos to give.
   A full card offers the redeem instead — the two actions are never both live,
   so there's no standalone redeem button to mis-tap. */
function StampModal({ lookup, onClose, onDone }: { lookup: CardLookup; onClose: (wrote: boolean) => void; onDone: (text: string, kind: "ok" | "full") => void }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Live view of the card: after adding sellos we stay open showing the new
  // total, so a card that just filled up can be redeemed without re-scanning.
  const [state, setState] = useState({ currentStamps: lookup.currentStamps, rewardsRedeemed: lookup.rewardsRedeemed });
  // Sellos already committed in this modal. Closing after that must refresh the
  // dashboard behind it, or the counter sees a stale balance.
  const [wrote, setWrote] = useState(false);

  const remaining = Math.max(0, lookup.totalSlots - state.currentStamps);
  const full = remaining === 0;
  const maxQty = Math.max(1, remaining);
  const step = (d: number) => setQty((q) => Math.min(maxQty, Math.max(1, q + d)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(wrote);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, wrote]);

  // Keep the stepper inside what the card can still take.
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), maxQty));
  }, [maxQty]);

  async function submit(redeem: boolean) {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await authedFetch("/api/stamp", {
        method: "POST",
        body: JSON.stringify({ cardCode: lookup.cardCode, redeem, ...(redeem ? {} : { count: qty }) }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) return setErr(json.error || `No se pudo completar (${res.status}).`);

      if (json.redeemed) {
        onDone(`🎁 Recompensa canjeada para ${lookup.customerName || "el casero"}. Su tarjeta se reinició.`, "ok");
        return;
      }
      // Stay open on the updated card so a now-full card can be redeemed here.
      setWrote(true);
      setState({ currentStamps: json.currentStamps, rewardsRedeemed: state.rewardsRedeemed });
      setQty(1);
      if (json.completed) {
        setErr("");
      } else {
        const n = json.added ?? qty;
        onDone(`✅ ${n} sello${n === 1 ? "" : "s"} para ${lookup.customerName || "el casero"}: ${json.currentStamps}/${json.totalSlots}`, "ok");
      }
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(wrote)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>{lookup.customerName || "Casero"}</h3>
          <button className="modal-close" onClick={() => onClose(wrote)} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
          <span className="code-pill">{lookup.cardCode}</span>
          <span className="muted" style={{ fontSize: 13 }}>
            {state.currentStamps}/{lookup.totalSlots} sellos
          </span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <CardPreview
            businessName={lookup.businessName}
            totalSlots={lookup.totalSlots}
            currentStamps={state.currentStamps}
            pendingStamps={full ? 0 : qty}
            rewardDescription={lookup.rewardDescription}
            cardColor={lookup.cardColor}
            textColor={lookup.textColor}
            stampShape={lookup.stampShape}
          />
        </div>

        <div className="detail-list" style={{ marginBottom: 14 }}>
          <DetailRow label="Recompensas canjeadas" value={String(state.rewardsRedeemed)} />
          <DetailRow label="Última visita" value={fmtDate(lookup.lastStampDate ?? undefined)} />
          <DetailRow label="Casero desde" value={fmtDate(lookup.createdAt ?? undefined)} />
        </div>

        {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

        {full ? (
          <>
            <div className="warn-box" style={{ marginBottom: 10 }}>
              🎁 Tarjeta completa ({state.currentStamps}/{lookup.totalSlots}) — {lookup.rewardDescription || "recompensa lista"}.
            </div>
            <button className="btn" style={{ background: "#15803d", color: "#fff" }} onClick={() => submit(true)} disabled={busy}>
              {busy ? "Canjeando…" : "🎁 Canjear recompensa"}
            </button>
          </>
        ) : (
          <>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>¿Cuántos sellos?</label>
            <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
              <button
                className="btn btn-outline"
                style={{ width: 52, flex: "0 0 auto", fontSize: 22, padding: "6px 0" }}
                onClick={() => step(-1)}
                disabled={busy || qty <= 1}
                aria-label="Menos sellos"
              >
                −
              </button>
              <div style={{ flex: "1 1 auto", textAlign: "center", fontSize: 30, fontWeight: 800, lineHeight: 1.1 }} aria-live="polite">
                {qty}
              </div>
              <button
                className="btn btn-outline"
                style={{ width: 52, flex: "0 0 auto", fontSize: 22, padding: "6px 0" }}
                onClick={() => step(1)}
                disabled={busy || qty >= maxQty}
                aria-label="Más sellos"
              >
                +
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 12 }}>
              Quedan {remaining} para completar la tarjeta.
            </p>
            <button className="btn" style={{ background: "#e53935", color: "#fff" }} onClick={() => submit(false)} disabled={busy}>
              {busy ? "Sumando…" : `Sumar ${qty} sello${qty === 1 ? "" : "s"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
