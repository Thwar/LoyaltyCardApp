"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TiltCard } from "@/components/TiltCard";
import { PageLoader } from "@/components/PageLoader";
import { APPLE_WALLET_BADGE, GOOGLE_WALLET_BADGE } from "@/lib/walletBadges";
import type { StampShape } from "@/lib/types";

interface PublicCard {
  id: string;
  businessName: string;
  totalSlots: number;
  rewardDescription: string;
  cardColor: string;
  textColor?: string;
  stampShape?: StampShape;
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
  const [consent, setConsent] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [refId, setRefId] = useState("");
  const [refCopied, setRefCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if (typeof window !== "undefined") setRefId(new URLSearchParams(window.location.search).get("ref") || "");
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
      body: JSON.stringify({ loyaltyCardId: cardId, name: name.trim(), email: email.trim(), phone: phone.trim(), marketingConsent: consent, ref: refId }),
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
    const base = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const refLink = `${base}/join/${cardId}?ref=${result.customerCardId}`;
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
          currentStamps={1}
          rewardDescription={card.rewardDescription}
          cardColor={card.cardColor}
          textColor={card.textColor}
          stampShape={card.stampShape}
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
                    <img src={APPLE_WALLET_BADGE} alt="Añadir a Apple Wallet" style={{ height: 52, width: "auto" }} />
                  </a>
                </>
              )}
              {showGoogle && (
                <a href={result.saveUrl!} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={GOOGLE_WALLET_BADGE} alt="Añadir a Google Wallet" style={{ height: 52, width: "auto" }} />
                </a>
              )}
            </div>
          );
        })()}

        <div className="card mt center">
          <p style={{ fontWeight: 700, margin: "0 0 4px" }}>🎁 Invita y gana un sello</p>
          <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
            Comparte tu link. Cuando un amigo se una a {card.businessName}, ¡ganas un sello!
          </p>
          <div className="row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              className="btn btn-primary"
              style={{ width: "auto", display: "inline-block" }}
              href={`https://wa.me/?text=${encodeURIComponent(`¡Únete a la tarjeta de ${card.businessName} y juntemos sellos! ${refLink}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Compartir por WhatsApp
            </a>
            <button
              className="btn btn-outline"
              style={{ width: "auto" }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(refLink);
                  setRefCopied(true);
                  setTimeout(() => setRefCopied(false), 1500);
                } catch {}
              }}
            >
              {refCopied ? "¡Copiado!" : "Copiar link"}
            </button>
          </div>
        </div>
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
        currentStamps={1}
        rewardDescription={card.rewardDescription}
        cardColor={card.cardColor}
        textColor={card.textColor}
        stampShape={card.stampShape}
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
        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer", margin: "4px 0" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flex: "0 0 auto" }}
          />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
            Acepto recibir promociones y novedades de {card.businessName} por correo o WhatsApp.
          </span>
        </label>
        <button className="btn btn-primary mt" type="submit" disabled={submitting}>
          {submitting ? "Creando tu tarjeta…" : "Crear mi tarjeta"}
        </button>
      </form>
    </div>
  );
}
