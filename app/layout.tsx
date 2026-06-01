import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoyCasero — Tarjeta de sellos digital",
  description:
    "Programa de lealtad digital en Apple Wallet y Google Wallet. Sin apps que descargar. Hecho para negocios de Bolivia.",
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes like cz-shortcut-listen on <body>, causing a false mismatch. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
