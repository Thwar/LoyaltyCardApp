"use client";
import { useEffect, useState } from "react";
import { Lock, Pencil } from "lucide-react";
import { authedFetch } from "@/lib/clientApi";
import { ConfirmBar } from "@/components/ConfirmBar";
import { CardPreview } from "@/components/CardPreview";
import { QrCode } from "@/components/QrCode";
import { APPLE_WALLET_BADGE, GOOGLE_WALLET_BADGE } from "@/lib/walletBadges";
import type { LoyaltyCard } from "@/lib/types";
import type { PlanInfo } from "@/lib/plans";

/* Tarjetas tab: one panel per loyalty card, its counter QR kit, and the
   activate / deactivate / delete actions. Split out of app/dashboard/page.tsx. */

/* ---------- Tarjetas tab: one panel per card + add-card tile ---------- */
export function TarjetasTab({
  cards,
  planInfo,
  businessLogo,
  onEdit,
  onNew,
  onChanged,
}: {
  cards: LoyaltyCard[];
  planInfo: PlanInfo;
  businessLogo?: string;
  onEdit: (c: LoyaltyCard) => void;
  onNew: () => void;
  onChanged: () => void;
}) {
  const canAdd = cards.length < planInfo.maxCards;
  return (
    <div>
      {cards.map((card) => (
        <CardPanel key={card.id} card={card} businessLogo={businessLogo} onEdit={() => onEdit(card)} onChanged={onChanged} />
      ))}
      <NewCardTile canAdd={canAdd} planInfo={planInfo} onNew={onNew} />
    </div>
  );
}

function NewCardTile({ canAdd, planInfo, onNew }: { canAdd: boolean; planInfo: PlanInfo; onNew: () => void }) {
  return (
    <button className="add-card-tile mt" onClick={canAdd ? onNew : undefined} disabled={!canAdd} title={canAdd ? "Crear otra tarjeta" : "Mejora tu plan para crear más tarjetas"}>
      <span className="add-card-plus" aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
        {canAdd ? "＋" : <Lock size={24} />}
      </span>
      <span>
        Nueva tarjeta
        <span className="add-card-hint">
          {canAdd ? "Crea otra tarjeta de sellos" : planInfo.id === "negocio" ? `Alcanzaste el máximo de ${planInfo.maxCards} tarjetas` : "Mejora al plan Negocio para crear más de una tarjeta"}
        </span>
      </span>
    </button>
  );
}

/* Counter kit: table-tent mockup of the enrollment QR (how it should look on the
   mostrador), a printable hi-res QR download, and the 3 steps to put it to work. */
