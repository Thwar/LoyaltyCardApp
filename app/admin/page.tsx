"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, signInWithCustomToken } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { PageLoader } from "@/components/PageLoader";
import { PLANS, type PlanId } from "@/lib/plans";

interface BizRow {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: number | null;
  plan: PlanId;
  planLabel: string;
  storedPlan: string;
  planExpiresAt: number | null;
  expired: boolean;
  stats: { clients: number; cards: number; memberships: number; redemptions: number; stampsGiven: number };
}
interface Overview {
  totals: { businesses: number; clients: number; memberships: number; cards: number; stamps: number; rewards: number; appleRegistrations: number };
  businesses: BizRow[];
}

function fmtDate(ts?: number | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"negocios" | "datos">("negocios");
  const [data, setData] = useState<Overview | null>(null);

  const [planFor, setPlanFor] = useState<BizRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<BizRow | null>(null);
  const [detailFor, setDetailFor] = useState<BizRow | null>(null);

  const load = useCallback(async () => {
    setErr("");
    const res = await authedFetch("/api/admin/overview");
    if (res.status === 403) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error || "No se pudo cargar.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  async function impersonate(b: BizRow) {
    if (!confirm(`Vas a entrar como "${b.name}". Tu sesión de admin se cerrará; para volver, inicia sesión de nuevo. ¿Continuar?`)) {
      return;
    }
    const res = await authedFetch("/api/admin/impersonate", { method: "POST", body: JSON.stringify({ businessId: b.id }) });
    const json = await res.json();
    if (!res.ok) return setErr(json.error || "No se pudo impersonar.");
    try {
      await signInWithCustomToken(getClientAuth(), json.token);
      localStorage.setItem("impersonating", json.businessName || b.name);
      router.replace("/dashboard");
    } catch {
      setErr("No se pudo iniciar sesión como el negocio.");
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      setAuthReady(true);
      if (!u) router.replace("/login");
      else load();
    });
    return () => unsub();
  }, [router, load]);

  if (!authReady || loading) return <PageLoader />;

  if (denied) {
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: "center" }}>
        <h1 style={{ fontSize: 22 }}>No autorizado</h1>
        <p className="muted">Esta área es solo para administradores.</p>
        <Link href="/dashboard" className="btn btn-outline mt" style={{ display: "inline-block", width: "auto" }}>
          Ir al panel
        </Link>
      </div>
    );
  }

  const t = data?.totals;

  return (
    <div className="container container-wide">
      <div className="row spread" style={{ marginBottom: 16, alignItems: "center" }}>
        <h1 style={{ fontSize: 24, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          🛠️ God Mode
          <span className="plan-badge plan-negocio">admin</span>
        </h1>
        <div className="row" style={{ width: "auto", gap: 8 }}>
          <Link href="/dashboard" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
            Panel
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

      {err && <div className="error-box">{err}</div>}

      <div className="tabs">
        <button className={`tab${tab === "negocios" ? " active" : ""}`} onClick={() => setTab("negocios")}>
          Negocios
        </button>
        <button className={`tab${tab === "datos" ? " active" : ""}`} onClick={() => setTab("datos")}>
          Modelo de datos
        </button>
      </div>

      {tab === "negocios" ? (
        <>
          {t && (
            <div className="stat-grid mt">
              <StatCard label="Negocios" value={t.businesses} />
              <StatCard label="Clientes" value={t.clients} />
              <StatCard label="Tarjetas" value={t.cards} />
              <StatCard label="Sellos" value={t.stamps} />
              <StatCard label="Recompensas" value={t.rewards} />
              <StatCard label="Pases Apple" value={t.appleRegistrations} />
            </div>
          )}

          <div className="card mt">
            <h3 style={{ fontSize: 18, marginTop: 0 }}>Negocios ({data?.businesses.length || 0})</h3>
            {!data?.businesses.length ? (
              <p className="muted">Aún no hay negocios registrados.</p>
            ) : (
              data.businesses.map((b) => (
                <div key={b.id} className="biz-row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {b.name || "—"}
                      <span className={`plan-badge plan-${b.plan}`}>{b.planLabel}</span>
                      {b.expired && <span style={{ fontSize: 11, fontWeight: 700, color: "#c62828" }}>· vencido</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {b.ownerEmail || "sin correo"} · {b.stats.clients} clientes · {b.stats.cards} tarjeta(s)
                      {b.planExpiresAt ? ` · vence ${fmtDate(b.planExpiresAt)}` : ""}
                    </div>
                  </div>
                  <div className="row" style={{ width: "auto", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setDetailFor(b)}>
                      Ver
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ width: "auto" }}
                      onClick={() => impersonate(b)}
                      title="Entrar al panel de este negocio (impersonar)"
                    >
                      Entrar
                    </button>
                    <button className="btn btn-sm btn-outline" style={{ width: "auto" }} onClick={() => setPlanFor(b)}>
                      Plan
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ width: "auto", background: "#fdecea", color: "#c62828" }}
                      onClick={() => setDeleteFor(b)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <DataView />
      )}

      {planFor && <PlanModal biz={planFor} onClose={() => setPlanFor(null)} onSaved={() => { setPlanFor(null); load(); }} />}
      {deleteFor && (
        <DeleteModal biz={deleteFor} onClose={() => setDeleteFor(null)} onDeleted={() => { setDeleteFor(null); load(); }} />
      )}
      {detailFor && <DetailModal biz={detailFor} onClose={() => setDetailFor(null)} />}
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

/* ---------- Set plan + expiration ---------- */
function addMonths(months: number): number {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

function PlanModal({ biz, onClose, onSaved }: { biz: BizRow; onClose: () => void; onSaved: () => void }) {
  const [plan, setPlan] = useState<PlanId>(biz.storedPlan as PlanId);
  const [expiresAt, setExpiresAt] = useState<number | null>(biz.planExpiresAt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const paid = plan !== "gratis";

  async function save() {
    setBusy(true);
    setErr("");
    const res = await authedFetch(`/api/admin/business/${biz.id}`, {
      method: "PATCH",
      body: JSON.stringify({ plan, planExpiresAt: paid ? expiresAt : null }),
    });
    const json = await res.json();
    setBusy(false);
    if (res.ok) onSaved();
    else setErr(json.error || "No se pudo guardar.");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Plan · {biz.name}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {err && <div className="error-box">{err}</div>}

        <div className="field">
          <label>Plan</label>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
            {Object.values(PLANS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {paid && (
          <div className="field">
            <label>Vence</label>
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {[1, 3, 6, 12].map((m) => (
                <button key={m} type="button" className="btn btn-sm btn-outline" style={{ width: "auto" }} onClick={() => setExpiresAt(addMonths(m))}>
                  +{m} mes{m > 1 ? "es" : ""}
                </button>
              ))}
              <button type="button" className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setExpiresAt(null)}>
                Sin vencimiento
              </button>
            </div>
            <input
              type="date"
              className="input mt-sm"
              style={{ marginTop: 8 }}
              value={expiresAt ? new Date(expiresAt).toISOString().slice(0, 10) : ""}
              onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value + "T23:59:59").getTime() : null)}
            />
            <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              {expiresAt ? `Vence el ${fmtDate(expiresAt)}.` : "Sin fecha de vencimiento."}
            </p>
          </div>
        )}

        <button className="btn btn-primary mt" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : "Guardar plan"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Delete a business (type-to-confirm) ---------- */
function DeleteModal({ biz, onClose, onDeleted }: { biz: BizRow; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const match = confirm.trim().toLowerCase() === (biz.name || "").trim().toLowerCase();

  async function del() {
    setBusy(true);
    setErr("");
    const res = await authedFetch(`/api/admin/business/${biz.id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm }),
    });
    const json = await res.json();
    setBusy(false);
    if (res.ok) onDeleted();
    else setErr(json.error || "No se pudo eliminar.");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#c62828" }}>Eliminar negocio</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="warn-box">
          Esto <strong>desactiva</strong> el negocio <strong>{biz.name}</strong>: las tarjetas de sus{" "}
          {biz.stats.clients} cliente(s) quedan <strong>en gris (finalizadas)</strong> en su wallet, se borran
          sus sellos, recompensas y datos de contacto, y el negocio desaparece de tu panel. No se puede deshacer.
        </div>

        {err && <div className="error-box mt">{err}</div>}

        <div className="field mt">
          <label>Escribe el nombre del negocio para confirmar</label>
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={biz.name} />
        </div>

        <button
          className="btn mt"
          style={{ background: match ? "#c62828" : "#e0a0a0", color: "#fff", cursor: match ? "pointer" : "not-allowed" }}
          onClick={del}
          disabled={!match || busy}
        >
          {busy ? "Eliminando…" : "Eliminar definitivamente"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Drill-in: a business's cards + clients ---------- */
interface Detail {
  business: Record<string, unknown> & { ownerEmail?: string | null };
  cards: { id: string; rewardDescription?: string; totalSlots?: number; isActive?: boolean; cardColor?: string }[];
  customers: { id: string; customerName?: string; customerEmail?: string; customerPhone?: string; currentStamps?: number; cardCode?: string; rewardsRedeemed?: number; createdAt?: number }[];
}

function DetailModal({ biz, onClose }: { biz: BizRow; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    authedFetch(`/api/admin/business/${biz.id}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setDetail(j) : setErr(j.error || "Error")))
      .catch(() => setErr("No se pudo cargar."));
  }, [biz.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{biz.name}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {err && <div className="error-box">{err}</div>}
        {!detail ? (
          <p className="muted">Cargando…</p>
        ) : (
          <>
            <div className="detail-list">
              <div className="detail-row">
                <span className="muted">Dueño</span>
                <span style={{ fontWeight: 600 }}>{detail.business.ownerEmail || "—"}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Clientes</span>
                <span style={{ fontWeight: 600 }}>{biz.stats.clients}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Sellos otorgados</span>
                <span style={{ fontWeight: 600 }}>{biz.stats.stampsGiven}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Recompensas canjeadas</span>
                <span style={{ fontWeight: 600 }}>{biz.stats.redemptions}</span>
              </div>
            </div>

            <h4 style={{ margin: "16px 0 6px", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
              Tarjetas ({detail.cards.length})
            </h4>
            {detail.cards.map((c) => (
              <div key={c.id} className="cust-row">
                <div>
                  <div style={{ fontWeight: 600 }}>{c.rewardDescription || "—"}</div>
                  <div className="muted">
                    {c.totalSlots} sellos · {c.isActive === false ? "desactivada" : "activa"}
                  </div>
                </div>
                <span aria-hidden style={{ width: 18, height: 18, borderRadius: 4, background: c.cardColor || "#ccc" }} />
              </div>
            ))}

            <h4 style={{ margin: "16px 0 6px", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
              Clientes ({detail.customers.length})
            </h4>
            {detail.customers.slice(0, 50).map((c) => (
              <div key={c.id} className="cust-row">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{c.customerName || "Cliente"}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {c.customerEmail || "—"}
                    {c.customerPhone ? ` · ${c.customerPhone}` : ""} · {c.currentStamps ?? 0} sellos
                  </div>
                </div>
                <span className="code-pill">{c.cardCode}</span>
              </div>
            ))}
            {detail.customers.length > 50 && <p className="muted mt">…y {detail.customers.length - 50} más</p>}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- DB / data-model viewer ---------- */
interface SchemaCol {
  collection: string;
  label: string;
  note?: string;
  count: number;
  fields: { name: string; type: string }[];
}

function DataView() {
  const [cols, setCols] = useState<SchemaCol[] | null>(null);
  const [err, setErr] = useState("");
  const [browse, setBrowse] = useState<{ collection: string; docs: Record<string, unknown>[] } | null>(null);
  const [busyCol, setBusyCol] = useState("");

  useEffect(() => {
    authedFetch("/api/admin/data")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setCols(j.collections) : setErr(j.error || "Error")))
      .catch(() => setErr("No se pudo cargar."));
  }, []);

  async function openDocs(collection: string) {
    setBusyCol(collection);
    const res = await authedFetch(`/api/admin/data?collection=${encodeURIComponent(collection)}&limit=25`);
    const json = await res.json();
    setBusyCol("");
    if (res.ok) setBrowse({ collection, docs: json.docs });
  }

  if (err) return <div className="error-box mt">{err}</div>;
  if (!cols) return <p className="muted mt">Cargando…</p>;

  return (
    <div className="mt">
      {cols.map((c) => (
        <div key={c.collection} className="card" style={{ marginBottom: 12 }}>
          <div className="row spread" style={{ alignItems: "center" }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>
              {c.label} <code className="code-pill" style={{ fontSize: 12 }}>{c.collection}</code>
            </h3>
            <div className="row" style={{ width: "auto", gap: 8, alignItems: "center" }}>
              <span className="muted" style={{ fontWeight: 700 }}>{c.count} docs</span>
              <button
                className="btn btn-sm btn-outline"
                style={{ width: "auto" }}
                onClick={() => openDocs(c.collection)}
                disabled={busyCol === c.collection || c.count === 0}
              >
                {busyCol === c.collection ? "…" : "Ver docs"}
              </button>
            </div>
          </div>
          {c.note && <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>{c.note}</p>}
          {c.fields.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {c.fields.map((f) => (
                <span key={f.name} style={{ fontSize: 12, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 8, padding: "3px 8px" }}>
                  <strong>{f.name}</strong> <span className="muted">{f.type}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {browse && (
        <div className="modal-overlay" onClick={() => setBrowse(null)}>
          <div className="modal-card" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="row spread" style={{ alignItems: "flex-start", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                <code className="code-pill">{browse.collection}</code> · {browse.docs.length} docs
              </h3>
              <button className="modal-close" onClick={() => setBrowse(null)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            {browse.docs.length === 0 ? (
              <p className="muted">Colección vacía.</p>
            ) : (
              browse.docs.map((d, i) => (
                <pre
                  key={(d.id as string) || i}
                  style={{
                    background: "var(--bg-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 12,
                    overflowX: "auto",
                    margin: "0 0 8px",
                  }}
                >
                  {JSON.stringify(d, null, 2)}
                </pre>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
