import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const TITLE = "SoyCasero — Tarjeta de sellos digital para tu negocio";
const DESC =
  "Haz que tus clientes vuelvan y vende más. Tarjeta de sellos digital en Apple Wallet y Google Wallet — sin apps que descargar. Hecho para negocios de Bolivia.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.soycasero.com"),
  title: TITLE,
  description: DESC,
  icons: { icon: "/favicon.png" },
  alternates: { canonical: "https://www.soycasero.com" },
  openGraph: {
    type: "website",
    locale: "es_BO",
    url: "https://www.soycasero.com",
    siteName: "SoyCasero",
    title: TITLE,
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes like cz-shortcut-listen on <body>, causing a false mismatch. */}
      <body suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
