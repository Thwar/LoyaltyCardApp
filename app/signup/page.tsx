"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/clientApi";
import { authErrorMessage } from "@/lib/authErrors";
import { SiteFooter } from "@/components/SiteFooter";

const COUNTRY_CODES = [
  { code: "+591", flag: "🇧🇴" },
  { code: "+54", flag: "🇦🇷" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+56", flag: "🇨🇱" },
  { code: "+57", flag: "🇨🇴" },
  { code: "+51", flag: "🇵🇪" },
  { code: "+595", flag: "🇵🇾" },
  { code: "+598", flag: "🇺🇾" },
  { code: "+52", flag: "🇲🇽" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+1", flag: "🇺🇸" },
];

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+591");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) return setError("Ingresa tu nombre completo.");
    if (!businessName.trim()) return setError("Ingresa el nombre de tu negocio.");
    if (!phone.trim()) return setError("Ingresa tu número de celular.");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(getClientAuth(), email.trim(), password);
      const res = await authedFetch("/api/business/setup", {
        method: "POST",
        body: JSON.stringify({
          businessName: businessName.trim(),
          ownerName: fullName.trim(),
          ownerPhone: `${countryCode} ${phone.trim()}`,
        }),
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
      <div className="center">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ marginBottom: 24 }} />
        </Link>
      </div>
      <h1 style={{ fontSize: 26 }}>Crea tu cuenta</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Crea la tarjeta de sellos de tu negocio en minutos.
      </p>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Nombre completo</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: Rubén Pérez" />
        </div>
        <div className="field">
          <label>Nombre del negocio</label>
          <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Café Central" />
        </div>
        <div className="field">
          <label>Correo electrónico</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
        </div>
        <div className="field">
          <label>Celular</label>
          <div className="row" style={{ gap: 8 }}>
            <select className="input" style={{ width: "auto", flex: "0 0 auto" }} value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="70123456" />
          </div>
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

      <SiteFooter />
    </div>
  );
}
