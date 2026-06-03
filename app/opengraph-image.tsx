import { ImageResponse } from "next/og";

export const alt = "SoyCasero — Tarjeta de sellos digital para tu negocio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card, shown when soycasero.com is shared (WhatsApp, etc.).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #e53935, #c62828)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 1, opacity: 0.95 }}>SoyCasero</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 980 }}>
          Tus caseros vuelven más. Tú vendes más.
        </div>
        <div style={{ fontSize: 34, marginTop: 28, opacity: 0.92, maxWidth: 900 }}>
          Tarjeta de sellos digital en Apple Wallet y Google Wallet. Sin apps que descargar.
        </div>
      </div>
    ),
    { ...size }
  );
}
