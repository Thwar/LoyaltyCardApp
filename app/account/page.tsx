"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";

export default function AccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [hasBusiness, setHasBusiness] = useState(false);
  const [savingName, setSavingName] = useState(false);
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
        if (res.ok && json.business) {
          setHasBusiness(true);
          setName(json.business.name || "");
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

      {err && <div className="error-box">{err}</div>}
      {msg && <div className="success-box">{msg}</div>}

      <div className="card mt">
        <div className="field">
          <label>Correo</label>
          <input className="input" value={email} readOnly style={{ opacity: 0.7 }} />
        </div>
        <div className="field">
          <label>Nombre del negocio</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Café Central" />
        </div>
        <button className="btn btn-primary" onClick={saveName} disabled={savingName}>
          {savingName ? "Guardando…" : hasBusiness ? "Guardar cambios" : "Crear negocio"}
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

      <SiteFooter />
    </div>
  );
}
