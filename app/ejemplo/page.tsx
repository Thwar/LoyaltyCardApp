import type { Metadata } from "next";
import Link from "next/link";
import { TiltCard } from "@/components/TiltCard";

export const metadata: Metadata = {
  title: "Ejemplo — SoyCasero",
  description: "Así se ve la tarjeta de sellos de un negocio en el celular de sus clientes.",
};

export default function EjemploPage() {
  return (
    <main className="container" style={{ paddingTop: 26, paddingBottom: 64 }}>
      <Link href="/" className="btn btn-sm btn-ghost" style={{ width: "auto" }}>
        ← Volver
      </Link>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Así se ve para tus clientes</h1>
        <p className="muted" style={{ maxWidth: 460, margin: "0 auto 26px", lineHeight: 1.5 }}>
          Esta es la tarjeta que tus clientes guardan en su celular. Coleccionan sellos y ganan tu recompensa — sin descargar ninguna app.
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
        <p className="muted center" style={{ fontSize: 13, marginTop: 12 }}>
          Mueve la tarjeta — se guarda en Apple Wallet o Google Wallet.
        </p>
      </div>

      <div style={{ maxWidth: 460, margin: "34px auto 0", textAlign: "center" }}>
        <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          <strong>1.</strong> El cliente escanea tu QR &nbsp;·&nbsp; <strong>2.</strong> Guarda la tarjeta en su wallet &nbsp;·&nbsp;{" "}
          <strong>3.</strong> Tú sumas sellos con un toque y le llega una notificación.
        </p>
        <Link href="/signup" className="btn btn-primary mt" style={{ display: "inline-block", width: "auto", marginTop: 22 }}>
          Crear mi cuenta gratis
        </Link>
      </div>
    </main>
  );
}
