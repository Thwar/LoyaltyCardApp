import Link from "next/link";
import { Fragment } from "react";
import { Smartphone, Wallet, QrCode, Stamp, Bell, Palette, UserPlus, Hand, Check, X, ArrowRight } from "lucide-react";
import { CardPreview } from "@/components/CardPreview";

const FEATURES = [
  { Icon: Smartphone, acc: "acc-blue", title: "No es otra app", desc: "Tus clientes no descargan nada. La tarjeta vive en el wallet que ya usan todos los días." },
  { Icon: Wallet, acc: "acc-violet", title: "Apple & Google Wallet", desc: "Funciona en iPhone y Android. Un mismo QR sirve para los dos." },
  { Icon: QrCode, acc: "acc-teal", title: "Se unen con un QR", desc: "Pon el QR en tu mostrador. El cliente escanea, llena sus datos y listo." },
  { Icon: Stamp, acc: "acc-orange", title: "Sellos al instante", desc: "Sumas un sello con un toque y aparece en el celular del cliente al momento." },
  { Icon: Bell, acc: "acc-amber", title: "Siempre actualizada", desc: "Cambias el premio, los colores o los sellos y la tarjeta de todos se actualiza sola." },
  { Icon: Palette, acc: "acc-green", title: "Con tu marca", desc: "Tu logo, tus colores y tu recompensa. Se ve como tu negocio, no como una app genérica." },
];

const STEPS = [
  { Icon: UserPlus, acc: "acc-blue", n: "1", title: "Crea tu cuenta y tu tarjeta", desc: "Elige cuántos sellos y cuál es la recompensa (ej: la 9.ª compra gratis). Toma 2 minutos." },
  { Icon: QrCode, acc: "acc-violet", n: "2", title: "Pon tu QR en el mostrador", desc: "El cliente escanea, llena sus datos y guarda la tarjeta en su wallet. Sin instalar nada." },
  { Icon: Hand, acc: "acc-green", n: "3", title: "Suma sellos con un toque", desc: "Escribes el código del cliente y el sello aparece al instante en su celular." },
];

const PLANS = [
  {
    name: "Gratis",
    emoji: "⭐",
    acc: "acc-blue",
    tier: "tier-gratis",
    price: "Bs 0",
    period: "para siempre",
    highlight: false,
    cta: "Empezar gratis",
    features: [
      { t: "1 tarjeta de sellos", ok: true },
      { t: "Hasta 50 clientes activos", ok: true },
      { t: "Apple & Google Wallet", ok: true },
      { t: "Sellos y recompensas", ok: true },
      { t: "Logo personalizado", ok: false },
      { t: "Colores personalizados", ok: false },
    ],
  },
  {
    name: "Café",
    emoji: "☕",
    acc: "acc-amber",
    tier: "tier-cafe",
    price: "Bs 99",
    period: "/mes",
    highlight: true,
    badge: "Más popular",
    cta: "Probar gratis",
    features: [
      { t: "1 tarjeta de sellos", ok: true },
      { t: "Clientes ilimitados", ok: true },
      { t: "Logo y colores personalizados", ok: true },
      { t: "Notificaciones de sellos", ok: true },
      { t: "Analíticas básicas", ok: true },
      { t: "Soporte por WhatsApp", ok: true },
    ],
  },
  {
    name: "Negocio",
    emoji: "🏪",
    acc: "acc-violet",
    tier: "tier-negocio",
    price: "Bs 249",
    period: "/mes",
    highlight: false,
    cta: "Probar gratis",
    features: [
      { t: "Todo lo del plan Café", ok: true },
      { t: "3 tarjetas / programas", ok: true },
      { t: "Hasta 3 sucursales", ok: true },
      { t: "Programa de referidos", ok: true },
      { t: "Segmentación de clientes", ok: true },
      { t: "Hasta 10 cajeros", ok: true },
    ],
  },
];

