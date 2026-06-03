"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authErrorMessage } from "@/lib/authErrors";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
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

  async function onForgotPassword() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Ingresa tu correo y toca de nuevo para restablecer la contraseña.");
      return;
    }
    try {
      await sendPasswordResetEmail(getClientAuth(), email.trim());
      setNotice("Te enviamos un correo para restablecer tu contraseña.");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      setError(code ? authErrorMessage(code) : "No se pudo enviar el correo.");
    }
  }

  return (
    <div className="container">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ marginBottom: 24 }} />
      </Link>
      <h1 style={{ fontSize: 26 }}>Inicia sesión</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Entra para gestionar tu tarjeta y sumar sellos.
      </p>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Correo electrónico</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div style={{ textAlign: "right", marginTop: 6 }}>
          <button
            type="button"
            onClick={onForgotPassword}
            style={{ background: "none", border: "none", padding: 0, color: "var(--primary)", fontSize: 13, cursor: "pointer" }}
          >
            ¿Olvidaste tu contraseña?
          </button>
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
