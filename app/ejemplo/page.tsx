import type { Metadata } from "next";
import Link from "next/link";
import { TiltCard } from "@/components/TiltCard";
import { QrCode } from "@/components/QrCode";

export const metadata: Metadata = {
  title: "Ejemplo — SoyCasero",
  description: "Prueba una tarjeta de sellos real: escanea, añádela a tu wallet y mira cómo la viven tus clientes.",
};

const DEMO_CARD_ID = "demo-pizza-ejemplo";

export default function EjemploPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  const joinUrl = `${base}/join/${DEMO_CARD_ID}`;

  return (
    <main className="container" style={{ paddingTop: 26, paddingBottom: 64 }}>
      <Link href="/" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
        ← Volver
      </Link>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Pruébalo tú mismo</h1>
        <p className="muted" style={{ maxWidth: 470, margin: "0 auto 26px", lineHeight: 1.5 }}>
          Esta es una tarjeta de sellos <strong>real</strong>. Añádela a tu Apple Wallet o Google Wallet y vive lo que verán tus clientes — sin descargar
          ninguna app.
        </p>
      </div>

      <div style={{ maxWidth: 380, margin: "0 auto" }}>
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

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <Link href={`/join/${DEMO_CARD_ID}`} className="btn btn-primary" style={{ display: "inline-block", width: "auto" }}>
          Unirme y añadir a mi wallet
        </Link>
        <p className="muted" style={{ fontSize: 13, margin: "16px 0 8px" }}>o escanea con tu celular:</p>
        <div className="center">
          <QrCode value={joinUrl} size={168} />
        </div>
      </div>

      <div style={{ maxWidth: 470, margin: "34px auto 0", textAlign: "center" }}>
        <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          <strong>1.</strong> El cliente escanea tu QR &nbsp;·&nbsp; <strong>2.</strong> Guarda la tarjeta en su wallet &nbsp;·&nbsp;{" "}
          <strong>3.</strong> Tú sumas sellos con un toque y le llega una notificación.
        </p>
        <Link href="/signup" className="btn btn-outline" style={{ display: "inline-block", width: "auto", marginTop: 22 }}>
          ¿Tienes un negocio? Crear mi cuenta gratis
        </Link>
      </div>
    </main>
  );
}
