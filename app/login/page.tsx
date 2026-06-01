"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authErrorMessage } from "@/lib/authErrors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(code ? authErrorMessage(code) : "Error");
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="SoyCasero" className="brand-logo" style={{ marginBottom: 24 }} />
      </Link>
      <h1 style={{ fontSize: 26 }}>Inicia sesión</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Entra para gestionar tu tarjeta y sumar sellos.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Correo electrónico</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary mt" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="muted center mt">
        ¿No tienes cuenta? <Link href="/signup">Crear cuenta</Link>
      </p>
    </div>
  );
}
