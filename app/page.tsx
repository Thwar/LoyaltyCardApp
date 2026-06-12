import Link from "next/link";
import { Fragment } from "react";
import { Wallet, QrCode, Bell, Megaphone, Repeat, TrendingUp, Heart, UserPlus, Hand, Eye, Check, X, ArrowRight } from "lucide-react";
import { CardPreview } from "@/components/CardPreview";
import { WhatsAppButton } from "@/components/WhatsAppButton";

// Why a business needs this (the persuasion: retention → sales).
const WHY = [
  { Icon: Repeat, acc: "acc-blue", title: "Más visitas", desc: "Premia la fidelidad y dale a tu casero una razón para volver a ti, no a la competencia de al lado." },
  { Icon: TrendingUp, acc: "acc-green", title: "Más ventas", desc: "Los caseros frecuentes compran más y con más confianza — y retenerlos cuesta mucho menos que conseguir clientes nuevos." },
  { Icon: Heart, acc: "acc-orange", title: "Más recordación", desc: "Mantén tu negocio presente entre visita y visita, directo en su celular." },
];

// Four consolidated benefits (details live in pricing + FAQ, not here).
const FEATURES = [
  { Icon: Wallet, acc: "acc-blue", title: "Tarjeta de sellos digital", desc: "Vive en Apple Wallet y Google Wallet con tu logo, tus colores y tu ícono — sin que tus caseros descarguen nada." },
  { Icon: Megaphone, acc: "acc-orange", title: "Promociones que llenan tu local", desc: "Envía ofertas a todos o por segmento, y deja que tus caseros inviten a sus amigos con el programa de referidos." },
  { Icon: Bell, acc: "acc-amber", title: "Notificaciones automáticas", desc: "Cada sello, bienvenida y recompensa llega como aviso a su pantalla. Le recuerdas tu negocio sin costo." },
  { Icon: TrendingUp, acc: "acc-violet", title: "Conoce a tus caseros", desc: "Mira quién vuelve, quién se aleja y quién está por ganar su premio. Exporta tus datos cuando quieras." },
];

const STEPS = [
  { Icon: UserPlus, acc: "acc-blue", n: "1", title: "Crea tu cuenta y tu tarjeta", desc: "Elige cuántos sellos y cuál es la recompensa (ej: la 9.ª compra gratis). Toma 2 minutos." },
  { Icon: QrCode, acc: "acc-violet", n: "2", title: "Pon tu QR en el mostrador", desc: "El casero escanea, llena sus datos y guarda la tarjeta en su wallet. Sin instalar nada." },
  { Icon: Hand, acc: "acc-green", n: "3", title: "Suma sellos con un toque", desc: "Escaneas el código del casero con la cámara o lo escribes, y el sello aparece al instante en su celular." },
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
      { t: "Mensajes promocionales (3/día)", ok: true },
      { t: "Analíticas avanzadas", ok: true },
      { t: "Ver y exportar datos de caseros", ok: true },
      { t: "Formas e íconos de sello personalizados", ok: true },
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
      { t: "Tarjeta de membresía (socios VIP)", ok: true },
      { t: "Mensajes por segmento (6/día)", ok: true },
      { t: "Hasta 5 cajeros", ok: true },
      { t: 'Sin marca "SoyCasero"', ok: true },
    ],
  },
];

