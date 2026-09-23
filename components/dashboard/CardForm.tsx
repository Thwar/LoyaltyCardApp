"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { authedFetch } from "@/lib/clientApi";
import { CardPreview } from "@/components/CardPreview";
import { normalizeHex, fileToResizedPng } from "@/components/dashboard/shared";
import { CARD_COLOR_CHOICES, CARD_DEFAULTS } from "@/lib/theme";
import { STAMP_SHAPES, STAMP_ICONS } from "@/lib/stampShapes";
import { NOTIF_DEFAULTS } from "@/lib/notifications";
import type { BarcodeType, LoyaltyCard, StampShape } from "@/lib/types";
import type { PlanInfo } from "@/lib/plans";

/* First-run business setup, and the create/edit form for a stamp card.
   Split out of app/dashboard/page.tsx. */

/* ---------- First-run: set up the business ---------- */
export function BusinessSetupForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!name.trim()) return setErr("Ingresa el nombre de tu negocio.");
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/business/setup", {
      method: "POST",
      body: JSON.stringify({ businessName: name.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setErr(json.error || "No se pudo guardar.");
    onSaved();
  }

  return (
    <div>
      <h1 style={{ fontSize: 24 }}>Configura tu negocio</h1>
      <p className="muted" style={{ marginBottom: 18 }}>
        Empecemos con el nombre de tu negocio.
      </p>
      {err && <div className="error-box">{err}</div>}
      <div className="card">
        <div className="field">
          <label>Nombre del negocio</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Café Central" onKeyDown={(e) => e.key === "Enter" && save()} />
        </div>
        <button className="btn btn-primary mt" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Create / edit the stamp card ---------- */
export function CardForm({ existing, businessName, planInfo, onSaved }: { existing?: LoyaltyCard; businessName?: string; planInfo: PlanInfo; onSaved: () => void }) {
  const [totalSlots, setTotalSlots] = useState(existing?.totalSlots ?? CARD_DEFAULTS.DEFAULT_SLOTS);
  const [rewardDescription, setRewardDescription] = useState(existing?.rewardDescription ?? CARD_DEFAULTS.DEFAULT_REWARD);
  const [welcomeMessage, setWelcomeMessage] = useState(
    existing?.welcomeMessage ?? `¡Bienvenido a ${existing?.businessName || businessName || "nuestro club"}! 🎉 Colecciona sellos y gana tu recompensa.`,
  );
  const [cardColor, setCardColor] = useState(existing?.cardColor ?? CARD_COLOR_CHOICES[0]);
  const [textColor, setTextColor] = useState(existing?.textColor ?? "#FFFFFF");
  const [stampShape, setStampShape] = useState<StampShape>(existing?.stampShape ?? "circle");
  const [barcodeType, setBarcodeType] = useState<BarcodeType>(existing?.barcodeType ?? "pdf417");
  const [logo, setLogo] = useState<string | null>(existing?.logoPng ? `data:image/png;base64,${existing.logoPng}` : null);
  const [stampMessage, setStampMessage] = useState(existing?.stampMessage || NOTIF_DEFAULTS.stamp);
  const [completeMessage, setCompleteMessage] = useState(existing?.completeMessage || NOTIF_DEFAULTS.complete);
  const [redeemMessage, setRedeemMessage] = useState(existing?.redeemMessage || NOTIF_DEFAULTS.redeem);
  const [formTab, setFormTab] = useState<"tarjeta" | "notificaciones">("tarjeta");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/business/card", {
      method: "POST",
      body: JSON.stringify({
        cardId: existing?.id,
        totalSlots,
        rewardDescription: rewardDescription.trim(),
        welcomeMessage: welcomeMessage.trim(),
        stampMessage: stampMessage.trim(),
        completeMessage: completeMessage.trim(),
        redeemMessage: redeemMessage.trim(),
        cardColor,
        textColor,
        stampShape,
        barcodeType,
        logo,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return setErr(json.error || "No se pudo guardar.");
    onSaved();
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await fileToResizedPng(file));
    } catch {
      setErr("No se pudo procesar la imagen.");
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24 }}>{existing ? "Editar tu tarjeta" : "Crea tu tarjeta de sellos"}</h1>
      <p className="muted" style={{ marginBottom: 18 }}>
        Así verán tus caseros la tarjeta en su wallet.
      </p>

      {err && <div className="error-box">{err}</div>}

      <div style={{ marginBottom: 18 }}>
        <CardPreview
          businessName={existing?.businessName || businessName || "Tu negocio"}
          totalSlots={totalSlots}
          currentStamps={Math.min(2, totalSlots)}
          rewardDescription={rewardDescription || "Tu recompensa"}
          cardColor={cardColor}
          textColor={textColor}
          stampShape={stampShape}
          logoUrl={logo || undefined}
          showBarcode
          barcodeType={barcodeType}
        />
      </div>

      <div className="tabs mt">
        <button className={`tab${formTab === "tarjeta" ? " active" : ""}`} onClick={() => setFormTab("tarjeta")}>
          Tarjeta
        </button>
        <button className={`tab${formTab === "notificaciones" ? " active" : ""}`} onClick={() => setFormTab("notificaciones")}>
          Notificaciones
        </button>
      </div>

      <div className="card">
        {formTab === "tarjeta" ? (
          <>
            <div className="field">
              <label>Forma del sello</label>
              {planInfo.paid ? (
                <select className="input" value={stampShape} onChange={(e) => setStampShape(e.target.value as StampShape)}>
                  <optgroup label="Formas">
                    {STAMP_SHAPES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Íconos">
                    {STAMP_ICONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <>
                  <select className="input" value="circle" disabled style={{ opacity: 0.6, cursor: "not-allowed" }}>
                    <option value="circle">Círculo</option>
                  </select>
                  <p className="muted" style={{ fontSize: 12, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Lock size={13} aria-hidden /> Mejora al plan Café o Negocio para elegir estrella, diamante y más.
                  </p>
                </>
              )}
            </div>

            <div className="field">
              <label>Código en la tarjeta</label>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {(
                  [
                    { id: "pdf417", label: "Código de barras" },
                    { id: "qr", label: "Código QR" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setBarcodeType(o.id)}
                    className="btn"
                    style={{
                      width: "auto",
                      flex: "1 1 140px",
                      background: barcodeType === o.id ? "var(--primary)" : "#fff",
                      color: barcodeType === o.id ? "#fff" : "var(--text)",
                      border: barcodeType === o.id ? "2px solid var(--primary)" : "1px solid var(--border)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
                Es el código que tu equipo escanea para sumar sellos. Ambos funcionan con el escáner de la app; elige el que prefieras visualmente.
              </p>
            </div>

            <div className="field">
              <label>¿Cuántos sellos para ganar la recompensa?</label>
              <select className="input" value={totalSlots} onChange={(e) => setTotalSlots(Number(e.target.value))}>
                {Array.from({ length: CARD_DEFAULTS.MAX_SLOTS - CARD_DEFAULTS.MIN_SLOTS + 1 }).map((_, i) => {
                  const v = CARD_DEFAULTS.MIN_SLOTS + i;
                  return (
                    <option key={v} value={v}>
                      {v} sellos
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="field">
              <label>Recompensa</label>
              <input className="input" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} placeholder="Ej: Un café gratis" />
            </div>

            <div className="field">
              <label>Color de la tarjeta</label>
              <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {CARD_COLOR_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardColor(c)}
                    aria-label={c}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: c,
                      border: cardColor.toLowerCase() === c.toLowerCase() ? "3px solid #2c3e50" : "3px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={normalizeHex(cardColor, "#E53935")}
                  onChange={(e) => setCardColor(e.target.value)}
                  aria-label="Selector de color de la tarjeta"
                  style={{ width: 42, height: 36, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                />
                <input className="input" style={{ maxWidth: 110 }} value={cardColor} onChange={(e) => setCardColor(e.target.value)} placeholder="#E53935" />
              </div>
            </div>

            <div className="field">
              <label>Color del texto</label>
              <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {["#FFFFFF", "#000000"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTextColor(c)}
                    aria-label={c}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: c,
                      border: textColor.toLowerCase() === c.toLowerCase() ? "3px solid #2c3e50" : "1px solid #ccc",
                      cursor: "pointer",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={normalizeHex(textColor, "#FFFFFF")}
                  onChange={(e) => setTextColor(e.target.value)}
                  aria-label="Selector de color del texto"
                  style={{ width: 42, height: 36, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                />
                <input className="input" style={{ maxWidth: 110 }} value={textColor} onChange={(e) => setTextColor(e.target.value)} placeholder="#FFFFFF" />
              </div>
            </div>

            <div className="field">
              <label>Logo (opcional)</label>
              {logo && (
                <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="logo" style={{ maxHeight: 44, maxWidth: 160, objectFit: "contain", background: "#f0f0f0", borderRadius: 8, padding: 4 }} />
                  <button type="button" className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setLogo(null)}>
                    Quitar
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={onPickLogo} />
              <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
                Se mostrará en lugar del nombre del negocio. Para que se vea bien, usa un logo <strong>horizontal</strong> (apaisado), PNG con fondo transparente, ~480 × 150 px (proporción ~3:1). En
                Apple Wallet el logo va en una franja pequeña arriba (máx. 160 × 50 pt), así que las imágenes cuadradas se verán chicas.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Mensaje de bienvenida</label>
              <textarea className="input" rows={2} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="¡Bienvenido! 🎉" maxLength={240} />
              <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
                Se le envía al casero como notificación cuando guarda tu tarjeta (Android y iPhone). Disponible en todos los planes.
              </p>
            </div>

            {!planInfo.paid && (
              <p className="muted" style={{ fontSize: 12, margin: "0 0 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Lock size={13} aria-hidden /> Personaliza los mensajes de sellos y recompensa con el plan Café o Negocio.
              </p>
            )}

            {(
              [
                { label: "Notificación de nuevo sello", val: stampMessage, set: setStampMessage },
                { label: "Notificación de tarjeta completa", val: completeMessage, set: setCompleteMessage },
                { label: "Notificación de recompensa canjeada", val: redeemMessage, set: setRedeemMessage },
              ] as const
            ).map((f) => (
              <div className="field" key={f.label}>
                <label>{f.label}</label>
                <textarea
                  className="input"
                  rows={2}
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  disabled={!planInfo.paid}
                  maxLength={180}
                  style={planInfo.paid ? undefined : { opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.45 }}>
              Escribe <strong>{"{sellos}"}</strong> y <strong>{"{total}"}</strong> donde quieras mostrar el progreso (ej: 5/9).
            </p>
          </>
        )}

        <button className="btn btn-primary mt" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear tarjeta"}
        </button>
      </div>
    </div>
  );
}
