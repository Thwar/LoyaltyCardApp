import type { Metadata } from "next";
import Link from "next/link";
import { TiltCard } from "@/components/TiltCard";
import { QrCode } from "@/components/QrCode";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Ejemplo — SoyCasero",
  description: "Prueba una tarjeta de sellos real: escanea, añádela a tu wallet y mira cómo la viven tus clientes.",
};

const DEMO_CARD_ID = "demo-pizza-ejemplo";

const STEPS = [
  "📲 El cliente escanea tu QR.",
  "👛 Guarda la tarjeta en su Apple Wallet o Google Wallet.",
  "🔔 Tú sumas sellos con un toque y le llega una notificación.",
  "🎁 El cliente vuelve hasta completar su tarjeta y reclamar su recompensa.",
];

export default function EjemploPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  const joinUrl = `${base}/join/${DEMO_CARD_ID}`;

  return (
    <main className="container" style={{ maxWidth: 920, padding: "26px 20px 64px" }}>
      <div className="row spread" style={{ alignItems: "center", marginBottom: 6 }}>
        <Link href="/" aria-label="Inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SoyCasero" className="brand-logo" style={{ height: 38 }} />
        </Link>
        <Link href="/" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
          ← Volver
        </Link>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Pruébalo tú mismo</h1>
        <p className="muted" style={{ maxWidth: 540, margin: "0 auto", lineHeight: 1.5 }}>
          Esta es una tarjeta de sellos <strong>real</strong>. Añádela a tu Apple Wallet o Google Wallet y vive lo que verán tus clientes — sin descargar
          ninguna app.
        </p>
      </div>

      {/* Card + enroll side by side on desktop, stacked on mobile (flex-wrap) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 36, justifyContent: "center", alignItems: "center", maxWidth: 860, margin: "30px auto 0" }}>
        <div style={{ flex: "1 1 320px", maxWidth: 380 }}>
          <TiltCard
            businessName="Pizzería Don Luis"
            totalSlots={8}
            currentStamps={5}
            rewardDescription="Tu 8.ª pizza, gratis 🍕"
            cardColor="#c1121f"
            textColor="#FFFFFF"
            stampShape="pizza"
            code="142"
            lastVisit="Hoy"
            logoUrl="/homepage/pizza.png"
            showBarcode
          />
        </div>

        <div style={{ flex: "1 1 260px", maxWidth: 320, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, margin: "0 0 14px" }}>Añádela a tu wallet</h2>
          <Link href={`/join/${DEMO_CARD_ID}`} className="btn btn-primary" style={{ display: "inline-block", width: "auto" }}>
            Unirme y añadir a mi wallet
          </Link>
          <p className="muted" style={{ fontSize: 13, margin: "16px 0 10px" }}>o escanea con tu celular:</p>
          <div className="center">
            <QrCode value={joinUrl} size={168} />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ maxWidth: 520, margin: "44px auto 0" }}>
        <h2 style={{ fontSize: 21, textAlign: "center", margin: "0 0 22px" }}>Cómo funciona</h2>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {STEPS.map((step, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  flex: "0 0 auto",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 17,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 18, lineHeight: 1.4 }}>{step}</span>
            </li>
          ))}
        </ol>
        <div style={{ textAlign: "center" }}>
          <Link href="/signup" className="btn btn-outline" style={{ display: "inline-block", width: "auto", marginTop: 28 }}>
            ¿Tienes un negocio? Crear mi cuenta gratis
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