// Six questions max — the rest of the detail lives in pricing and the dashboard.
const FAQS = [
  { q: "¿Mis caseros necesitan descargar una app?", a: "No. La tarjeta se guarda directamente en Apple Wallet o Google Wallet, que ya tienen en su celular." },
  { q: "¿Funciona en iPhone y Android?", a: "Sí, en ambos. Un mismo QR sirve para los dos sistemas." },
  { q: "¿Necesito un lector o equipo especial?", a: "No. Solo tu celular o computadora con internet. Pones el QR en el mostrador y listo. Para sumar sellos puedes escanear el código del casero con la cámara o escribirlo." },
  { q: "¿Cuánto cuesta?", a: "Hay un plan gratis para siempre. Los planes de pago arrancan en Bs 99/mes, sin contratos." },
  { q: "¿Puedo enviar promociones a mis caseros?", a: "Sí. Con los planes de pago envías promociones, recordatorios o avisos al celular de todos tus caseros, con un límite diario para no saturar. En el plan Negocio puedes enviarlos por segmento (por ejemplo, solo a quienes se alejaron). Y con el programa de referidos —incluido en todos los planes— tus caseros invitan a sus amigos y ganan un sello." },
  { q: "¿Tienen tarjetas de membresía para gimnasios o clubes?", a: "Sí. En el plan Negocio puedes crear una tarjeta de membresía (socios VIP): identifica a tus socios, controla su vencimiento y, si quieres, sus visitas. El socio la guarda en su wallet y tu equipo registra visitas escaneando su código." },
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
            <a className="nav-anchor" href="#clientes">
              Para clientes
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
            <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.12 }}>Convierte clientes ocasionales en caseros.</h1>
            <p style={{ fontSize: 18, opacity: 0.95, margin: "0 0 24px", maxWidth: 520, lineHeight: 1.55 }}>
              Premia su fidelidad con una tarjeta de sellos digital que vive en su Apple&nbsp;Wallet o Google&nbsp;Wallet —{" "}
              <strong style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>sin que descarguen otra app</strong>. Tú sumas sellos con un toque y ellos vuelven una y otra vez.
            </p>
            <div className="cta-row">
              <Link href="/signup" className="btn-hero-white">
                Crear mi cuenta gratis
              </Link>
              <Link href="/ejemplo" className="btn-hero-outline">
                <Eye size={19} style={{ marginRight: 9 }} /> Ver un ejemplo
              </Link>
            </div>
            <p style={{ fontSize: 14, opacity: 0.9, margin: "14px 0 0" }}>
              Gratis para empezar · Sin tarjeta de crédito ·{" "}
              <Link href="/login" style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                ¿Ya tienes cuenta? Entrar
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

      {/* HOW IT WORKS — above the features: it explains the product fastest */}
      <section className="landing-section">
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
      </section>

      {/* FEATURES — four consolidated benefits */}
      <section style={{ background: "var(--bg-soft)" }} id="features">
        <div className="landing-section">
          <h2 className="section-title">Todo lo que necesitas para fidelizar</h2>
          <p className="section-sub">Sin apps que descargar, sin equipos especiales — hecho para negocios de Bolivia.</p>
          <div className="grid-4" style={{ marginTop: 38 }}>
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
        </div>
      </section>

      {/* ANALYTICS SHOWCASE */}
      <section className="landing-section">
        <div style={{ display: "flex", gap: 44, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px", minWidth: 280 }}>
            <h2 className="section-title" style={{ textAlign: "left" }}>
              Conoce a tus caseros, no solo tus ventas
            </h2>
            <p className="section-sub" style={{ textAlign: "left", margin: "12px 0 20px" }}>
              Tu panel te muestra quién vuelve, quién se aleja y quién está a un solo sello de ganar su premio —con un
              gráfico de crecimiento mes a mes. Toma decisiones con datos, no a ciegas.
            </p>
            <ul className="plan-list" style={{ marginBottom: 22 }}>
              <li>
                <Check size={18} />
                <span>Tasa de retorno, caseros activos y en riesgo</span>
              </li>
              <li>
                <Check size={18} />
                <span>Quiénes están por completar su tarjeta</span>
              </li>
              <li>
                <Check size={18} />
                <span>Crecimiento de caseros y visitas en el tiempo</span>
              </li>
              <li>
                <Check size={18} />
                <span>Exporta tus caseros a CSV cuando quieras</span>
              </li>
            </ul>
            <Link href="/signup" className="btn btn-primary" style={{ width: "auto", display: "inline-block" }}>
              Crear mi cuenta gratis
            </Link>
            <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>Analíticas avanzadas en los planes de pago.</p>
          </div>
          <div style={{ flex: "1 1 440px", minWidth: 280 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/homepage/stats.png"
              alt="Panel de analíticas de SoyCasero: caseros, tasa de retorno y gráfico de crecimiento"
              style={{ width: "100%", height: "auto", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "0 18px 44px rgba(0,0,0,0.15)" }}
            />
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS SHOWCASE — paired with the analytics block above (image left, copy right) */}
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div style={{ display: "flex", gap: 44, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", minWidth: 260, textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/homepage/notifi.jpeg"
              alt="Notificaciones de SoyCasero en el celular: nuevo sello, tarjeta completa, bienvenida y un mensaje '¡Te extrañamos!'"
              style={{ width: "100%", maxWidth: 340, height: "auto", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 18px 44px rgba(0,0,0,0.15)" }}
            />
          </div>
          <div style={{ flex: "1 1 320px", minWidth: 280 }}>
            <h2 className="section-title" style={{ textAlign: "left" }}>
              Tu negocio en su bolsillo
            </h2>
            <p className="section-sub" style={{ textAlign: "left", margin: "12px 0 20px" }}>
              Cada sello, tarjeta completa y recompensa llega como notificación al celular del casero —sin que abran nada
              y sin que tú pagues SMS.
            </p>
            <ul className="plan-list">
              <li>
                <Check size={18} />
                <span>Avisos de cada sello, bienvenida y recompensa</span>
              </li>
              <li>
                <Check size={18} />
                <span>Mensajes personalizados a tu gusto (planes de pago)</span>
              </li>
              <li>
                <Check size={18} />
                <span>Recupera caseros dormidos con un “¡Te extrañamos!”</span>
              </li>
            </ul>
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
                {/* Top 5 visible; the rest behind "ver más" so the columns scan fast. */}
                <ul className="plan-list">
                  {p.features.slice(0, 5).map((feat, i) => (
                    <li key={i} className={feat.ok ? "" : "plan-off"}>
                      {feat.ok ? <Check size={18} /> : <X size={18} />}
                      <span>{feat.t}</span>
                    </li>
                  ))}
                </ul>
                {p.features.length > 5 && (
                  <details style={{ marginBottom: 8 }}>
                    <summary className="muted" style={{ fontSize: 13, cursor: "pointer" }}>Ver todo lo incluido</summary>
                    <ul className="plan-list" style={{ marginTop: 8 }}>
                      {p.features.slice(5).map((feat, i) => (
                        <li key={i} className={feat.ok ? "" : "plan-off"}>
                          {feat.ok ? <Check size={18} /> : <X size={18} />}
                          <span>{feat.t}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
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

      {/* FOR CUSTOMERS — one slim trust strip (customers join at the business, not here) */}
      <section style={{ background: "var(--bg-soft)" }} id="clientes">
        <div className="landing-section" style={{ textAlign: "center", paddingTop: 36, paddingBottom: 36 }}>
          <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "var(--primary)", marginBottom: 8 }}>Para clientes</span>
          <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>¿Recibiste una tarjeta SoyCasero?</h2>
          <p className="muted" style={{ maxWidth: 560, margin: "0 auto 18px", lineHeight: 1.5 }}>
            No necesitas instalar nada: escaneas el QR del negocio, tu tarjeta se guarda en tu wallet y cada visita suma
            un sello hacia tu premio.
          </p>
          <Link href="/ejemplo" className="btn btn-outline" style={{ width: "auto", display: "inline-block" }}>
            Ver una tarjeta de ejemplo
          </Link>
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