const FAQS = [
  { q: "¿Mis clientes necesitan descargar una app?", a: "No. La tarjeta se guarda directamente en Apple Wallet o Google Wallet, que ya tienen en su celular." },
  { q: "¿Funciona en iPhone y Android?", a: "Sí, en ambos. Un mismo QR sirve para los dos sistemas." },
  { q: "¿Cómo sumo un sello?", a: "Escribes el código del cliente en tu panel y el sello aparece al instante en su celular, sin que tengan que hacer nada." },
  { q: "¿Necesito un lector o equipo especial?", a: "No. Solo tu celular o computadora con internet. Pones el QR en el mostrador y listo." },
  { q: "¿Cuánto cuesta?", a: "Hay un plan gratis para empezar. Los planes pagos arrancan en Bs 99/mes (precios tentativos)." },
  { q: "¿Cuándo estará disponible?", a: "Estamos puliendo los últimos detalles. Lanzamiento en 2026." },
];

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section style={{ background: "linear-gradient(135deg, #e53935, #c62828)", color: "#fff", padding: "22px 20px 64px" }}>
        <nav className="nav">
          <div className="nav-links">
            <a className="nav-anchor" href="#features">
              Funciones
            </a>
            <a className="nav-anchor" href="#pricing">
              Precios
            </a>
            <a className="nav-anchor" href="#faq">
              Preguntas
            </a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SoyCasero" style={{ height: 80, marginBottom: 22, filter: "brightness(0) invert(1)" }} />
            <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.12 }}>La tarjeta de sellos de tu negocio, en el celular de tus clientes.</h1>
            <p style={{ fontSize: 18, opacity: 0.95, margin: "0 0 24px", maxWidth: 520, lineHeight: 1.55 }}>
              <strong style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>No es otra app que descargar.</strong> Tus clientes escanean un QR y guardan su tarjeta en Apple&nbsp;Wallet o
              Google&nbsp;Wallet. Tú sumas sellos con un toque.
            </p>
            <div className="cta-row">
              <span className="btn-hero-disabled" aria-disabled="true">
                Crear mi tarjeta gratis
              </span>
              <Link href="/login" className="btn-hero-outline">
                Ya tengo cuenta
              </Link>
            </div>
            <div className="wallet-badges">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}/apple-wallet.png`} alt="Añadir a Apple Wallet" style={{ height: 50, width: "auto", maxWidth: 200 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${process.env.NEXT_PUBLIC_BASE_URL || ""}/goole-wallet.svg`} alt="Añadir a Google Wallet" style={{ height: 50, width: "auto", maxWidth: 200 }} />
            </div>
            <div style={{ marginTop: 22 }}>
              <span className="soon-pill" style={{ marginBottom: 0 }}>
                🚀 Próximamente · 2026
              </span>
            </div>
          </div>

          <div className="hero-right">
            <div className="phone-frame">
              <div className="phone-screen">
                <div className="phone-topbar">
                  <span className="phone-time">9:41</span>
                  <span className="phone-island" />
                  <span className="phone-batt">
                    <i />
                  </span>
                </div>
                <div className="wallet-stack">
                  <div className="peek" style={{ background: "#e53935" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="peek-logo" src="/homepage/pizza.png" alt="Pizzería Don Luis" />
                    <span className="peek-meta">
                      <span className="peek-label">SELLOS</span>
                      <span className="peek-count">7/10</span>
                    </span>
                  </div>
                  <div className="peek" style={{ background: "#7c3aed" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="peek-logo" src="/homepage/barber.png" alt="Barbería Cuts" />
                    <span className="peek-meta">
                      <span className="peek-label">SELLOS</span>
                      <span className="peek-count">3/8</span>
                    </span>
                  </div>
                  <div className="peek" style={{ background: "#0ea5e9" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="peek-logo" src="/homepage/pacu.png" alt="Don Pacú" />
                    <span className="peek-meta">
                      <span className="peek-label">SELLOS</span>
                      <span className="peek-count">5/9</span>
                    </span>
                  </div>
                  <div className="wallet-front">
                    <CardPreview
                      businessName="Café Aroma"
                      totalSlots={9}
                      currentStamps={4}
                      rewardDescription="Tu 9.ª compra gratis"
                      cardColor="#0d9488"
                      textColor="#FFFFFF"
                      code="248"
                      lastVisit="Hoy"
                      logoUrl="/homepage/cafe.png"
                      showBarcode
                    />
                  </div>
                </div>
                <div className="phone-home" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section" id="features">
        <h2 className="section-title">Todo lo que necesitas para fidelizar</h2>
        <p className="section-sub">Una plataforma simple, sin apps que descargar, hecha para negocios de Bolivia.</p>
        <div className="grid-3" style={{ marginTop: 38 }}>
          {FEATURES.map((f) => {
            const Icon = f.Icon;
            return (
              <div key={f.title} className={`card lift feature-card ${f.acc}`}>
                <span className="icon-badge">
                  <Icon size={24} strokeWidth={2.2} />
                </span>
                <h3 style={{ fontSize: 18, margin: "14px 0 6px" }}>{f.title}</h3>
                <p className="feat-text">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: "var(--bg-soft)" }}>
        <div className="landing-section">
          <h2 className="section-title">Listo en 3 pasos</h2>
          <p className="section-sub">Del registro al primer sello en minutos.</p>
          <div className="steps-flow">
            {STEPS.map((s, i) => {
              const Icon = s.Icon;
              return (
                <Fragment key={s.n}>
                  <div className={`card lift step-card ${s.acc}`}>
                    <div className="step-head">
                      <span className="step-num">{s.n}</span>
                      <span className="icon-badge">
                        <Icon size={22} strokeWidth={2.2} />
                      </span>
                    </div>
                    <h3 style={{ fontSize: 18, margin: "14px 0 6px" }}>{s.title}</h3>
                    <p className="feat-text">{s.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className="step-arrow" aria-hidden="true">
                      <ArrowRight size={26} strokeWidth={2.5} />
                    </span>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ background: "#1f2937" }} id="pricing">
        <div className="landing-section">
          <h2 className="section-title" style={{ color: "#fff" }}>
            Precios simples, en bolivianos
          </h2>
          <p className="section-sub" style={{ color: "rgba(255,255,255,0.72)" }}>
            Empieza gratis y mejora cuando crezcas. Precios tentativos, sin contratos.
          </p>
          <div className="grid-pricing" style={{ marginTop: 40 }}>
            {PLANS.map((p) => (
              <div key={p.name} className={`card lift pricing-card ${p.acc} ${p.tier}${p.highlight ? " pricing-pop" : ""}`}>
                {p.badge && <span className="pricing-badge">{p.badge}</span>}
                <h3 style={{ fontSize: 20, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true" style={{ fontSize: 24, lineHeight: 1 }}>
                    {p.emoji}
                  </span>
                  {p.name}
                </h3>
                <div style={{ margin: "0 0 4px" }}>
                  <span style={{ fontSize: 34, fontWeight: 800 }}>{p.price}</span>
                  <span className="muted"> {p.period}</span>
                </div>
                <ul className="plan-list">
                  {p.features.map((feat, i) => (
                    <li key={i} className={feat.ok ? "" : "plan-off"}>
                      {feat.ok ? <Check size={18} /> : <X size={18} />}
                      <span>{feat.t}</span>
                    </li>
                  ))}
                </ul>
                <span className="btn btn-disabled" style={{ marginTop: "auto" }} aria-disabled="true">
                  {p.cta}
                </span>
              </div>
            ))}
          </div>
          <p className="center" style={{ marginTop: 18, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            El plan Gratis incluye 1 tarjeta y hasta 50 clientes activos, con colores y logo por defecto.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="landing-section" id="faq">
        <h2 className="section-title">Preguntas frecuentes</h2>
        <div className="faq-wrap">
          {FAQS.map((f, i) => (
            <details key={i} className="faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* COMING SOON CTA */}
      <section style={{ background: "linear-gradient(135deg, #e53935, #c62828)", color: "#fff", padding: "56px 20px", textAlign: "center" }}>
        <span className="soon-pill">🚀 Próximamente · 2026</span>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "10px 0 10px" }}>Estamos por lanzar</h2>
        <p style={{ opacity: 0.95, margin: "0 0 22px" }}>Pronto vas a poder crear la tarjeta de tu negocio en minutos.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <span className="btn-hero-disabled" aria-disabled="true">
            Crear mi tarjeta gratis
          </span>
          <Link href="/login" className="btn-hero-outline">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <footer style={{ background: "var(--bg-soft)", padding: "26px 20px", textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          © 2026 SoyCasero · Recompensa tu fidelidad
        </p>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          <a href="mailto:admin@soycasero.com" style={{ color: "var(--text-secondary)" }}>
            admin@soycasero.com
          </a>
        </p>
      </footer>
    </main>
  );
}
