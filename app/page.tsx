import Link from "next/link";
import { Fragment } from "react";
import { Smartphone, Wallet, QrCode, Stamp, Bell, Palette, Megaphone, Repeat, TrendingUp, Heart, UserPlus, Hand, Check, X, ArrowRight } from "lucide-react";
import { CardPreview } from "@/components/CardPreview";
import { WhatsAppButton } from "@/components/WhatsAppButton";

// Why a business needs this (the persuasion: retention → sales).
const WHY = [
  { Icon: Repeat, acc: "acc-blue", title: "Vuelven más seguido", desc: "La tarjeta de sellos les da un motivo para volver a ti, no a la competencia de al lado." },
  { Icon: TrendingUp, acc: "acc-green", title: "Más ventas por casero", desc: "Retener cuesta mucho menos que conseguir caseros nuevos — y los caseros fieles gastan más." },
  { Icon: Heart, acc: "acc-orange", title: "Una relación que dura", desc: "Cada visita suma. Conviertes una compra suelta en un casero que vuelve y te recomienda." },
];

const FEATURES = [
  { Icon: Smartphone, acc: "acc-blue", title: "No es otra app", desc: "Tus caseros no descargan nada. La tarjeta vive en el wallet que ya usan todos los días." },
  { Icon: Wallet, acc: "acc-violet", title: "Apple & Google Wallet", desc: "Funciona en iPhone y Android. Un mismo QR sirve para los dos." },
  { Icon: Stamp, acc: "acc-teal", title: "Sellos al instante", desc: "Sumas un sello con un toque y aparece en el celular del casero al momento." },
  { Icon: Bell, acc: "acc-amber", title: "Notificaciones que hacen volver", desc: "El casero recibe un aviso con cada sello y al inscribirse. Le recuerdas tu negocio, sin costo." },
  { Icon: Megaphone, acc: "acc-orange", title: "Promociones a tus caseros", desc: "Envía promos, recordatorios o avisos a todos desde tu panel (planes de pago). Llena tu local en días lentos." },
  { Icon: Palette, acc: "acc-green", title: "Con tu marca y tus íconos", desc: "Tu logo, tus colores y hasta el ícono del sello (☕ 🍕 ✂️). Se ve como tu negocio, no como una app genérica." },
];

