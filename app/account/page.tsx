"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, sendPasswordResetEmail } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";
import { effectivePlan, getPlan, type PlanId } from "@/lib/plans";

// Read an image file and downscale to a small PNG data URL (keeps uploads tiny).
function fileToPng(file: File, max = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(max / img.width, max / img.height, 1);
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

function fmtDate(ts?: number | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function AccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cuenta" | "negocio" | "cajeros">("cuenta");
  const [role, setRole] = useState<"owner" | "cajero">("owner");
  const [cajeroName, setCajeroName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [hasBusiness, setHasBusiness] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [plan, setPlan] = useState<PlanId | undefined>(undefined);
  const [planExpiresAt, setPlanExpiresAt] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), async (u) => {
      setReady(true);
      if (!u) {
        router.replace("/login");
        return;
      }
      setEmail(u.email || "");
      try {
        const res = await authedFetch("/api/business/me");
        const json = await res.json();
        if (res.ok && json.role === "cajero") {
          setRole("cajero");
          setCajeroName(json.staffName || "");
          setLoading(false);
          return;
        }
        if (res.ok && json.business) {
          setHasBusiness(true);
          setName(json.business.name || "");
          setDescription(json.business.description || "");
          setLogo(json.business.logoPng ? `data:image/png;base64,${json.business.logoPng}` : null);
          setPlan(json.business.plan);
          setPlanExpiresAt(json.business.planExpiresAt ?? null);
        }
      } catch {}
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  async function saveName() {
    if (!name.trim()) return setErr("Ingresa un nombre.");
    setErr("");
    setMsg("");
    setSavingName(true);
    const res = await authedFetch("/api/business/setup", {
      method: "POST",
      body: JSON.stringify({ businessName: name.trim() }),
    });
    const json = await res.json();
    setSavingName(false);
    if (!res.ok) return setErr(json.error || "No se pudo guardar.");
    setHasBusiness(true);
    setMsg("Guardado.");
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await fileToPng(file));
    } catch {
      setErr("No se pudo procesar la imagen.");
    }
  }

  async function saveProfile() {
    setErr("");
    setMsg("");
    setSavingProfile(true);
    const res = await authedFetch("/api/business/profile", {
      method: "POST",
      body: JSON.stringify({ logo: logo ?? "", description: description.trim() }),
    });
    const json = await res.json();
    setSavingProfile(false);
    if (!res.ok) return setErr(json.error || "No se pudo guardar.");
    setMsg("Guardado.");
  }

  async function resetPassword() {
    setErr("");
    setMsg("");
    setResetting(true);
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      setMsg("Te enviamos un correo para restablecer tu contraseña.");
    } catch {
      setErr("No se pudo enviar el correo de restablecimiento.");
    } finally {
      setResetting(false);
    }
  }

  async function deleteAccount() {
    setErr("");
    setDeleting(true);
    const res = await authedFetch("/api/account", { method: "DELETE", body: JSON.stringify({ confirm: confirmText }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDeleting(false);
      return setErr(json.error || "No se pudo eliminar la cuenta.");
    }
    await signOut(getClientAuth());
    router.replace("/");
  }

  if (!ready || loading) {
    return <PageLoader />;
  }

  const eff = effectivePlan({ plan, planExpiresAt });
  const storedPaid = plan === "cafe" || plan === "negocio";
  const expired = storedPaid && planExpiresAt != null && planExpiresAt < Date.now();
  const planNote = expired
    ? `Tu plan ${getPlan(plan).label} venció el ${fmtDate(planExpiresAt)}. Ahora estás en Gratis.`
    : storedPaid
      ? planExpiresAt
        ? `Tu plan se renueva / vence el ${fmtDate(planExpiresAt)}.`
        : "Plan activo, sin fecha de vencimiento."
      : "Plan gratuito — hasta 50 clientes activos.";

  return (
    <div className="container">
      <div className="row spread" style={{ marginBottom: 20 }}>
        <Link href="/dashboard" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
          ← Volver
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

      <h1 style={{ fontSize: 24 }}>Mi cuenta</h1>

      {role === "cajero" ? (
        <CajeroAccount email={email} initialName={cajeroName} />
      ) : (
        <>
      {err && <div className="error-box">{err}</div>}
      {msg && <div className="success-box">{msg}</div>}

      <div className="tabs mt">
        <button
          className={`tab${tab === "cuenta" ? " active" : ""}`}
          onClick={() => {
            setErr("");
            setMsg("");
            setTab("cuenta");
          }}
        >
          Cuenta
        </button>
        <button
          className={`tab${tab === "negocio" ? " active" : ""}`}
          onClick={() => {
            setErr("");
            setMsg("");
            setTab("negocio");
          }}
        >
          Negocio
        </button>
        <button
          className={`tab${tab === "cajeros" ? " active" : ""}`}
          onClick={() => {
            setErr("");
            setMsg("");
            setTab("cajeros");
          }}
        >
          Cajeros
        </button>
      </div>

      {tab === "cajeros" ? (
        <CajeroManager max={eff.maxCashiers} />
      ) : tab === "cuenta" ? (
        <>
          <div className="card mt">
            <div className="field">
              <label>Correo</label>
              <input className="input" value={email} readOnly style={{ opacity: 0.7 }} />
            </div>
          </div>

          <div className="card mt">
            <h3 style={{ fontSize: 18, marginTop: 0, marginBottom: 8 }}>Tu plan</h3>
            <div className="row" style={{ width: "auto", gap: 8, alignItems: "center" }}>
              <span className={`plan-badge plan-${eff.id}`}>{eff.label}</span>
              {expired && <span style={{ fontSize: 12, fontWeight: 700, color: "#c62828" }}>vencido</span>}
            </div>
            <p className="muted" style={{ fontSize: 13, margin: "10px 0 0" }}>{planNote}</p>
            <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>
              Facturación gestionada manualmente. Para cambiar o renovar tu plan, escríbenos a{" "}
              <a href="mailto:admin@soycasero.com">admin@soycasero.com</a>.
            </p>
          </div>

          <div className="card mt">
            <h3 style={{ fontSize: 18, marginTop: 0, marginBottom: 6 }}>Contraseña</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              Te enviaremos un enlace a <strong>{email}</strong> para crear una contraseña nueva.
            </p>
            <button className="btn btn-outline" style={{ width: "auto" }} onClick={resetPassword} disabled={resetting}>
              {resetting ? "Enviando…" : "Restablecer contraseña"}
            </button>
          </div>

          <div className="card mt" style={{ borderColor: "#f3c0bd" }}>
            <h3 style={{ fontSize: 18, color: "#c62828", marginBottom: 6 }}>Eliminar cuenta</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Borra tu negocio, tu tarjeta, tus clientes y tu cuenta. Esta acción no se puede deshacer.
            </p>
            <div className="field">
              <label>
                Escribe <strong>ELIMINAR</strong> para confirmar
              </label>
              <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ELIMINAR" />
            </div>
            <button
              className="btn"
              style={{ background: "#c62828", color: "#fff" }}
              disabled={deleting || confirmText.trim().toUpperCase() !== "ELIMINAR"}
              onClick={deleteAccount}
            >
              {deleting ? "Eliminando…" : "Eliminar mi cuenta"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="card mt">
            <div className="field">
              <label>Nombre del negocio</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Café Central" />
            </div>
            <button className="btn btn-primary" onClick={saveName} disabled={savingName}>
              {savingName ? "Guardando…" : hasBusiness ? "Guardar cambios" : "Crear negocio"}
            </button>
          </div>

          <div className="card mt">
            <h3 style={{ fontSize: 18, marginTop: 0 }}>Logo y descripción</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
              Aparecen en las tarjetas y notificaciones de tus clientes. Si una tarjeta tiene su propio logo, ese tiene prioridad.
            </p>
            <div className="field">
              <label>Logo del negocio</label>
              {logo && (
                <div className="row" style={{ alignItems: "center", gap: 10, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="logo" style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", background: "#f0f0f0", borderRadius: 8, padding: 4 }} />
                  <button type="button" className="btn btn-sm btn-ghost" style={{ width: "auto" }} onClick={() => setLogo(null)}>
                    Quitar
                  </button>
                </div>
              )}
              <input type="file" accept="image/*" onChange={onPickLogo} />
            </div>
            <div className="field">
              <label>Descripción</label>
              <textarea
                className="input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Café de especialidad en el centro. Tostado propio."
                maxLength={240}
              />
            </div>
            <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile || !hasBusiness}>
              {savingProfile ? "Guardando…" : "Guardar logo y descripción"}
            </button>
          </div>
        </>
      )}
        </>
      )}

      <SiteFooter />
    </div>
  );
}

/* ---------- A cajero's own account: change name + reset password ---------- */
function CajeroAccount({ email, initialName }: { email: string; initialName: string }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function saveName() {
    if (!name.trim()) return setErr("Ingresa tu nombre.");
    setErr("");
    setMsg("");
    setSaving(true);
    const res = await authedFetch("/api/staff", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
    setSaving(false);
    if (!res.ok) return setErr("No se pudo guardar.");
    setMsg("Guardado.");
  }

  async function resetPassword() {
    setErr("");
    setMsg("");
    setResetting(true);
    try {
      await sendPasswordResetEmail(getClientAuth(), email);
      setMsg("Te enviamos un correo para restablecer tu contraseña.");
    } catch {
      setErr("No se pudo enviar el correo.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      {err && <div className="error-box mt">{err}</div>}
      {msg && <div className="success-box mt">{msg}</div>}
      <div className="card mt">
        <div className="field">
          <label>Correo</label>
          <input className="input" value={email} readOnly style={{ opacity: 0.7 }} />
        </div>
        <div className="field">
          <label>Tu nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
        </div>
        <button className="btn btn-primary" onClick={saveName} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>

      <div className="card mt">
        <h3 style={{ fontSize: 18, marginTop: 0, marginBottom: 6 }}>Contraseña</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Te enviaremos un enlace a <strong>{email}</strong> para crear una contraseña nueva.
        </p>
        <button className="btn btn-outline" style={{ width: "auto" }} onClick={resetPassword} disabled={resetting}>
          {resetting ? "Enviando…" : "Restablecer contraseña"}
        </button>
      </div>
    </>
  );
}

/* ---------- Cajeros (cashiers): stamp-only logins, owner-managed ---------- */
function CajeroManager({ max }: { max: number }) {
  const [list, setList] = useState<{ uid: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await authedFetch("/api/staff");
    const json = await res.json();
    if (res.ok) setList(json.staff || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    setErr("");
    setMsg("");
    if (!name.trim() || !email.trim() || password.length < 6) return setErr("Completa nombre, correo y contraseña (mín. 6 caracteres).");
    setBusy(true);
    const res = await authedFetch("/api/staff", { method: "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(json.error || "No se pudo crear el cajero.");
    setName("");
    setEmail("");
    setPassword("");
    setMsg("Cajero agregado.");
    load();
  }

  async function remove(uid: string, n: string) {
    if (!confirm(`¿Quitar al cajero ${n}? Ya no podrá iniciar sesión.`)) return;
    const res = await authedFetch("/api/staff", { method: "DELETE", body: JSON.stringify({ uid }) });
    if (res.ok) load();
  }

  if (max <= 0) {
    return (
      <div className="card mt">
        <h3 style={{ fontSize: 18, marginTop: 0 }}>Cajeros</h3>
        <p className="muted" style={{ marginTop: 0 }}>Cajeros que solo pueden sumar sellos, sin acceso al resto de tu información.</p>
        <div
          style={{
            background: "var(--bg-soft)",
            border: "2px dashed var(--border)",
            borderRadius: 12,
            padding: "16px 18px",
            color: "var(--text-secondary)",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          🔒 Mejora al plan Negocio para agregar cajeros.
        </div>
      </div>
    );
  }

  const full = list.length >= max;
  return (
    <div className="card mt">
      <h3 style={{ fontSize: 18, marginTop: 0 }}>
        Cajeros ({list.length}/{max})
      </h3>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Un cajero inicia sesión con su correo y solo puede sumar sellos — no ve tus clientes, no edita tarjetas ni envía mensajes.
      </p>
      {err && <div className="error-box">{err}</div>}
      {msg && <div className="success-box">{msg}</div>}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : list.length === 0 ? (
        <p className="muted">Aún no tienes cajeros.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((s) => (
            <li key={s.uid} className="cust-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{s.email}</div>
              </div>
              <button className="btn btn-sm" style={{ width: "auto", background: "#fdecea", color: "#c62828" }} onClick={() => remove(s.uid, s.name)}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Alcanzaste el máximo de {max} cajeros.</p>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div className="field">
            <label>Nombre del cajero</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María" />
          </div>
          <div className="field">
            <label>Correo</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cajero@correo.com" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <button className="btn btn-primary" onClick={add} disabled={busy}>
            {busy ? "Agregando…" : "Agregar cajero"}
          </button>
        </div>
      )}
    </div>
  );
}
