"use client";
import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { authedFetch } from "@/lib/clientApi";
import { ConfirmBar } from "@/components/ConfirmBar";
import { SEGMENTS, inSegment, type Segment } from "@/lib/segments";
import type { Business, CustomerCard, LoyaltyCard } from "@/lib/types";
import type { PlanInfo } from "@/lib/plans";

/* Comunicación tab: compose and send a broadcast to a segment of caseros.
   Split out of app/dashboard/page.tsx. */

/* ---------- Comunicación tab: broadcast a message to all customers ---------- */
// "2h y 13m 20s" / "13m 20s" / "20s"
function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h y ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// Lock-screen-style mockup of how a broadcast lands on the casero's phone:
// icon (logo on the card color) + business name + the live message text.
function NotifPreview({ businessName, logoPng, color, text }: { businessName: string; logoPng?: string; color: string; text: string }) {
  const empty = !text;
  return (
    <div style={{ background: "linear-gradient(160deg, #1e293b, #3b4d68)", borderRadius: 14, padding: "18px 14px 12px" }}>
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: 14,
          padding: "10px 12px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          maxWidth: 420,
          margin: "0 auto",
          boxShadow: "0 10px 24px rgba(0,0,0,0.3)",
        }}
      >
        <span
          style={{
            flex: "0 0 auto",
            width: 38,
            height: 38,
            borderRadius: 9,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {logoPng ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/png;base64,${logoPng}`} alt="" style={{ maxWidth: "84%", maxHeight: "84%", objectFit: "contain" }} />
          ) : (
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>{(businessName[0] || "S").toUpperCase()}</span>
          )}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <strong style={{ fontSize: 13.5, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{businessName}</strong>
            <span style={{ fontSize: 11, color: "#6b7280", flex: "0 0 auto" }}>ahora</span>
          </span>
          <span style={{ display: "block", fontSize: 13, lineHeight: 1.35, color: empty ? "#9ca3af" : "#1f2937", wordBreak: "break-word" }}>
            {empty ? "Escribe tu mensaje arriba para verlo aquí…" : text}
          </span>
        </span>
      </div>
      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", textAlign: "center", margin: "10px 0 0" }}>Así llegará la notificación al celular de tus caseros (vista aproximada).</p>
    </div>
  );
}

export function ComunicacionTab({ business, planInfo, customers, cards, onChanged }: { business: Business; planInfo: PlanInfo; customers: CustomerCard[]; cards: LoyaltyCard[]; onChanged: () => void }) {
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmDup, setConfirmDup] = useState(false);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  // Live clock so the countdown + progress bar tick every second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const paid = planInfo.paid && planInfo.broadcastsPerDay > 0;

  const day = 24 * 60 * 60 * 1000;
  const history = paid ? business.broadcastHistory || [] : [];
  const resetAt = business.broadcastRateResetAt || 0;
  const recent = history.filter((h) => now - h.at < day && h.at > resetAt);
  const perDay = planInfo.broadcastsPerDay || 1; // denominator for display (free → 1)
  const usedToday = recent.length;
  const gapMs = planInfo.broadcastGapHours * 60 * 60 * 1000;
  const lastAt = recent.length ? Math.max(...recent.map((h) => h.at)) : 0;
  const dayLimitHit = paid && usedToday >= perDay;
  const gapHit = paid && gapMs > 0 && lastAt > 0 && now - lastAt < gapMs;
  const blocked = dayLimitHit || gapHit;

  // When can they send again, and over what window (for the progress bar fill).
  const dayUnlockAt = dayLimitHit ? Math.min(...recent.map((h) => h.at)) + day : 0;
  const gapUnlockAt = gapHit ? lastAt + gapMs : 0;
  const nextAt = Math.max(dayUnlockAt, gapUnlockAt);
  const windowMs = nextAt === dayUnlockAt && dayLimitHit ? day : gapMs;
  const remainingMs = nextAt ? Math.max(0, nextAt - now) : 0;
  // 0% right after a send → 100% (ready) when the cooldown elapses.
  const pct = blocked && windowMs > 0 ? Math.min(100, Math.round(((windowMs - remainingMs) / windowMs) * 100)) : 100;

  // Recipients in the selected segment (computed from the dashboard's in-memory list).
  const slotsById = new Map(cards.map((c) => [c.id, c.totalSlots]));
  const segCount = customers.filter((c) => inSegment(c, segment, slotsById.get(c.loyaltyCardId) ?? 0, now)).length;

  // Guard against accidental repeats: same text already sent in the last 24h
  // (double-clicks and re-sends burn the daily quota).
  const dup = recent.find((h) => h.message.trim() === message.trim());
  const dupAgo = dup ? (() => {
    const mins = Math.max(1, Math.round((now - dup.at) / 60000));
    return mins < 60 ? `hace ${mins} min` : `hace ${Math.round(mins / 60)} h`;
  })() : "";

  async function send({ skipDupCheck = false } = {}) {
    if (dup && !skipDupCheck) return setConfirmDup(true);
    setConfirmDup(false);
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await authedFetch("/api/business/broadcast", { method: "POST", body: JSON.stringify({ message: message.trim(), segment }) });
      const json = await res.json().catch(() => ({} as { error?: string; recipients?: number; googleNotified?: number; googleSilent?: number }));
      if (!res.ok) return setErr(json.error || `No se pudo enviar (${res.status}).`);
      // Report what actually reached a phone. Google allows only 3 notifications per
      // pass per day, shared with sellos completados y canjes — so some caseros get
      // the message on their tarjeta without it sounding, and the owner should know
      // that rather than assume every send buzzed.
      const silent = json.googleSilent ?? 0;
      setMsg(
        `Enviado a ${json.recipients} casero(s).` +
          (silent > 0
            ? ` ${silent} con Android lo verán en su tarjeta, pero sin notificación: Google permite solo 3 avisos por tarjeta al día.`
            : "")
      );
      setMessage("");
      onChanged();
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt" style={{ position: "relative", overflow: "hidden" }}>
      <h3 style={{ fontSize: 18, marginTop: 0 }}>Mensajes a tus caseros</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Envía una promoción, recordatorio o aviso al wallet de todos tus caseros.
        {paid ? ` Tu plan ${planInfo.label} permite ${planInfo.broadcastsPerDay} mensaje(s) al día${planInfo.broadcastGapHours ? `, con ${planInfo.broadcastGapHours}h entre cada uno` : ""}.` : ""}
      </p>
      {/* Google's cap is on their side, not ours, and it's shared with the avisos a
          casero gets for completing or canjeando a card — so on a busy day a message
          can land on the tarjeta without sounding. Say so up front instead of letting
          the owner assume every send buzzes. */}
      {paid && planInfo.broadcastsPerDay > 3 && (
        <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
          En Android, Google permite hasta 3 avisos sonoros por tarjeta al día (compartidos con los de tarjeta
          completa y canje). Los demás mensajes igual llegan a la tarjeta, solo que sin sonar. En iPhone no hay
          ese límite. Te decimos cuántos sonaron después de cada envío.
        </p>
      )}

      <div style={paid ? undefined : { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }} aria-hidden={!paid}>
        {/* Send status: progress bar + "usados/permitidos" + countdown */}
        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: blocked ? "var(--text-secondary)" : "#16a34a" }}>{blocked ? "Próximo envío disponible" : "✓ Listo para enviar"}</span>
            <strong style={{ fontSize: 15 }}>
              {usedToday}/{perDay}
              <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                {" "}
                hoy
              </span>
            </strong>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: blocked ? "#E53935" : "#16a34a",
                transition: "width 1s linear",
              }}
            />
          </div>
          {blocked && (
            <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>
              Podrás enviar otro mensaje en <strong>{fmtCountdown(remainingMs)}</strong>
            </p>
          )}
        </div>

        {err && <div className="error-box">{err}</div>}
        {msg && <div className="success-box">{msg}</div>}

        <div className="field">
          <label>Enviar a</label>
          <select className="input" value={segment} onChange={(e) => { setConfirmDup(false); setSegment(e.target.value as Segment); }}>
            {SEGMENTS.map((s) => (
              <option key={s.id} value={s.id} disabled={!planInfo.segments && s.id !== "all"}>
                {s.label}
                {!planInfo.segments && s.id !== "all" ? " (Negocio)" : ""}
              </option>
            ))}
          </select>
          <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
            {planInfo.segments ? `${segCount} casero(s) en este grupo` : "Mejora al plan Negocio para enviar por segmento (lapsos, casi-completan, VIP…)."}
          </p>
        </div>

        <div className="field">
          <label>Mensaje</label>
          <textarea ref={msgRef} className="input" rows={3} value={message} onChange={(e) => { setConfirmDup(false); setMessage(e.target.value); }} placeholder="Ej: ¡Hoy 2x1 en cafés! ☕ Ven y suma sellos." maxLength={160} />
          <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
            {message.length}/160
          </p>
        </div>

        {/* Live preview: how the notification lands on the casero's phone */}
        <div className="field">
          <label>Vista previa</label>
          <NotifPreview businessName={business.name} logoPng={business.logoPng || cards[0]?.logoPng} color={cards[0]?.cardColor || "#E53935"} text={message.trim()} />
        </div>

        {confirmDup ? (
          <ConfirmBar
            message={`Ya enviaste este mismo mensaje ${dupAgo}. Enviarlo de nuevo consume otro de tus envíos del día.`}
            confirmLabel="Enviar de nuevo"
            onConfirm={() => send({ skipDupCheck: true })}
            onCancel={() => setConfirmDup(false)}
            busy={busy}
          />
        ) : (
          <button className="btn btn-primary" onClick={() => send()} disabled={busy || blocked || !message.trim() || segCount === 0}>
            {busy ? "Enviando…" : segCount === 0 ? "Sin caseros en este grupo" : `Enviar a ${segCount} casero(s)`}
          </button>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, margin: "0 0 8px" }}>Historial de mensajes</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {history
                .slice()
                .reverse()
                .map((h) => (
                  <li key={h.at} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, wordBreak: "break-word" }}>{h.message}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {new Date(h.at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                        {h.segment ? ` · ${h.segment}` : ""}
                        {h.count != null ? ` · ${h.count} casero(s)` : ""}
                      </div>
                    </span>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ width: "auto", flex: "0 0 auto" }}
                      title="Copiar este mensaje al editor"
                      onClick={() => {
                        setMessage(h.message);
                        msgRef.current?.focus();
                        msgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      Usar de nuevo
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {!paid && (
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
          <strong>Mensajes a tus caseros</strong>
          <span className="muted" style={{ fontSize: 13, maxWidth: 320 }}>
            Mejora al plan Café o Negocio para enviar promociones, recordatorios y avisos a todos tus caseros.
          </span>
        </div>
      )}
    </div>
  );
}

/* The "add stamps" tool now lives in components/dashboard/StampBox.tsx. */
