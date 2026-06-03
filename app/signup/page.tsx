"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { authErrorMessage } from "@/lib/authErrors";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!businessName.trim()) return setError("Ingresa el nombre de tu negocio.");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(getClientAuth(), email.trim(), password);
      const res = await authedFetch("/api/business/setup", {
        method: "POST",
        body: JSON.stringify({ businessName: businessName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el negocio.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(code ? authErrorMessage(code) : err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ marginBottom: 24 }} />
      </Link>
      <h1 style={{ fontSize: 26 }}>Crea tu cuenta</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Crea la tarjeta de sellos de tu negocio en minutos.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Nombre del negocio</label>
          <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Café Central" />
        </div>
        <div className="field">
          <label>Correo electrónico</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
        </div>
        <button className="btn btn-primary mt" type="submit" disabled={loading}>
          {loading ? "Creando…" : "Crear mi cuenta"}
        </button>
      </form>

      <p className="muted center mt">
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
