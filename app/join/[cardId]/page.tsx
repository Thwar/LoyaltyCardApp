"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TiltCard } from "@/components/TiltCard";
import { PageLoader } from "@/components/PageLoader";

interface PublicCard {
  id: string;
  businessName: string;
  totalSlots: number;
  rewardDescription: string;
  cardColor: string;
  textColor?: string;
  logoPng?: string;
}

interface EnrollResult {
  cardCode: string;
  customerCardId: string;
  saveUrl: string | null;
  walletConfigured: boolean;
  appleConfigured?: boolean;
  existing?: boolean;
  walletError?: string;
}

export default function JoinPage() {
  const params = useParams<{ cardId: string }>();
  const cardId = params?.cardId;

  const [card, setCard] = useState<PublicCard | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!cardId) return;
    fetch(`/api/card/${cardId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) setLoadErr(j.error || "Tarjeta no encontrada.");
        else setCard(j.card);
        setLoading(false);
      })
      .catch(() => {
        setLoadErr("No se pudo cargar la tarjeta.");
        setLoading(false);
      });
  }, [cardId]);

  // After a successful enrollment, best-effort auto-open the Apple Wallet pass on iOS.
  useEffect(() => {
    if (isIOS && result?.appleConfigured && result.customerCardId) {
      window.location.href = `/api/wallet/apple/pass/${result.customerCardId}`;
    }
  }, [result, isIOS]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    if (!name.trim()) return setFormErr("Tu nombre es obligatorio.");
    if (!email.trim()) return setFormErr("Tu correo electrónico es obligatorio.");
    setSubmitting(true);
    const res = await fetch("/api/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loyaltyCardId: cardId, name: name.trim(), email: email.trim(), phone: phone.trim() }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) return setFormErr(json.error || "No se pudo inscribir.");
    setResult(json);
  }

  if (loading) {
    return <PageLoader />;
  }
  if (loadErr || !card) {
    return (
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="error-box">{loadErr || "Tarjeta no encontrada."}</div>
      </div>
    );
  }

  // Success screen
  if (result) {
    // Load wallet badges from the canonical domain so they don't depend on which
    // host served this page (the apex 307-redirects to www, and a cached failure
    // on the apex can otherwise leave these broken).
    const assetBase = process.env.NEXT_PUBLIC_BASE_URL || "";
    return (
      <div className="container">
        <div className="center" style={{ marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ height: 56 }} />
        </div>
        <div className="success-box">
          {result.existing
            ? `Ya tienes una tarjeta en ${card.businessName} con este correo. ¡Aquí está!`
            : `¡Listo, ${name}! Tu tarjeta de ${card.businessName} fue creada.`}
        </div>

        <TiltCard
          businessName={card.businessName}
          totalSlots={card.totalSlots}
          currentStamps={0}
          rewardDescription={card.rewardDescription}
          cardColor={card.cardColor}
          textColor={card.textColor}
          logoUrl={card.logoPng ? `data:image/png;base64,${card.logoPng}` : undefined}
        />

        <div className="card mt center">
          <p className="muted" style={{ margin: "0 0 6px" }}>Tu código (muéstralo para sumar sellos)</p>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>{result.cardCode}</div>
        </div>

        {(() => {
          const showApple = !!result.appleConfigured && isIOS;
          const showGoogle = !!result.saveUrl;
          if (!showApple && !showGoogle) {
            return (
              <div className="warn-box mt">
                {result.walletConfigured
                  ? "No se pudo generar el pase en este momento. Guarda tu código; igual puedes sumar sellos."
                  : "Guarda tu código. El pase digital estará disponible muy pronto."}
              </div>
            );
          }
          return (
            <div className="center mt" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              {showApple && (
                <>
                  <p className="muted" style={{ margin: 0 }}>
                    Abriendo tu tarjeta… si no se abre sola, toca aquí:
                  </p>
                  <a href={`/api/wallet/apple/pass/${result.customerCardId}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${assetBase}/apple-wallet.png`} alt="Añadir a Apple Wallet" style={{ height: 52, width: "auto" }} />
                  </a>
                </>
              )}
              {showGoogle && (
                <a href={result.saveUrl!} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${assetBase}/goole-wallet.svg`} alt="Añadir a Google Wallet" style={{ height: 52, width: "auto" }} />
                </a>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  // Enrollment form
  return (
    <div className="container">
      <div className="center" style={{ marginBottom: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-rojo.png" alt="SoyCasero" className="brand-logo" style={{ height: 56 }} />
      </div>

      <TiltCard
        businessName={card.businessName}
        totalSlots={card.totalSlots}
        currentStamps={0}
        rewardDescription={card.rewardDescription}
        cardColor={card.cardColor}
        textColor={card.textColor}
        logoUrl={card.logoPng ? `data:image/png;base64,${card.logoPng}` : undefined}
      />

      <h1 style={{ fontSize: 22, marginTop: 22 }}>Únete al club de {card.businessName}</h1>
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", margin: "6px 0 10px" }}>🎁 {card.rewardDescription}</p>
      <p className="muted" style={{ marginBottom: 16 }}>
        Llena tus datos y guarda tu tarjeta en el wallet de tu celular. No necesitas instalar ninguna app.
      </p>

      {formErr && <div className="error-box">{formErr}</div>}

      <form onSubmit={submit}>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
        </div>
        <div className="field">
          <label>Correo electrónico</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Teléfono (opcional)</label>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn btn-primary mt" type="submit" disabled={submitting}>
          {submitting ? "Creando tu tarjeta…" : "Crear mi tarjeta"}
        </button>
      </form>
    </div>
  );
}
