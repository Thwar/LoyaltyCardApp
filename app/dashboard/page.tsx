"use client";
import { useCallback, useEffect, useState } from "react";
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
import { Lock, Pencil } from "lucide-react";
import type { Business, CustomerCard, LoyaltyCard, StampShape } from "@/lib/types";
import { STAMP_SHAPES, STAMP_ICONS } from "@/lib/stampShapes";

interface MeResponse {
  business: Business | null;
  card?: LoyaltyCard | null;
  cards?: LoyaltyCard[];
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
  const [logo, setLogo] = useState<string | null>(existing?.logoPng ? `data:image/png;base64,${existing.logoPng}` : null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    setSaving(true);
    const res = await authedFetch("/api/business/card", {
      method: "POST",
      body: JSON.stringify({ cardId: existing?.id, totalSlots, rewardDescription: rewardDescription.trim(), welcomeMessage: welcomeMessage.trim(), cardColor, textColor, stampShape, logo }),
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
          businessName={existing?.businessName || businessName || "Tu negocio"}
          totalSlots={totalSlots}
          currentStamps={Math.min(2, totalSlots)}
          rewardDescription={rewardDescription || "Tu recompensa"}
          cardColor={cardColor}
          textColor={textColor}
          stampShape={stampShape}
          logoUrl={logo || undefined}
        />
      </div>

      <div className="card">
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
            Se le envía al cliente como notificación cuando guarda tu tarjeta (Android y iPhone).
          </p>
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

/* ---------- Manage a business's card(s): tabbed Resumen / Tarjetas ---------- */
function CardManager({
  business,
  cards,
  customers,
  count,
  onChanged,
}: {
  business: Business;
  cards: LoyaltyCard[];
  customers: CustomerCard[];
  count: number;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<Client | null>(null);
  const [tab, setTab] = useState<"resumen" | "tarjetas" | "comunicacion">("resumen");
  // No cards yet → open straight into the create form.
  const [editing, setEditing] = useState<LoyaltyCard | "new" | null>(cards.length === 0 ? "new" : null);
  const planInfo = effectivePlan(business);
  const cardsById = new Map(cards.map((c) => [c.id, c]));

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
      </div>

      {tab === "resumen" ? (
        <ResumenTab
          cards={cards}
          customers={customers}
          count={count}
          planInfo={planInfo}
          onChanged={onChanged}
          onSelect={setSelected}
        />
      ) : tab === "tarjetas" ? (
        <TarjetasTab
          cards={cards}
          planInfo={planInfo}
          onEdit={(c) => setEditing(c)}
          onNew={() => setEditing("new")}
          onChanged={onChanged}
        />
      ) : (
        <ComunicacionTab business={business} planInfo={planInfo} onChanged={onChanged} />
      )}

      {selected && (
        <ClientModal client={selected} cardsById={cardsById} plan={planInfo.id} onChanged={onChanged} onClose={() => setSelected(null)} />
      )}
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
}: {
  cards: LoyaltyCard[];
  customers: CustomerCard[];
  count: number;
  planInfo: PlanInfo;
  onChanged: () => void;
  onSelect: (c: Client) => void;
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
      a.download = "clientes.csv";
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
  const remainingText =
    limit == null
      ? ""
      : count >= limit
        ? "Alcanzaste el límite de tu plan. Mejora tu plan para inscribir más clientes."
        : `Te quedan ${limit - count} clientes en tu plan ${planInfo.label}.`;
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
            border: `1px solid ${nearLimit ? "#e0796f" : "#f3c0bd"}`,
            background: nearLimit ? "#fbdedb" : "#fbece9",
            marginTop: 14,
            marginBottom: 16,
          }}
        >
          <div className="row spread" style={{ alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 17, margin: 0 }}>👥 Clientes activos</h3>
            <span style={{ fontWeight: 800, fontSize: 22, color: nearLimit ? "#c62828" : "var(--primary)" }}>{limitLabel}</span>
          </div>
          <div className="progress" style={{ background: "#fff" }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: nearLimit ? "#c62828" : undefined }} />
          </div>
          <p className="muted" style={{ fontSize: 14, marginTop: 10, marginBottom: 0 }}>{remainingText}</p>
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
        <StatCard label="Clientes" value={clients.length} />
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
            <StatCard label="Sellos por cliente" value={avgStamps} />
          </div>

          <div className="row spread" style={{ alignItems: "center", margin: "20px 0 6px", flexWrap: "wrap", gap: 8 }}>
            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)", margin: 0 }}>
              {chartMetric === "nuevos" ? "Nuevos clientes" : "Visitas recientes"}
            </h4>
            <div className="row" style={{ width: "auto", gap: 8 }}>
              <select
                className="input"
                style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value as "nuevos" | "visitas")}
              >
                <option value="nuevos">Nuevos clientes</option>
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
              Mejora al plan Café o Negocio para ver retención, clientes en riesgo y más.
            </span>
          </div>
        )}
      </div>

      <div className="card mt">
        <div className="row spread" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>Clientes</h3>
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
            {clients.length > 0 &&
              (planInfo.paid ? (
                <button className="btn btn-sm btn-outline" style={{ width: "auto" }} onClick={exportCsv} disabled={exporting}>
                  {exporting ? "Exportando…" : "Exportar CSV"}
                </button>
              ) : (
                <span title="Mejora a un plan de pago para exportar tus clientes" style={{ display: "inline-flex" }}>
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
          <p className="muted mt">Aún no tienes clientes inscritos.</p>
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
                    {single && <span className="code-pill">{single.cardCode}</span>}
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
        "¿Eliminar esta tarjeta? Se borrará la tarjeta y su historial, y las tarjetas de tus clientes quedarán finalizadas (en gris). Esta acción no se puede deshacer."
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
        Inscribe clientes — imprime este QR para tu mostrador
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
              if (confirm("¿Desactivar esta tarjeta? Las tarjetas de tus clientes se verán en gris (finalizadas).")) {
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

function ComunicacionTab({ business, planInfo, onChanged }: { business: Business; planInfo: PlanInfo; onChanged: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
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

  async function send() {
    setErr("");
    setMsg("");
    setBusy(true);
    const res = await authedFetch("/api/business/broadcast", { method: "POST", body: JSON.stringify({ message: message.trim() }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo enviar.");
    setMsg(`Enviado a ${json.recipients} cliente(s).`);
    setMessage("");
    onChanged();
  }

  return (
    <div className="card mt" style={{ position: "relative", overflow: "hidden" }}>
      <h3 style={{ fontSize: 18, marginTop: 0 }}>Mensajes a tus clientes</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Envía una promoción, recordatorio o aviso al wallet de todos tus clientes.
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
          <label>Mensaje</label>
          <textarea
            className="input"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej: ¡Hoy 2x1 en cafés! ☕ Ven y suma sellos."
            maxLength={160}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>{message.length}/160</p>
        </div>

        <button className="btn btn-primary" onClick={send} disabled={busy || blocked || !message.trim()}>
          {busy ? "Enviando…" : "Enviar a mis clientes"}
        </button>

        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, margin: "0 0 8px" }}>Historial de mensajes</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {history
                .slice()
                .reverse()
                .map((h) => (
                  <li key={h.at} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 14 }}>{h.message}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {new Date(h.at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
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
          <strong>Mensajes a tus clientes</strong>
          <span className="muted" style={{ fontSize: 13, maxWidth: 320 }}>
            Mejora al plan Café o Negocio para enviar promociones, recordatorios y avisos a todos tus clientes.
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
      cl = { customerId: key, name: m.customerName || "Cliente", consent: false, memberships: [] };
      map.set(key, cl);
    }
    cl.memberships.push(m);
    if (m.customerName && cl.name === "Cliente") cl.name = m.customerName;
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
}: {
  client: Client;
  cardsById: Map<string, LoyaltyCard>;
  plan?: Business["plan"];
  onChanged: () => void;
  onClose: () => void;
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
            <span style={{ fontSize: 14 }}>Este cliente eliminó su pase del wallet.</span>
            <button
              className="btn btn-sm"
              style={{ width: "auto", background: "#c62828", color: "#fff", flex: "0 0 auto" }}
              onClick={deleteClient}
              disabled={busy}
            >
              {busy ? "Eliminando…" : "Eliminar cliente"}
            </button>
          </div>
        )}
        {err && <div className="error-box" style={{ marginBottom: 10 }}>{err}</div>}

        <div className="detail-list">
          <DetailRow label="Casero desde" value={fmtDate(client.createdAt)} />
          <DetailRow label="Última visita" value={fmtDate(client.lastStampDate)} />
          <DetailRow label="Recompensas canjeadas" value={String(totalRewards)} />
          <DetailRow label="Sellos acumulados" value={String(totalStamps)} />
        </div>

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
              ? "🔒 Mejora a un plan Café o Negocio para ver el correo y teléfono de tus clientes."
              : "Este cliente no autorizó compartir su contacto para fines de marketing."}
          </div>
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
                <span className="code-pill">{m.cardCode}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
