"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { CARD_COLOR_CHOICES, CARD_DEFAULTS } from "@/lib/theme";
import { getPlan, type PlanInfo } from "@/lib/plans";
import { CardPreview } from "@/components/CardPreview";
import { QrCode } from "@/components/QrCode";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";
import type { Business, CustomerCard, LoyaltyCard } from "@/lib/types";

interface MeResponse {
  business: Business | null;
  card?: LoyaltyCard | null;
  customers?: CustomerCard[];
  count?: number;
  walletConfigured?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (!authReady || loading) {
    return <PageLoader />;
  }

  return (
    <div className="container container-wide">
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
      ) : !data?.card ? (
        <CardForm onSaved={load} />
      ) : (
        <CardManager card={data.card} customers={data.customers || []} count={data.count || 0} plan={data.business.plan} onChanged={load} />
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
function CardForm({ existing, onSaved }: { existing?: LoyaltyCard; onSaved: () => void }) {
  const [totalSlots, setTotalSlots] = useState(existing?.totalSlots ?? CARD_DEFAULTS.DEFAULT_SLOTS);
  const [rewardDescription, setRewardDescription] = useState(existing?.rewardDescription ?? CARD_DEFAULTS.DEFAULT_REWARD);
  const [cardColor, setCardColor] = useState(existing?.cardColor ?? CARD_COLOR_CHOICES[0]);
  const [textColor, setTextColor] = useState(existing?.textColor ?? "#FFFFFF");
  const [logo, setLogo] = useState<string | null>(existing?.logoPng ? `data:image/png;base64,${existing.logoPng}` : null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/business/card", {
      method: "POST",
      body: JSON.stringify({ totalSlots, rewardDescription: rewardDescription.trim(), cardColor, textColor, logo }),
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
        Así verán tus clientes la tarjeta en su wallet.
      </p>

      {err && <div className="error-box">{err}</div>}

      <div style={{ marginBottom: 18 }}>
        <CardPreview
          businessName={existing?.businessName || "Tu negocio"}
          totalSlots={totalSlots}
          currentStamps={Math.min(2, totalSlots)}
          rewardDescription={rewardDescription || "Tu recompensa"}
          cardColor={cardColor}
          textColor={textColor}
          logoUrl={logo || undefined}
        />
      </div>

      <div className="card">
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

        <button className="btn btn-primary mt" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear tarjeta"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Manage an existing card: tabbed Resumen / Tarjetas ---------- */
function CardManager({
  card,
  customers,
  count,
  plan,
  onChanged,
}: {
  card: LoyaltyCard;
  customers: CustomerCard[];
  count: number;
  plan?: Business["plan"];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<CustomerCard | null>(null);
  const [tab, setTab] = useState<"resumen" | "tarjetas">("resumen");
  const planInfo = getPlan(plan);

  if (editing) {
    return (
      <div>
        <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)} style={{ marginBottom: 14 }}>
          ← Volver
        </button>
        <CardForm
          existing={card}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {card.businessName}
        <span className={`plan-badge plan-${planInfo.id}`}>{planInfo.label}</span>
        {card.isActive === false ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#c62828" }}>● Desactivado</span>
        ) : null}
      </h1>

      <div className="tabs mt">
        <button className={`tab${tab === "resumen" ? " active" : ""}`} onClick={() => setTab("resumen")}>
          Resumen
        </button>
        <button className={`tab${tab === "tarjetas" ? " active" : ""}`} onClick={() => setTab("tarjetas")}>
          Tarjetas
        </button>
      </div>

      {tab === "resumen" ? (
        <ResumenTab
          card={card}
          customers={customers}
          count={count}
          planInfo={planInfo}
          onChanged={onChanged}
          onSelect={setSelected}
        />
      ) : (
        <TarjetasTab card={card} planInfo={planInfo} onEdit={() => setEditing(true)} onChanged={onChanged} />
      )}

      {selected && <CustomerModal customer={selected} card={card} plan={plan} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ---------- Resumen tab: analytics, client limit, stamping, recent clients ---------- */
function ResumenTab({
  card,
  customers,
  count,
  planInfo,
  onChanged,
  onSelect,
}: {
  card: LoyaltyCard;
  customers: CustomerCard[];
  count: number;
  planInfo: PlanInfo;
  onChanged: () => void;
  onSelect: (c: CustomerCard) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const completed = customers.filter((c) => c.currentStamps >= card.totalSlots).length;
  const rewards = customers.reduce((s, c) => s + (c.rewardsRedeemed || 0), 0);
  const stampsGiven = customers.reduce((s, c) => s + (c.rewardsRedeemed || 0) * card.totalSlots + c.currentStamps, 0);

  const limit = planInfo.maxClients; // null = unlimited (paid plans)
  const pct = limit != null ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const nearLimit = limit != null && count >= limit * 0.8;
  const limitLabel = limit != null ? `${count} / ${limit}` : "";
  const remainingText =
    limit == null
      ? ""
      : count >= limit
        ? "Alcanzaste el límite de tu plan. Mejora tu plan para inscribir más clientes."
        : `Te quedan ${limit - count} clientes en tu plan ${planInfo.label}.`;
  const shown = showAll ? customers : customers.slice(0, 12);

  return (
    <div>
      <div className="stat-grid mt">
        <StatCard label="Clientes" value={count} />
        <StatCard label="Tarjetas completas" value={completed} />
        <StatCard label="Recompensas canjeadas" value={rewards} />
        <StatCard label="Sellos otorgados" value={stampsGiven} />
      </div>

      {limit != null && (
        <div className="card mt">
          <div className="row spread" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>Clientes activos</h3>
            <span style={{ fontWeight: 800, color: nearLimit ? "#c62828" : "var(--text)" }}>{limitLabel}</span>
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${pct}%`, background: nearLimit ? "#c62828" : undefined }} />
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            {remainingText}
          </p>
        </div>
      )}

      <StampBox onChanged={onChanged} />

      <div className="card mt">
        <div className="row spread">
          <h3 style={{ fontSize: 18, margin: 0 }}>Clientes recientes</h3>
          <span className="muted">{count} en total</span>
        </div>
        {customers.length === 0 ? (
          <p className="muted mt">Aún no tienes clientes inscritos.</p>
        ) : (
          <div className="mt">
            {shown.map((c) => (
              <div
                key={c.id}
                className="cust-row clickable"
                style={c.passRemovedAt ? { opacity: 0.55 } : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(c)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(c)}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {c.customerName || "Cliente"}
                    {c.passRemovedAt ? (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#c62828" }}>· pase eliminado</span>
                    ) : null}
                  </div>
                  <div className="muted">
                    {c.currentStamps}/{card.totalSlots} sellos
                  </div>
                </div>
                <div className="row" style={{ width: "auto", gap: 10, alignItems: "center" }}>
                  <span className="code-pill">{c.cardCode}</span>
                  <span aria-hidden style={{ color: "var(--text-secondary)", fontSize: 20, lineHeight: 1 }}>›</span>
                </div>
              </div>
            ))}
            {customers.length > 12 && (
              <button className="btn btn-sm btn-ghost mt" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Ver menos" : `Ver todos (${customers.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* ---------- Tarjetas tab: card management, QR, program state ---------- */
function TarjetasTab({
  card,
  planInfo,
  onEdit,
  onChanged,
}: {
  card: LoyaltyCard;
  planInfo: PlanInfo;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyActive, setBusyActive] = useState(false);

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
        body: JSON.stringify({ active }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusyActive(false);
    }
  }

  return (
    <div>
      <div className="row spread mt" style={{ alignItems: "center" }}>
        <h3 style={{ fontSize: 18, margin: 0 }}>Tu tarjeta</h3>
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>
          Editar
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
          logoUrl={card.logoPng ? `data:image/png;base64,${card.logoPng}` : undefined}
        />
      </div>

      {/* Add another card — disabled to encourage an upgrade */}
      <button
        className="add-card-tile mt"
        disabled
        title={planInfo.paid ? "Pronto podrás crear más tarjetas" : "Disponible en planes pagos"}
      >
        <span className="add-card-plus">＋</span>
        <span>
          Nueva tarjeta
          <span className="add-card-hint">
            {planInfo.paid ? "Próximamente" : "Mejora a un plan pago para crear más tarjetas"}
          </span>
        </span>
      </button>

      {/* Enrollment QR */}
      <div className="card mt">
        <h3 style={{ fontSize: 18 }}>Inscribe clientes</h3>
        <p className="muted">Imprime este QR y ponlo en tu mostrador. El cliente lo escanea y guarda su tarjeta.</p>
        <div className="center mt">{joinUrl && <QrCode value={joinUrl} size={210} />}</div>
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
      </div>

      {/* Activate / deactivate the program */}
      <div className="card mt">
        <h3 style={{ fontSize: 18, margin: 0 }}>Estado del programa</h3>
        {card.isActive === false ? (
          <>
            <p className="muted mt" style={{ marginBottom: 12 }}>
              Tu programa está <strong>desactivado</strong>. Las tarjetas de tus clientes aparecen en gris
              (finalizadas) en su wallet. Reactívalo para volver a usarlas.
            </p>
            <button className="btn btn-primary" onClick={() => setActive(true)} disabled={busyActive}>
              {busyActive ? "Reactivando…" : "Reactivar programa"}
            </button>
          </>
        ) : (
          <>
            <p className="muted mt" style={{ marginBottom: 12 }}>
              Desactivar marca todas las tarjetas de tus clientes como finalizadas (se ven en gris en su wallet).
              Puedes reactivarlas cuando quieras.
            </p>
            <button
              className="btn btn-outline"
              onClick={() => {
                if (
                  confirm(
                    "¿Desactivar el programa? Las tarjetas de tus clientes se marcarán como finalizadas (en gris)."
                  )
                ) {
                  setActive(false);
                }
              }}
              disabled={busyActive}
            >
              {busyActive ? "Desactivando…" : "Desactivar programa"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- The "add a stamp" tool ---------- */
function StampBox({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "full"; text: string } | null>(null);

  async function act(redeem: boolean) {
    if (!code.trim()) return setMsg({ kind: "err", text: "Ingresa el código del cliente." });
    setBusy(true);
    setMsg(null);
    const res = await authedFetch("/api/stamp", {
      method: "POST",
      body: JSON.stringify({ cardCode: code.trim(), redeem }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ kind: "err", text: json.error || "Error" });

    if (json.redeemed) {
      setMsg({ kind: "ok", text: `🎁 Recompensa canjeada para ${json.customerName || "el cliente"}. Tarjeta reiniciada.` });
    } else if (json.alreadyFull) {
      setMsg({ kind: "full", text: "Esta tarjeta ya está completa. Pulsa “Canjear recompensa”." });
    } else if (json.completed) {
      setMsg({ kind: "full", text: `¡Tarjeta completa (${json.currentStamps}/${json.totalSlots})! Lista para canjear.` });
    } else {
      setMsg({ kind: "ok", text: `✅ Sello agregado: ${json.currentStamps}/${json.totalSlots}` });
      setCode("");
    }
    onChanged();
  }

  return (
    <div className="card mt">
      <h3 style={{ fontSize: 18 }}>Sumar un sello</h3>
      <p className="muted">Escribe el código que aparece en la tarjeta del cliente.</p>
      {msg && <div className={msg.kind === "err" ? "error-box" : msg.kind === "full" ? "warn-box" : "success-box"}>{msg.text}</div>}
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          inputMode="numeric"
          placeholder="Ej: 482"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && act(false)}
        />
        <button className="btn" style={{ flex: "0 0 auto", width: "auto", background: "#e53935", color: "#fff" }} onClick={() => act(false)} disabled={busy}>
          {busy ? "…" : "Sumar sello"}
        </button>
      </div>
      <button className="btn btn-outline mt-sm" style={{ marginTop: 10 }} onClick={() => act(true)} disabled={busy}>
        Canjear recompensa
      </button>
    </div>
  );
}

/* ---------- Customer detail modal ---------- */
function fmtDate(ts?: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
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

function CustomerModal({
  customer,
  card,
  plan,
  onClose,
}: {
  customer: CustomerCard;
  card: LoyaltyCard;
  plan?: Business["plan"];
  onClose: () => void;
}) {
  const paid = plan === "cafe" || plan === "negocio";
  const canSeeContact = paid && customer.marketingConsent === true;
  const totalStamps = (customer.rewardsRedeemed || 0) * card.totalSlots + customer.currentStamps;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>{customer.customerName || "Cliente"}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {customer.passRemovedAt ? (
          <div className="warn-box" style={{ marginBottom: 8 }}>Este cliente eliminó su pase del wallet.</div>
        ) : null}

        <div className="detail-list">
          <DetailRow label="Código" value={<span className="code-pill">{customer.cardCode}</span>} />
          <DetailRow label="Sellos" value={`${Math.min(customer.currentStamps, card.totalSlots)}/${card.totalSlots}`} />
          <DetailRow label="Sellos acumulados" value={String(totalStamps)} />
          <DetailRow label="Recompensas canjeadas" value={String(customer.rewardsRedeemed || 0)} />
          <DetailRow label="Casero desde" value={fmtDate(customer.createdAt)} />
          <DetailRow label="Última visita" value={fmtDate(customer.lastStampDate)} />
        </div>

        <h4 style={{ margin: "16px 0 4px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
          Contacto
        </h4>
        {canSeeContact ? (
          <div className="detail-list">
            <DetailRow label="Correo" value={customer.customerEmail || "—"} />
            <DetailRow label="Teléfono" value={customer.customerPhone || "No proporcionado"} />
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
              ? "🔒 Mejora a un plan Café o Negocio para ver el correo y teléfono de tus clientes."
              : "Este cliente no autorizó compartir su contacto para fines de marketing."}
          </div>
        )}
      </div>
    </div>
  );
}