function QrCounterKit({ url, card, businessLogo }: { url: string; card: LoyaltyCard; businessLogo?: string }) {
  // Brand logo first (the business's own mark); the card logo is a fallback.
  const logoB64 = businessLogo || card.logoPng;
  const logo = logoB64 ? `data:image/png;base64,${logoB64}` : null;

  async function downloadQr() {
    const QRCode = (await import("qrcode")).default; // lazy: only loaded on click
    const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr_${(card.businessName || "tarjeta").replace(/[^a-z0-9]/gi, "_")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div>
      <p style={{ fontSize: 15, fontWeight: 600, textAlign: "center", margin: "22px 0 12px" }}>Inscribe caseros — pon este QR en tu mostrador</p>

      {/* Photoreal mockup: the card's branding composited onto a real blank
          table-tent photo; the overlay percentages are tuned to the tent's face. */}
      {/* containerType lets the overlay size everything in cqw, so the art scales
          with the photo (no fixed px overflowing the tent face on small screens). */}
      <div style={{ position: "relative", maxWidth: 430, margin: "0 auto", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", containerType: "inline-size" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/physical-signage-bg.jpg" alt="Cartel en el mostrador" style={{ width: "100%", height: "auto", display: "block" }} />
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "20%",
            right: "12.5%",
            bottom: "16%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            overflow: "hidden",
            // Follow the tent's slight lean in the photo so the art looks printed on it
            // (the face's right side is nearer the camera, so it lifts toward us).
            transform: "perspective(1100px) rotateY(7deg) rotate(-0.8deg)",
            transformOrigin: "center",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={card.businessName} style={{ maxHeight: "8.8cqw", maxWidth: "38cqw", objectFit: "contain", display: "block", margin: "0 auto 1.6cqw" }} />
          ) : (
            <div style={{ fontWeight: 800, fontSize: "4.2cqw", color: card.cardColor, marginBottom: "1.4cqw", lineHeight: 1.15 }}>{card.businessName}</div>
          )}
          <p style={{ fontWeight: 700, fontSize: "3.5cqw", margin: "0 0 0.7cqw", color: "#111", lineHeight: 1.2 }}>¡Tranquilo, no es otra app!</p>
          <p style={{ fontSize: "2.9cqw", color: "#444", margin: "0 0 1.9cqw", lineHeight: 1.3, maxWidth: "58cqw" }}>Escanea y guarda tu tarjeta de {card.businessName} en tu wallet.</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <QrCode value={url} size={102} imgStyle={{ width: "23.7cqw", height: "auto", display: "block" }} />
          </div>
          <p
            style={{ fontSize: "2.7cqw", color: "#444", margin: "1.6cqw 0 1.9cqw", lineHeight: 1.3, maxWidth: "58cqw", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
          >
            🎁 {card.rewardDescription}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.6cqw", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={APPLE_WALLET_BADGE} alt="Apple Wallet" style={{ height: "5.3cqw", width: "auto" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GOOGLE_WALLET_BADGE} alt="Google Wallet" style={{ height: "5.3cqw", width: "auto" }} />
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
        Imagen referencial — un ejemplo de cómo se vería tu QR impreso en el mostrador.
      </p>

      <button className="btn btn-primary mt" onClick={downloadQr}>
        ⬇ Descargar QR para imprimir (PNG)
      </button>

      {/* The 3 steps to put it to work (styled like /ejemplo) */}
      <ol style={{ listStyle: "none", padding: 0, margin: "18px 0 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {[
          "🖨️ Imprime el QR y ponlo junto a tu caja (puedes copiar el diseño de arriba).",
          "📲 Tu casero lo escanea, llena sus datos y guarda la tarjeta en su wallet — sin instalar nada.",
          "✅ En cada compra, escanea su tarjeta desde “Sumar sello” y el sello le llega al instante.",
        ].map((step, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                flex: "0 0 auto",
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 17,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 16, lineHeight: 1.4 }}>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* One card: preview, edit, its own enrollment QR, and activate/deactivate. */
function CardPanel({ card, businessLogo, onEdit, onChanged }: { card: LoyaltyCard; businessLogo?: string; onEdit: () => void; onChanged: () => void }) {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyActive, setBusyActive] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [err, setErr] = useState("");
  // In-page confirmation instead of window.confirm(): Safari lets the user mute a
  // page's dialogs for the rest of the session, after which confirm() returns false
  // silently and these buttons look dead.
  const [confirming, setConfirming] = useState<"deactivate" | "delete" | null>(null);

  useEffect(() => {
    // Prefer the canonical domain so QR links never point customers at the
    // redirecting apex; fall back to the current origin (local dev).
    const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    if (base) setJoinUrl(`${base}/join/${card.id}`);
  }, [card.id]);

  async function setActive(active: boolean) {
    setErr("");
    setConfirming(null);
    setBusyActive(true);
    try {
      const res = await authedFetch("/api/business/deactivate", {
        method: "POST",
        body: JSON.stringify({ cardId: card.id, active }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        setErr(json.error || `No se pudo actualizar la tarjeta (${res.status}).`);
        onChanged(); // resync — the server may have applied part of the change
        return;
      }
      onChanged();
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusyActive(false);
    }
  }

  async function deleteCard() {
    setErr("");
    setConfirming(null);
    setBusyDelete(true);
    try {
      const res = await authedFetch("/api/business/card/delete", {
        method: "POST",
        body: JSON.stringify({ cardId: card.id }),
      });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        setErr(json.error || `No se pudo eliminar la tarjeta (${res.status}).`);
        // The route voids the card before clearing its ledgers, so a failure here
        // can still have changed the card — never leave a stale panel on screen.
        onChanged();
        return;
      }
      onChanged();
    } catch {
      setErr("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusyDelete(false);
    }
  }

  const inactive = card.isActive === false;
  const busy = busyActive || busyDelete;

  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "center" }}>
        <h3 style={{ fontSize: 17, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {card.rewardDescription || "Tarjeta"}
          {inactive && <span style={{ fontSize: 11, fontWeight: 700, color: "#c62828" }}>● Desactivada</span>}
        </h3>
        <button className="btn btn-sm btn-ghost" style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onEdit}>
          <Pencil size={15} aria-hidden /> Editar
        </button>
      </div>

      <div className="mt">
        <CardPreview
          businessName={card.businessName}
          totalSlots={card.totalSlots}
          currentStamps={Math.min(3, card.totalSlots)}
          rewardDescription={card.rewardDescription}
          cardColor={card.cardColor}
          textColor={card.textColor}
          stampShape={card.stampShape}
          logoUrl={card.logoPng ? `data:image/png;base64,${card.logoPng}` : undefined}
        />
      </div>

      {joinUrl && <QrCounterKit url={joinUrl} card={card} businessLogo={businessLogo} />}
      <div className="row mt" style={{ gap: 8 }}>
        <input className="input" readOnly value={joinUrl} onFocus={(e) => e.currentTarget.select()} />
        <button
          className="btn btn-sm btn-outline"
          style={{ flex: "0 0 auto" }}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(joinUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 14 }}>
        {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

        {confirming ? (
          <ConfirmBar
            message={
              confirming === "delete"
                ? "¿Eliminar esta tarjeta? Las tarjetas de tus caseros quedarán finalizadas (en gris) y se borrará su historial de sellos. Esta acción no se puede deshacer."
                : "¿Desactivar esta tarjeta? Las tarjetas de tus caseros se verán en gris (finalizadas). Puedes reactivarla cuando quieras."
            }
            confirmLabel={confirming === "delete" ? "Sí, eliminar" : "Sí, desactivar"}
            onConfirm={() => (confirming === "delete" ? deleteCard() : setActive(false))}
            onCancel={() => setConfirming(null)}
            busy={busy}
          />
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {inactive ? (
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setActive(true)} disabled={busy}>
                {busyActive ? "Reactivando…" : "Reactivar tarjeta"}
              </button>
            ) : (
              <button
                className="btn btn-outline"
                style={{ width: "auto" }}
                onClick={() => {
                  setErr("");
                  setConfirming("deactivate");
                }}
                disabled={busy}
              >
                {busyActive ? "Desactivando…" : "Desactivar tarjeta"}
              </button>
            )}
            <button
              className="btn"
              style={{ width: "auto", background: "#fdecea", color: "#c62828" }}
              onClick={() => {
                setErr("");
                setConfirming("delete");
              }}
              disabled={busy}
            >
              {busyDelete ? "Eliminando…" : "Eliminar tarjeta"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