const STEPS = [
  { Icon: UserPlus, acc: "acc-blue", n: "1", title: "Crea tu cuenta y tu tarjeta", desc: "Elige cuántos sellos y cuál es la recompensa (ej: la 9.ª compra gratis). Toma 2 minutos." },
  { Icon: QrCode, acc: "acc-violet", n: "2", title: "Pon tu QR en el mostrador", desc: "El casero escanea, llena sus datos y guarda la tarjeta en su wallet. Sin instalar nada." },
  { Icon: Hand, acc: "acc-green", n: "3", title: "Suma sellos con un toque", desc: "Escribes el código del casero y el sello aparece al instante en su celular." },
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
    cta: "Crear cuenta gratis",
    features: [
      { t: "1 tarjeta de sellos", ok: true },
      { t: "Hasta 50 caseros activos", ok: true },
      { t: "Apple & Google Wallet", ok: true },
      { t: "Logo y colores personalizados", ok: true },
      { t: "Notificaciones de sellos y bienvenida", ok: true },
      { t: "Programa de referidos", ok: true },
      { t: "Mensajes promocionales", ok: false },
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
    cta: "Crear cuenta",
    features: [
      { t: "Todo lo del plan Gratis", ok: true },
      { t: "Caseros ilimitados", ok: true },
      { t: "Formas e íconos de sello personalizados", ok: true },
      { t: "Mensajes promocionales (3/día)", ok: true },
      { t: "Ver y exportar datos de caseros", ok: true },
      { t: "Analíticas avanzadas", ok: true },
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
    cta: "Crear cuenta",
    features: [
      { t: "Todo lo del plan Café", ok: true },
      { t: "3 tarjetas / programas", ok: true },
      { t: "Mensajes promocionales (6/día)", ok: true },
      { t: "Mensajes por segmento de caseros", ok: true },
      { t: 'Sin marca "SoyCasero"', ok: true },
      { t: "Hasta 5 cajeros", ok: true },
    ],
  },
];

const FAQS = [
  { q: "¿Mis caseros necesitan descargar una app?", a: "No. La tarjeta se guarda directamente en Apple Wallet o Google Wallet, que ya tienen en su celular." },
  { q: "¿Funciona en iPhone y Android?", a: "Sí, en ambos. Un mismo QR sirve para los dos sistemas." },
  { q: "¿Cómo sumo un sello?", a: "Escribes el código del casero en tu panel y el sello aparece al instante en su celular, sin que tengan que hacer nada." },
  { q: "¿Puedo enviar promociones a mis caseros?", a: "Sí. Con los planes de pago envías notificaciones de promociones, recordatorios o avisos a todos tus caseros desde tu panel, con un límite diario para no saturar." },
  { q: "¿Puedo personalizar la tarjeta?", a: "Sí. Eliges tu logo, tus colores y la forma o el ícono del sello (café, pizza, tijeras y más). Los íconos están disponibles en los planes de pago." },
  { q: "¿Necesito un lector o equipo especial?", a: "No. Solo tu celular o computadora con internet. Pones el QR en el mostrador y listo." },
  { q: "¿Cuánto cuesta?", a: "Hay un plan gratis para siempre. Los planes de pago arrancan en Bs 99/mes, sin contratos." },
];

export default function Home() {
  return (
    <main>
      {/* HERO */}
      <section style={{ background: "linear-gradient(135deg, #e53935, #c62828)", color: "#fff", padding: "22px 20px 64px" }}>
        <nav className="nav">
          <div className="nav-links">
            <a className="nav-anchor" href="#why">
              Beneficios
            </a>
            <a className="nav-anchor" href="#features">
              Funciones
            </a>
            <a className="nav-anchor" href="#pricing">
              Precios
            </a>
            <Link className="nav-anchor" href="/ejemplo">
              Ver ejemplo
            </Link>
            <a className="nav-anchor" href="#faq">
              Preguntas
            </a>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SoyCasero" style={{ height: 80, marginBottom: 22, filter: "brightness(0) invert(1)" }} />
            <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.12 }}>Tus caseros vuelven más. Tú vendes más.</h1>
            <p style={{ fontSize: 18, opacity: 0.95, margin: "0 0 24px", maxWidth: 520, lineHeight: 1.55 }}>
              La tarjeta de sellos digital que premia a tus caseros y los hace volver. <strong style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>No es otra app que descargar</strong> — la guardan en
              Apple&nbsp;Wallet o Google&nbsp;Wallet escaneando un QR. Tú sumas sellos con un toque.
            </p>
            <div className="cta-row">
              <Link href="/signup" className="btn-hero-white">
                Crear mi cuenta gratis
              </Link>
              <Link href="/login" className="btn-hero-outline">
                Ya tengo cuenta
              </Link>
            </div>
            <p style={{ fontSize: 14, opacity: 0.9, margin: "14px 0 0" }}>
              Gratis para empezar · Sin tarjeta de crédito ·{" "}
              <Link href="/ejemplo" style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                Ver un ejemplo
              </Link>
            </p>
            <div className="wallet-badges" style={{ marginTop: 22 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com"}/apple-wallet.png?v=2`} alt="Añadir a Apple Wallet" style={{ height: 50, width: "auto", maxWidth: 200 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com"}/goole-wallet.svg?v=2`} alt="Añadir a Google Wallet" style={{ height: 50, width: "auto", maxWidth: 200 }} />
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
                      stampShape="coffee"
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

      {/* WHY — the sales/retention pitch */}
      <section style={{ background: "var(--bg-soft)" }} id="why">
        <div className="landing-section">
          <h2 className="section-title">Por qué tu negocio lo necesita</h2>
          <p className="section-sub">Conseguir un casero nuevo es caro. Hacer que el que ya tienes vuelva es lo que hace crecer tu negocio.</p>
          <div className="grid-3" style={{ marginTop: 38 }}>
            {WHY.map((w) => {
              const Icon = w.Icon;
              return (
                <div key={w.title} className={`card lift feature-card ${w.acc}`}>
                  <span className="icon-badge">
                    <Icon size={24} strokeWidth={2.2} />
                  </span>
                  <h3 style={{ fontSize: 18, margin: "14px 0 6px" }}>{w.title}</h3>
                  <p className="feat-text">{w.desc}</p>
                </div>
              );
            })}
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
            Empieza gratis y mejora cuando crezcas. Sin contratos, cancela cuando quieras.
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
                <Link href="/signup" className="btn btn-primary" style={{ marginTop: "auto", textAlign: "center" }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="center" style={{ marginTop: 18, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            El plan Gratis incluye 1 tarjeta y hasta 50 caseros activos, con logo y colores personalizados y notificaciones de sellos.
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

      {/* FINAL CTA */}
      <section style={{ background: "linear-gradient(135deg, #e53935, #c62828)", color: "#fff", padding: "56px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px" }}>Empieza hoy. Gratis.</h2>
        <p style={{ opacity: 0.95, margin: "0 0 22px" }}>Crea la tarjeta de tu negocio en minutos y haz que tus caseros vuelvan.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/signup" className="btn-hero-white">
            Crear mi cuenta gratis
          </Link>
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
          {" · "}
          <a href="/privacy-policy" style={{ color: "var(--text-secondary)" }}>
            Política de Privacidad
          </a>
        </p>
      </footer>

      <WhatsAppButton />
    </main>
  );
}
