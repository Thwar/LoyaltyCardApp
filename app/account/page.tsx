"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { PageLoader } from "@/components/PageLoader";
import { SiteFooter } from "@/components/SiteFooter";

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

export default function AccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [hasBusiness, setHasBusiness] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
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
          setDescription(json.business.description || "");
          setLogo(json.business.logoPng ? `data:image/png;base64,${json.business.logoPng}` : null);
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
