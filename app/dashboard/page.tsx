"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { CARD_COLOR_CHOICES, CARD_DEFAULTS } from "@/lib/theme";
import { effectivePlan, type PlanInfo } from "@/lib/plans";
import { CardPreview } from "@/components/CardPreview";
import { QrCode } from "@/components/QrCode";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { Lock, Pencil, ScanLine } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import type { BarcodeType, Business, CustomerCard, LoyaltyCard, StampShape, Member, MembershipProgram } from "@/lib/types";
import { STAMP_SHAPES, STAMP_ICONS } from "@/lib/stampShapes";
import { SEGMENTS, inSegment, type Segment } from "@/lib/segments";
import { NOTIF_DEFAULTS } from "@/lib/notifications";
import { memberStatus, visitsRemaining, MEMBER_STATUS_LABEL, type MemberStatus } from "@/lib/membership";
import { MembershipCardVisual } from "@/components/MembershipCardVisual";
import { TiltWrap } from "@/components/TiltWrap";

interface MeResponse {
  role?: "owner" | "cajero";
  business: Business | null;
  cards?: LoyaltyCard[];
  customers?: CustomerCard[];
  count?: number;
  walletConfigured?: boolean;
  staffName?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await authedFetch("/api/business/me");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "No se pudo cargar.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      setAuthReady(true);
      if (!u) {
        router.replace("/login");
      } else {
        load();
      }
    });
    return () => unsub();
  }, [router, load]);

  useEffect(() => {
    if (typeof window !== "undefined") setImpersonating(localStorage.getItem("impersonating"));
  }, []);

  async function exitImpersonation() {
    await signOut(getClientAuth());
    localStorage.removeItem("impersonating");
    router.replace("/login");
  }

  if (!authReady || loading) {
    return <PageLoader />;
  }

  return (
    <div className="container container-wide">
      {impersonating && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffe69c",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#664d03" }}>
            👁 Estás viendo como <strong>{impersonating}</strong>. Los cambios afectan su cuenta real.
          </span>
          <button className="btn btn-sm" style={{ width: "auto", background: "#664d03", color: "#fff" }} onClick={exitImpersonation}>
            Salir de la vista
          </button>
        </div>
      )}
      <div className="row spread" style={{ marginBottom: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" />
        <div className="row" style={{ width: "auto", gap: 8 }}>
          <Link href="/account" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
            Cuenta
          </Link>
          <button
            className="btn btn-sm btn-ghost"
            style={{ width: "auto" }}
            onClick={async () => {
              await signOut(getClientAuth());
              localStorage.removeItem("impersonating");
              router.replace("/login");
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {data?.walletConfigured === false && (
        <div className="warn-box">
          Google Wallet aún no está configurado. Las tarjetas se crean igual, pero el pase no se genera todavía.
          Revisa <strong>SETUP.md</strong> para activarlo.
        </div>
      )}

      {!data?.business ? (
        <BusinessSetupForm onSaved={load} />
      ) : (
        <CardManager
          business={data.business}
          cards={data.cards || []}
          customers={data.customers || []}
          count={data.count || 0}
          onChanged={load}
          cajero={data.role === "cajero"}
          staffName={data.staffName}
        />
      )}

      <SiteFooter />
    </div>
  );
}

/* ---------- First-run: set up the business ---------- */
function BusinessSetupForm({ onSaved }: { onSaved: () => void }) {
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
      <p className="muted" style={{ marginBottom: 18 }}>Empecemos con el nombre de tu negocio.</p>
      {err && <div className="error-box">{err}</div>}
      <div className="card">
        <div className="field">
          <label>Nombre del negocio</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Café Central"
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <button className="btn btn-primary mt" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}

// <input type="color"> needs a valid #rrggbb; fall back while the user types a partial value.
function normalizeHex(v: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

// Read an image file and downscale it to a small PNG data URL (keeps uploads tiny).
function fileToResizedPng(file: File, maxW = 480, maxH = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

/* ---------- Create / edit the stamp card ---------- */
function CardForm({ existing, businessName, planInfo, onSaved }: { existing?: LoyaltyCard; businessName?: string; planInfo: PlanInfo; onSaved: () => void }) {
  const [totalSlots, setTotalSlots] = useState(existing?.totalSlots ?? CARD_DEFAULTS.DEFAULT_SLOTS);
  const [rewardDescription, setRewardDescription] = useState(existing?.rewardDescription ?? CARD_DEFAULTS.DEFAULT_REWARD);
  const [welcomeMessage, setWelcomeMessage] = useState(
    existing?.welcomeMessage ??
      `¡Bienvenido a ${existing?.businessName || businessName || "nuestro club"}! 🎉 Colecciona sellos y gana tu recompensa.`
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
            Es el código que tu equipo escanea para sumar sellos. Ambos funcionan con el escáner de la app; elige el que
            prefieras visualmente.
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
          <input
            className="input"
            value={rewardDescription}
            onChange={(e) => setRewardDescription(e.target.value)}
            placeholder="Ej: Un café gratis"
          />
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
            Se mostrará en lugar del nombre del negocio. Para que se vea bien, usa un logo{" "}
            <strong>horizontal</strong> (apaisado), PNG con fondo transparente, ~480 × 150 px (proporción ~3:1).
            En Apple Wallet el logo va en una franja pequeña arriba (máx. 160 × 50 pt), así que las imágenes
            cuadradas se verán chicas.
          </p>
        </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Mensaje de bienvenida</label>
              <textarea
                className="input"
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="¡Bienvenido! 🎉"
                maxLength={240}
              />
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

/* ---------- Manage a business's card(s): tabbed Resumen / Tarjetas ---------- */
function CardManager({
  business,
  cards,
  customers,
  count,
  onChanged,
  cajero = false,
  staffName,
}: {
  business: Business;
  cards: LoyaltyCard[];
  customers: CustomerCard[];
  count: number;
  onChanged: () => void;
  cajero?: boolean;
  staffName?: string;
}) {
  const [selected, setSelected] = useState<Client | null>(null);
  const [tab, setTab] = useState<"resumen" | "tarjetas" | "comunicacion" | "membresias">("resumen");
  // No cards yet → open straight into the create form (owners only).
  const [editing, setEditing] = useState<LoyaltyCard | "new" | null>(cards.length === 0 && !cajero ? "new" : null);
  const planInfo = effectivePlan(business);
  const cardsById = new Map(cards.map((c) => [c.id, c]));

  // Cajero: read-only stamp + stats, no tabs / editing / contact / comunicación.
  if (cajero) {
    return (
      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>{business.name}</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 18 }}>
          Hola{staffName ? `, ${staffName}` : ""} 👋 — suma sellos y revisa tus caseros.
        </p>
        <ResumenTab cards={cards} customers={customers} count={count} planInfo={planInfo} onChanged={onChanged} onSelect={setSelected} cajero />
        {selected && <ClientModal client={selected} cardsById={cardsById} plan={planInfo.id} onChanged={onChanged} onClose={() => setSelected(null)} cajero />}
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        {cards.length > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)} style={{ marginBottom: 14 }}>
            ← Volver
          </button>
        )}
        <CardForm
          existing={editing === "new" ? undefined : editing}
          businessName={business.name}
          planInfo={planInfo}
          onSaved={() => {
            setEditing(null);
            setTab("tarjetas"); // after creating/editing a card, land on the Tarjetas panel
            onChanged();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {business.name}
        <span className={`plan-badge plan-${planInfo.id}`}>{planInfo.label}</span>
      </h1>

      <div className="tabs mt">
        <button className={`tab${tab === "resumen" ? " active" : ""}`} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={`tab${tab === "tarjetas" ? " active" : ""}`} onClick={() => setTab("tarjetas")}>
          Tarjetas
        </button>
        <button className={`tab${tab === "comunicacion" ? " active" : ""}`} onClick={() => setTab("comunicacion")}>
          Comunicación
        </button>
        <button className={`tab${tab === "membresias" ? " active" : ""}`} onClick={() => setTab("membresias")}>
          Membresías
        </button>
      </div>

      {tab === "resumen" ? (
        <ResumenTab
          cards={cards}
          customers={customers}
          count={count}
          planInfo={planInfo}
          onChanged={onChanged}
          onSelect={setSelected}
          onShowQr={() => setTab("tarjetas")}
        />
      ) : tab === "tarjetas" ? (
        <TarjetasTab
          cards={cards}
          planInfo={planInfo}
          onEdit={(c) => setEditing(c)}
          onNew={() => setEditing("new")}
          onChanged={onChanged}
        />
      ) : tab === "comunicacion" ? (
        <ComunicacionTab business={business} planInfo={planInfo} customers={customers} cards={cards} onChanged={onChanged} />
      ) : (
        <div className="vip-section">
          <MembershipTab businessName={business.name} />
        </div>
      )}

      {selected && (
        <ClientModal client={selected} cardsById={cardsById} plan={planInfo.id} onChanged={onChanged} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ========================= Memberships (VIP / club cards) ========================= */
interface MembershipMe {
  eligible: boolean;
  program: MembershipProgram | null;
  members: Member[];
  stats: { total: number; active: number; expired: number; expiringSoon: number; newThisMonth: number; churned30: number; visits30: number; visitsTotal: number } | null;
  visitSeries?: { label: string; count: number }[];
}

// Date pinned to Bolivia time (server builds in UTC).
function fmtDay(ts?: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/La_Paz" });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function fmtDateTime(ts?: number | null): string {
  if (ts == null) return "—";
  try {
    return new Date(ts).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/La_Paz" });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  }
}

function memberEventLabel(e: import("@/lib/types").MemberEvent): string {
  switch (e.kind) {
    case "created":
      return "Se unió";
    case "renewed":
      return (e.days ? `Renovado +${e.days} días` : "Renovado") + (e.until ? ` · vence ${fmtDay(e.until)}` : "");
    case "reset":
      return "Visitas reiniciadas";
    case "deactivated":
      return "Desactivado";
    default:
      return "Cambio";
  }
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const c = status === "active" ? { bg: "#dcfce7", fg: "#166534" } : status === "expired" ? { bg: "#fee2e2", fg: "#991b1b" } : { bg: "#fef3c7", fg: "#92400e" };
  return (
    <span style={{ background: c.bg, color: c.fg, fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {MEMBER_STATUS_LABEL[status]}
    </span>
  );
}

function MembershipVisitsChart({ series, total }: { series: { label: string; count: number }[]; total: number }) {
  if (!series.length) return null;
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Visitas (últimos 14 días)</h3>
        <span className="muted" style={{ fontSize: 13 }}>{total} en total</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 96, marginTop: 14 }}>
        {series.map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }} title={`${s.label}: ${s.count} visita(s)`}>
            <span style={{ fontSize: 9, color: "var(--text-secondary)", marginBottom: 2, minHeight: 11 }}>{s.count || ""}</span>
            <div style={{ width: "100%", height: `${Math.max(3, (s.count / max) * 100)}%`, background: "var(--primary)", opacity: s.count ? 1 : 0.18, borderRadius: "3px 3px 0 0" }} />
          </div>
        ))}
      </div>
      <div className="row spread" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function MembershipTab({ businessName }: { businessName: string }) {
  const [data, setData] = useState<MembershipMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await authedFetch("/api/membership/export");
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "socios.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const load = useCallback(async () => {
    const res = await authedFetch("/api/membership/me");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="center" style={{ padding: "48px 0" }}>
        <span className="spinner" role="status" aria-label="Cargando" />
      </div>
    );
  if (!data) return <div className="error-box mt">No se pudo cargar.</div>;

  if (!data.eligible) return <MembershipUpsell />;

  if (!data.program || editingProgram) {
    return (
      <div>
        {data.program && (
          <button className="btn btn-sm" onClick={() => setEditingProgram(false)} style={{ width: "auto", marginBottom: 12, background: "rgba(255,255,255,0.14)", color: "#fff" }}>
            ← Volver
          </button>
        )}
        <MembershipForm
          existing={data.program || undefined}
          businessName={businessName}
          onSaved={() => {
            setEditingProgram(false);
            load();
          }}
        />
      </div>
    );
  }

  const { program, members } = data;
  const stats = data.stats!;
  return (
    <div>
      <div className="row spread" style={{ alignItems: "center" }}>
        <h3 className="vip-on-dark" style={{ margin: 0, fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
          🎫 {program.name}
          {program.isActive === false && (
            <span style={{ background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 999 }}>Inactiva</span>
          )}
        </h3>
        <button className="btn btn-sm" style={{ width: "auto", background: "rgba(255,255,255,0.14)", color: "#fff" }} onClick={() => setEditingProgram(true)}>
          Editar
        </button>
      </div>

      <h4 className="vip-on-dark-muted vip-label">Acciones rápidas</h4>
      <MemberVerifyBox onChanged={load} />
      <MembershipShare programId={program.id} />

      <h4 className="vip-on-dark-muted vip-label">Resumen</h4>
      <div className="stat-grid">
        <StatCard label="Socios activos" value={stats.active} />
        <StatCard label="Nuevos (30 días)" value={stats.newThisMonth} />
        <StatCard label="Por vencer (7 días)" value={stats.expiringSoon} />
        <StatCard label="Vencidos" value={stats.expired} />
        <StatCard label="Bajas (30 días)" value={stats.churned30} />
        <StatCard label="Visitas (30 días)" value={stats.visits30} />
      </div>
      <MembershipVisitsChart series={data.visitSeries || []} total={stats.visitsTotal} />

      <div className="row spread" style={{ alignItems: "baseline", gap: 10 }}>
        <h4 className="vip-on-dark-muted vip-label">Directorio de socios</h4>
        {members.length > 0 && (
          <button
            className="btn btn-sm"
            style={{ width: "auto", background: "rgba(255,255,255,0.14)", color: "#fff" }}
            onClick={exportCsv}
            disabled={exporting}
          >
            {exporting ? "Exportando…" : "Exportar CSV"}
          </button>
        )}
      </div>
      <AddMemberForm onAdded={load} />
      <MembersList members={members} onSelect={setSelected} />

      {selected && <MemberModal member={selected} program={program} onChanged={load} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MembershipUpsell() {
  const href = `https://wa.me/59175983004?text=${encodeURIComponent("Hola, quiero activar las membresías (tarjetas VIP) en mi plan de SoyCasero.")}`;
  return (
    <div className="card mt">
      <h3 style={{ marginTop: 0, fontSize: 18 }}>🎫 Tarjetas de membresía (VIP)</h3>
      <p className="muted" style={{ lineHeight: 1.5 }}>
        Para gimnasios, clubes y negocios con socios: una tarjeta que identifica a tus miembros, controla su vencimiento
        y, si quieres, sus visitas. Disponible en el <strong>plan Negocio</strong>.
      </p>
      <a className="btn btn-primary mt" href={href} target="_blank" rel="noreferrer" style={{ width: "auto", display: "inline-block" }}>
        Activar con el plan Negocio
      </a>
    </div>
  );
}

function MembershipShare({ programId }: { programId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${base}/m/${programId}`;
  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Inscribir socios</h3>
        <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setOpen((o) => !o)}>
          {open ? "Ocultar" : "Ver QR"}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: open ? 12 : 0 }}>
        Comparte este QR o enlace para que tus socios se inscriban y guarden la tarjeta en su wallet.
      </p>
      {open && (
        <div className="center" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <QrCode value={url} size={200} />
          <button
            className="btn btn-outline"
            style={{ width: "auto" }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
            }}
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
      )}
    </div>
  );
}

function MembershipForm({ existing, businessName, onSaved }: { existing?: MembershipProgram; businessName: string; onSaved: () => void }) {
  const [name, setName] = useState(existing?.name ?? `Membresía ${businessName}`);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(existing?.welcomeMessage ?? `¡Bienvenido al club de ${businessName}! 🎉`);
  const [cardColor, setCardColor] = useState(existing?.cardColor ?? "#1f2937");
  const [textColor, setTextColor] = useState(existing?.textColor ?? "#FFFFFF");
  const [tracksVisits, setTracksVisits] = useState(existing?.tracksVisits ?? false);
  const [visitLimit, setVisitLimit] = useState(String(existing?.defaultVisitLimit ?? 10));
  const [durationDays, setDurationDays] = useState(String(existing?.defaultDurationDays ?? 30));
  const [logo, setLogo] = useState<string | null>(existing?.logoPng ? `data:image/png;base64,${existing.logoPng}` : null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/membership/program", {
      method: "POST",
      body: JSON.stringify({
        programId: existing?.id,
        name: name.trim(),
        description: description.trim(),
        welcomeMessage: welcomeMessage.trim(),
        cardColor,
        textColor,
        tracksVisits,
        defaultVisitLimit: tracksVisits ? Number(visitLimit) : null,
        defaultDurationDays: Number(durationDays) || 0,
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

  async function setActive(isActive: boolean) {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/membership/program", { method: "PATCH", body: JSON.stringify({ programId: existing?.id, isActive }) });
    setSaving(false);
    if (!res.ok) return setErr((await res.json()).error || "No se pudo actualizar.");
    onSaved();
  }
  async function del() {
    if (!confirm("¿Eliminar esta membresía? Las tarjetas de tus socios dejarán de funcionar.")) return;
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/membership/program", { method: "DELETE", body: JSON.stringify({ programId: existing?.id }) });
    setSaving(false);
    if (!res.ok) return setErr((await res.json()).error || "No se pudo eliminar.");
    onSaved();
  }

  const days = Number(durationDays) || 0;
  return (
    <div>
      <h1 className="vip-on-dark" style={{ fontSize: 24, marginTop: 0 }}>{existing ? "Editar tu membresía" : "Crea tu tarjeta de membresía"}</h1>
      <p className="vip-on-dark-muted" style={{ marginBottom: 16 }}>Para gimnasios, clubes y negocios con socios.</p>
      {err && <div className="error-box">{err}</div>}

      {/* Live preview (3D tilt, like the loyalty card) */}
      <div style={{ marginBottom: 16 }}>
        <TiltWrap radius={16}>
          <MembershipCardVisual
            programName={name || "Tu membresía"}
            cardColor={cardColor}
            textColor={textColor}
            rightLabel={tracksVisits ? "VISITAS" : "ESTADO"}
            rightValue={tracksVisits ? String(visitLimit || 0) : "Activo"}
            footer={days > 0 ? `Vence en ${days} días` : "Sin vencimiento"}
          />
        </TiltWrap>
      </div>

      <div className="card">
        <div className="field">
          <label>Nombre de la membresía</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Socio Gimnasio Fit" />
        </div>
        <div className="field">
          <label>Beneficios / descripción (opcional)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="Acceso ilimitado, 1 invitado, descuentos…" />
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={tracksVisits} onChange={(e) => setTracksVisits(e.target.checked)} style={{ width: 18, height: 18 }} />
            <span>Controlar visitas (descuenta una por cada registro)</span>
          </label>
          {tracksVisits && (
            <input className="input mt" type="number" min={1} value={visitLimit} onChange={(e) => setVisitLimit(e.target.value)} placeholder="Visitas incluidas (ej: 10)" />
          )}
          {!tracksVisits && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Acceso ilimitado: la tarjeta solo verifica si el socio está activo.</p>}
        </div>

        <div className="field">
          <label>Duración (días)</label>
          <input className="input" type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} placeholder="30" />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Cada socio vence después de estos días. Usa 0 para sin vencimiento.</p>
        </div>

        <div className="field">
          <label>Mensaje de bienvenida</label>
          <textarea className="input" rows={2} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} maxLength={240} />
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
                style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: cardColor.toLowerCase() === c.toLowerCase() ? "3px solid #2c3e50" : "3px solid transparent", cursor: "pointer" }}
              />
            ))}
            <input type="color" value={normalizeHex(cardColor, "#1f2937")} onChange={(e) => setCardColor(e.target.value)} aria-label="Color" style={{ width: 42, height: 36, padding: 0, border: "none", background: "none", cursor: "pointer" }} />
            <input className="input" style={{ maxWidth: 110 }} value={cardColor} onChange={(e) => setCardColor(e.target.value)} placeholder="#1f2937" />
          </div>
        </div>

        <div className="field">
          <label>Color del texto</label>
          <div className="row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {["#FFFFFF", "#000000"].map((c) => (
              <button key={c} type="button" onClick={() => setTextColor(c)} aria-label={c} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: textColor.toLowerCase() === c.toLowerCase() ? "3px solid #2c3e50" : "1px solid #ccc", cursor: "pointer" }} />
            ))}
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
        </div>

        <button className="btn btn-primary mt" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear membresía"}
        </button>

        {existing && (
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 18, paddingTop: 16 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-outline" style={{ width: "auto" }} disabled={saving} onClick={() => setActive(existing.isActive === false)}>
                {existing.isActive === false ? "Reactivar membresía" : "Desactivar membresía"}
              </button>
              <button className="btn btn-ghost" style={{ width: "auto", color: "#c62828" }} disabled={saving} onClick={del}>
                Eliminar membresía
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Desactivar pausa la membresía (las tarjetas quedan inactivas). Eliminar la quita por completo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberVerifyBox({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ status: MemberStatus; logged: boolean; memberName: string; visitsRemaining: number | null; visitLimit: number | null; expiresAt: number | null } | null>(null);
  const [err, setErr] = useState("");

  async function go(verifyOnly: boolean, override?: string) {
    const c = (override ?? code).trim();
    if (busy || !c) return;
    setBusy(true);
    setErr("");
    setResult(null);
    const res = await authedFetch("/api/membership/visit", { method: "POST", body: JSON.stringify({ memberCode: c, verifyOnly }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo procesar.");
    setResult(json);
    setCode("");
    if (!verifyOnly && json.logged) onChanged();
  }

  return (
    <div className="card mt">
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Registrar visita / Verificar socio</h3>
      {err && <div className="error-box">{err}</div>}
      <div className="row" style={{ gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
        <input className="input" style={{ flex: "1 1 140px" }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código del socio" inputMode="numeric" />
        <button className="btn btn-primary" style={{ width: "auto" }} disabled={busy} onClick={() => go(false)}>
          Registrar visita
        </button>
        <button className="btn btn-outline" style={{ width: "auto" }} disabled={busy} onClick={() => go(true)}>
          Verificar
        </button>
        <button className="btn btn-outline" style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }} disabled={busy} onClick={() => setScanning(true)}>
          <ScanLine size={16} /> Escanear
        </button>
      </div>

      {result && (
        <div className="mt" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <StatusBadge status={result.status} />
          <strong>{result.memberName}</strong>
          <span className="muted" style={{ fontSize: 14 }}>
            {result.visitLimit != null ? `${result.visitsRemaining} visita(s) restantes` : "Acceso ilimitado"}
            {result.expiresAt != null ? ` · vence ${fmtDay(result.expiresAt)}` : ""}
          </span>
          {result.logged && <span style={{ color: "#166534", fontWeight: 700 }}>✓ Visita registrada</span>}
          {!result.logged && result.status !== "active" && <span style={{ color: "#991b1b", fontWeight: 700 }}>No se registró (membresía {MEMBER_STATUS_LABEL[result.status].toLowerCase()})</span>}
        </div>
      )}

      {scanning && <BarcodeScanner onDetected={(v) => { setScanning(false); go(false, v); }} onClose={() => setScanning(false)} />}
    </div>
  );
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newCode, setNewCode] = useState("");

  async function add() {
    if (busy || !name.trim()) return;
    setBusy(true);
    setErr("");
    const res = await authedFetch("/api/membership/member", { method: "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo agregar.");
    setNewCode(json.member?.memberCode || "");
    setName("");
    setEmail("");
    setPhone("");
    onAdded();
  }

  if (!open) {
    return (
      <button className="btn mt" style={{ width: "auto", background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }} onClick={() => setOpen(true)}>
        + Agregar socio
      </button>
    );
  }

  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Agregar socio</h3>
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
      </div>
      {err && <div className="error-box">{err}</div>}
      {newCode && <div className="success-box">Socio agregado. Su código es <strong>{newCode}</strong>.</div>}
      <div className="field">
        <label>Nombre</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del socio" />
      </div>
      <div className="field">
        <label>Correo (opcional)</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Teléfono (opcional)</label>
        <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy} onClick={add}>
        {busy ? "Agregando…" : "Agregar socio"}
      </button>
    </div>
  );
}

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

function MembersList({ members, onSelect }: { members: Member[]; onSelect: (m: Member) => void }) {
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

  if (!members.length) return <p className="vip-on-dark-muted" style={{ marginTop: 4 }}>Aún no tienes socios. Agrega el primero arriba.</p>;

  return (
    <div>
      <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input className="input" style={{ flex: "2 1 200px" }} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Buscar por nombre, correo, teléfono o código" />
        <select className="input" style={{ flex: "1 1 130px", maxWidth: 180 }} value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(0); }}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="soon">Por vencer</option>
          <option value="expired">Vencidos</option>
        </select>
      </div>
      {!shown.length && <p className="vip-on-dark-muted" style={{ fontSize: 14 }}>Ningún socio coincide con el filtro.</p>}
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
            <span style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: "50%", background: active ? avatarColor(m.memberName || "?") : "#9ca3af", color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {initials(m.memberName || "?")}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
              <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? undefined : "var(--text-secondary)" }}>{m.memberName}</strong>
              <span className="muted" style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {contact ? `${contact} · ` : ""}
                {rem != null ? `${rem} visita(s)` : "Ilimitado"} ·{" "}
                <span style={vencColor ? { color: vencColor, fontWeight: 600 } : undefined}>{venc}</span>
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
          <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← Anterior</button>
          <span className="muted" style={{ fontSize: 13 }}>{safePage + 1} / {pageCount}</span>
          <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Siguiente →</button>
        </div>
      )}
    </div>
  );
}

function MemberModal({ member, program, onChanged, onClose }: { member: Member; program: MembershipProgram; onChanged: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [days, setDays] = useState("30");
  const st = memberStatus(member);
  const rem = visitsRemaining(member);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setErr("");
    const res = await authedFetch("/api/membership/member", { method: "PATCH", body: JSON.stringify({ memberId: member.id, ...body }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo actualizar.");
    onChanged();
    onClose();
  }

  async function remove() {
    if (!confirm(`¿Eliminar a ${member.memberName}?`)) return;
    setBusy(true);
    setErr("");
    const res = await authedFetch("/api/membership/member", { method: "DELETE", body: JSON.stringify({ memberId: member.id }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo eliminar.");
    onChanged();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{member.memberName}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
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

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {st !== "expired" && (
            <button className="btn btn-outline" style={{ flex: "1 1 120px" }} disabled={busy} onClick={() => patch({ deactivate: true })}>
              Desactivar
            </button>
          )}
          <button className="btn btn-ghost" style={{ flex: "1 1 120px", color: "#c62828" }} disabled={busy} onClick={remove}>
            Eliminar
          </button>
        </div>

        <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>Historial</h4>
          {(() => {
            const events = [...(member.history || [])].sort((a, b) => b.t - a.t);
            if (!events.length) return <p className="muted" style={{ fontSize: 13, margin: 0 }}>Sin actividad todavía.</p>;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {events.map((e, i) => (
                  <div key={i} className="row spread" style={{ alignItems: "baseline", gap: 12, fontSize: 13 }}>
                    <span>{memberEventLabel(e)}</span>
                    <span className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(e.t)}</span>
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

/* ---------- Resumen tab: analytics, client limit, stamping, recent clients ---------- */
function ResumenTab({
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
  const returned = clients.filter(
    (c) => c.memberships.reduce((s, m) => s + (m.rewardsRedeemed || 0) * slotsOf(m) + m.currentStamps, 0) > 1
  ).length;
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
  const upgradeHref = `https://wa.me/59175983004?text=${encodeURIComponent(
    "Hola, quiero mejorar mi plan de SoyCasero para tener más caseros."
  )}`;
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
            {atLimit ? "⚠️ " : ""}{remainingText}
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
          <select className="input" value={filterCardId} onChange={(e) => { setFilterCardId(e.target.value); setPage(0); }}>
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
              <select
                className="input"
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as "nuevos" | "visitas")}
              >
                <option value="nuevos">Nuevos caseros</option>
                <option value="visitas">Visitas recientes</option>
              </select>
              <select
                className="input"
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                value={chartRange}
                onChange={(e) => setChartRange(e.target.value)}
              >
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
                  <rect
                    key={`hit-${i}`}
                    x={cx(i) - band / 2}
                    y={padTop}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoverPt(i)}
                  />
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
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.6, cursor: "not-allowed" }}
                    disabled
                  >
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
                    <div className="muted">
                      {single ? `${single.currentStamps}/${slotsOf(single)} sellos` : `${cl.memberships.length} tarjetas`}
                    </div>
                  </div>
                  <div className="row" style={{ width: "auto", gap: 10, alignItems: "center" }}>
                    {!cajero && single && <span className="code-pill">{single.cardCode}</span>}
                    <span aria-hidden style={{ color: "var(--text-secondary)", fontSize: 20, lineHeight: 1 }}>›</span>
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
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ width: "auto" }}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                >
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ---------- Tarjetas tab: one panel per card + add-card tile ---------- */
function TarjetasTab({
  cards,
  planInfo,
  onEdit,
  onNew,
  onChanged,
}: {
  cards: LoyaltyCard[];
  planInfo: PlanInfo;
  onEdit: (c: LoyaltyCard) => void;
  onNew: () => void;
  onChanged: () => void;
}) {
  const canAdd = cards.length < planInfo.maxCards;
  return (
    <div>
      {cards.map((card) => (
        <CardPanel key={card.id} card={card} onEdit={() => onEdit(card)} onChanged={onChanged} />
      ))}
      <NewCardTile canAdd={canAdd} planInfo={planInfo} onNew={onNew} />
    </div>
  );
}

function NewCardTile({ canAdd, planInfo, onNew }: { canAdd: boolean; planInfo: PlanInfo; onNew: () => void }) {
  return (
    <button
      className="add-card-tile mt"
      onClick={canAdd ? onNew : undefined}
      disabled={!canAdd}
      title={canAdd ? "Crear otra tarjeta" : "Mejora tu plan para crear más tarjetas"}
    >
      <span className="add-card-plus" aria-hidden style={{ display: "inline-flex", alignItems: "center" }}>
        {canAdd ? "＋" : <Lock size={24} />}
      </span>
      <span>
        Nueva tarjeta
        <span className="add-card-hint">
          {canAdd
            ? "Crea otra tarjeta de sellos"
            : planInfo.id === "negocio"
              ? `Alcanzaste el máximo de ${planInfo.maxCards} tarjetas`
              : "Mejora al plan Negocio para crear más de una tarjeta"}
        </span>
      </span>
    </button>
  );
}

/* One card: preview, edit, its own enrollment QR, and activate/deactivate. */
function CardPanel({ card, onEdit, onChanged }: { card: LoyaltyCard; onEdit: () => void; onChanged: () => void }) {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyActive, setBusyActive] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  useEffect(() => {
    // Prefer the canonical domain so QR links never point customers at the
    // redirecting apex; fall back to the current origin (local dev).
    const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    if (base) setJoinUrl(`${base}/join/${card.id}`);
  }, [card.id]);

  async function setActive(active: boolean) {
    setBusyActive(true);
    try {
      const res = await authedFetch("/api/business/deactivate", {
        method: "POST",
        body: JSON.stringify({ cardId: card.id, active }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusyActive(false);
    }
  }

  async function deleteCard() {
    if (
      !confirm(
        "¿Eliminar esta tarjeta? Se borrará la tarjeta y su historial, y las tarjetas de tus caseros quedarán finalizadas (en gris). Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    setBusyDelete(true);
    try {
      const res = await authedFetch("/api/business/card/delete", {
        method: "POST",
        body: JSON.stringify({ cardId: card.id }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusyDelete(false);
    }
  }

  const inactive = card.isActive === false;

  return (
    <div className="card mt">
      <div className="row spread" style={{ alignItems: "center" }}>
        <h3 style={{ fontSize: 17, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {card.rewardDescription || "Tarjeta"}
          {inactive && <span style={{ fontSize: 11, fontWeight: 700, color: "#c62828" }}>● Desactivada</span>}
        </h3>
        <button
          className="btn btn-sm btn-ghost"
          style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={onEdit}
        >
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

      <p style={{ fontSize: 15, fontWeight: 600, textAlign: "center", margin: "22px 0 12px" }}>
        Inscribe caseros — imprime este QR para tu mostrador
      </p>
      <div className="center">{joinUrl && <QrCode value={joinUrl} size={200} />}</div>
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

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {inactive ? (
          <button className="btn btn-primary" style={{ width: "auto" }} onClick={() => setActive(true)} disabled={busyActive || busyDelete}>
            {busyActive ? "Reactivando…" : "Reactivar tarjeta"}
          </button>
        ) : (
          <button
            className="btn btn-outline"
            style={{ width: "auto" }}
            onClick={() => {
              if (confirm("¿Desactivar esta tarjeta? Las tarjetas de tus caseros se verán en gris (finalizadas).")) {
                setActive(false);
              }
            }}
            disabled={busyActive || busyDelete}
          >
            {busyActive ? "Desactivando…" : "Desactivar tarjeta"}
          </button>
        )}
        <button
          className="btn"
          style={{ width: "auto", background: "#fdecea", color: "#c62828" }}
          onClick={deleteCard}
          disabled={busyActive || busyDelete}
        >
          {busyDelete ? "Eliminando…" : "Eliminar tarjeta"}
        </button>
      </div>
    </div>
  );
}

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
      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", textAlign: "center", margin: "10px 0 0" }}>
        Así llegará la notificación al celular de tus caseros (vista aproximada).
      </p>
    </div>
  );
}

function ComunicacionTab({
  business,
  planInfo,
  customers,
  cards,
  onChanged,
}: {
  business: Business;
  planInfo: PlanInfo;
  customers: CustomerCard[];
  cards: LoyaltyCard[];
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
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

  async function send() {
    // Guard against accidental repeats: same text already sent in the last 24h
    // (double-clicks and re-sends burn the daily quota).
    const dup = recent.find((h) => h.message.trim() === message.trim());
    if (dup) {
      const mins = Math.max(1, Math.round((now - dup.at) / 60000));
      const ago = mins < 60 ? `hace ${mins} min` : `hace ${Math.round(mins / 60)} h`;
      if (!confirm(`Ya enviaste este mismo mensaje ${ago}. ¿Enviarlo de nuevo?`)) return;
    }
    setErr("");
    setMsg("");
    setBusy(true);
    const res = await authedFetch("/api/business/broadcast", { method: "POST", body: JSON.stringify({ message: message.trim(), segment }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo enviar.");
    setMsg(`Enviado a ${json.recipients} casero(s).`);
    setMessage("");
    onChanged();
  }

  return (
    <div className="card mt" style={{ position: "relative", overflow: "hidden" }}>
      <h3 style={{ fontSize: 18, marginTop: 0 }}>Mensajes a tus caseros</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Envía una promoción, recordatorio o aviso al wallet de todos tus caseros.
        {paid
          ? ` Tu plan ${planInfo.label} permite ${planInfo.broadcastsPerDay} mensaje(s) al día${planInfo.broadcastGapHours ? `, con ${planInfo.broadcastGapHours}h entre cada uno` : ""}.`
          : ""}
      </p>

      <div style={paid ? undefined : { filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }} aria-hidden={!paid}>
        {/* Send status: progress bar + "usados/permitidos" + countdown */}
        <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: blocked ? "var(--text-secondary)" : "#16a34a" }}>
              {blocked ? "Próximo envío disponible" : "✓ Listo para enviar"}
            </span>
            <strong style={{ fontSize: 15 }}>
              {usedToday}/{perDay}
              <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> hoy</span>
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
          <select className="input" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
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
          <textarea
            ref={msgRef}
            className="input"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej: ¡Hoy 2x1 en cafés! ☕ Ven y suma sellos."
            maxLength={160}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>{message.length}/160</p>
        </div>

        {/* Live preview: how the notification lands on the casero's phone */}
        <div className="field">
          <label>Vista previa</label>
          <NotifPreview
            businessName={business.name}
            logoPng={business.logoPng || cards[0]?.logoPng}
            color={cards[0]?.cardColor || "#E53935"}
            text={message.trim()}
          />
        </div>

        <button className="btn btn-primary" onClick={send} disabled={busy || blocked || !message.trim() || segCount === 0}>
          {busy ? "Enviando…" : segCount === 0 ? "Sin caseros en este grupo" : `Enviar a ${segCount} casero(s)`}
        </button>

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

/* ---------- The "add a stamp" tool ---------- */
function StampBox({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "full"; text: string } | null>(null);
  // Code of a FULL card awaiting the redeem confirmation (the only moment the
  // redeem action exists — there's no standalone redeem button to mis-tap).
  const [pendingRedeem, setPendingRedeem] = useState<string | null>(null);

  async function act(redeem: boolean, override?: string) {
    if (busy) return; // guard against double-submit (Enter + click, double-tap, scan)
    const cc = (override ?? code).trim();
    if (!cc) return setMsg({ kind: "err", text: "Ingresa el código del casero." });
    setBusy(true);
    setMsg(null);
    if (!redeem) setPendingRedeem(null);
    const res = await authedFetch("/api/stamp", {
      method: "POST",
      body: JSON.stringify({ cardCode: cc, redeem }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "err", text: json.error || "Error" });

    if (json.redeemed) {
      setMsg({ kind: "ok", text: `🎁 Recompensa canjeada para ${json.customerName || "el casero"}. Tarjeta reiniciada.` });
      setPendingRedeem(null);
      setCode("");
    } else if (json.alreadyFull || json.completed) {
      // Full card (just completed or already was) → offer the redeem in context.
      setMsg({ kind: "full", text: `Tarjeta completa (${json.currentStamps}/${json.totalSlots}) 🎁 ¿Canjear la recompensa?` });
      setPendingRedeem(cc);
      setCode("");
    } else {
      setMsg({ kind: "ok", text: `✅ Sello agregado: ${json.currentStamps}/${json.totalSlots}` });
      setCode("");
    }
    onChanged();
  }

  return (
    <div className="card mt">
      <h3 style={{ fontSize: 18 }}>Sumar un sello</h3>
      <p className="muted">Escribe el código de la tarjeta del casero, o escanéalo con la cámara. Si la tarjeta está llena, aquí mismo canjeas la recompensa.</p>
      {msg && <div className={msg.kind === "err" ? "error-box" : msg.kind === "full" ? "warn-box" : "success-box"}>{msg.text}</div>}
      {pendingRedeem && (
        <button className="btn" style={{ marginBottom: 10, background: "#15803d", color: "#fff" }} onClick={() => act(true, pendingRedeem)} disabled={busy}>
          🎁 Canjear recompensa (código {pendingRedeem})
        </button>
      )}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          inputMode="numeric"
          placeholder="Ej: 482"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && act(false)}
          style={{ flex: "1 1 120px" }}
        />
        <button className="btn" style={{ flex: "0 0 auto", width: "auto", background: "#e53935", color: "#fff" }} onClick={() => act(false)} disabled={busy}>
          {busy ? "…" : "Sumar sello"}
        </button>
        <button
          className="btn btn-outline"
          style={{ flex: "0 0 auto", width: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => setScanning(true)}
          disabled={busy}
        >
          <ScanLine size={16} aria-hidden /> Escanear
        </button>
      </div>

      {scanning && (
        <BarcodeScanner
          onDetected={(value) => {
            setScanning(false);
            act(false, value);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

/* ---------- Customer detail modal ---------- */
function fmtDate(ts?: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/La_Paz",
    });
  } catch {
    return "—";
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

interface Client {
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
function groupClients(memberships: CustomerCard[]): Client[] {
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

function ClientModal({
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
  const totalStamps = client.memberships.reduce(
    (s, m) => s + (m.rewardsRedeemed || 0) * (cardsById.get(m.loyaltyCardId)?.totalSlots ?? 0) + m.currentStamps,
    0
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function deleteClient() {
    const n = client.memberships.length;
    const msg =
      n > 1
        ? `¿Eliminar a ${client.name} y sus ${n} tarjetas? Se borran sus datos. No se puede deshacer.`
        : `¿Eliminar a ${client.name}? Se borra su tarjeta y datos. No se puede deshacer.`;
    if (!confirm(msg)) return;
    setBusy(true);
    setErr("");
    const res = await authedFetch("/api/business/customer", {
      method: "DELETE",
      body: JSON.stringify({ customerCardIds: client.memberships.map((m) => m.id) }),
    });
    setBusy(false);
    if (res.ok) {
      onChanged();
      onClose();
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "No se pudo eliminar.");
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

        {hasRemovedPass && (
          <div
            className="warn-box"
            style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
          >
            <span style={{ fontSize: 14 }}>Este casero eliminó su pase del wallet.</span>
            {!cajero && (
              <button
                className="btn btn-sm"
                style={{ width: "auto", background: "#c62828", color: "#fff", flex: "0 0 auto" }}
                onClick={deleteClient}
                disabled={busy}
              >
                {busy ? "Eliminando…" : "Eliminar casero"}
              </button>
            )}
          </div>
        )}
        {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="detail-list">
          <DetailRow label="Casero desde" value={fmtDate(client.createdAt)} />
          <DetailRow label="Última visita" value={fmtDate(client.lastStampDate)} />
          <DetailRow label="Recompensas canjeadas" value={String(totalRewards)} />
          <DetailRow label="Sellos acumulados" value={String(totalStamps)} />
        </div>

        {!cajero && (
          <>
            <h4 style={{ margin: "16px 0 4px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
              Contacto
            </h4>
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
                {!paid
                  ? "🔒 Mejora a un plan Café o Negocio para ver el correo y teléfono de tus caseros."
                  : "Este casero no autorizó compartir su contacto para fines de marketing."}
              </div>
            )}
          </>
        )}

        <h4 style={{ margin: "16px 0 4px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
          Tarjetas ({client.memberships.length})
        </h4>
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
                    {m.passRemovedAt ? (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#c62828" }}>· pase eliminado</span>
                    ) : null}
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
