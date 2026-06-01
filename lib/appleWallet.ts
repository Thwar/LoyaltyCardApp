import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PKPass } from "passkit-generator";
import type { CustomerCard, LoyaltyCard } from "./types";
import { renderStampStrip } from "./stampStrip";

// Apple Wallet pass generation. Phase A: issuance only (a static .pkpass the
// customer adds to their iPhone). Live updates (PassKit web service + APNs) come
// in Phase B. Gated behind env vars, mirroring the Google Wallet helper.

export function appleConfigured(): boolean {
  return !!(
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_SIGNER_CERT &&
    process.env.APPLE_SIGNER_KEY &&
    process.env.APPLE_WWDR
  );
}

function fromBase64(v: string | undefined, label: string): Buffer {
  if (!v || !v.trim()) throw new Error(`${label} no está configurado.`);
  return Buffer.from(v.trim(), "base64");
}

// Deterministic per-pass authentication token (no DB storage needed). The
// PassKit web service verifies the "Authorization: ApplePass <token>" header
// by recomputing this from the serial number.
export function passAuthToken(serialNumber: string): string {
  const secret = process.env.APPLE_AUTH_SECRET || "";
  return crypto.createHmac("sha256", secret).update(serialNumber).digest("base64url");
}

export function verifyApplePassAuth(authHeader: string | null, serialNumber: string): boolean {
  if (!authHeader || !process.env.APPLE_AUTH_SECRET) return false;
  const m = authHeader.match(/^ApplePass\s+(.+)$/i);
  if (!m) return false;
  const provided = Buffer.from(m[1].trim());
  const expected = Buffer.from(passAuthToken(serialNumber));
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

// Apple wants colors as rgb() strings, not hex.
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgb(${r},${g},${b})`;
}

let iconBuf: Buffer | null = null;
function img(name: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "public", name));
}

function formatVisit(ts?: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export async function buildPkpass(customer: CustomerCard, card: LoyaltyCard): Promise<Buffer> {
  if (!iconBuf) iconBuf = img("icon.png");

  // Render the stamp grid as a strip image (big circles, up to 2 rows).
  const filled = Math.min(customer.currentStamps, card.totalSlots);
  const textColor = card.textColor || "#FFFFFF";
  const [strip1x, strip2x, strip3x] = await Promise.all([
    renderStampStrip(filled, card.totalSlots, textColor, 1),
    renderStampStrip(filled, card.totalSlots, textColor, 2),
    renderStampStrip(filled, card.totalSlots, textColor, 3),
  ]);

  // Optional business logo (shown top-left instead of the business name).
  const logoBuf = card.logoPng ? Buffer.from(card.logoPng, "base64") : null;

  // Only wire up live updates when we have an HTTPS base URL + an auth secret.
  // (Apple requires an https webServiceURL; localhost passes stay static.)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const updatable = !!process.env.APPLE_AUTH_SECRET && baseUrl.startsWith("https://");

  const pass = new PKPass(
    {
      // No business logo image yet → the pass shows the business name (logoText)
      // instead of the SoyCasero logo. icon.png is required by Apple (used in
      // notifications / the pass list), not shown on the pass face.
      "icon.png": iconBuf,
      "icon@2x.png": iconBuf,
      ...(logoBuf ? { "logo.png": logoBuf, "logo@2x.png": logoBuf } : {}),
      "strip.png": strip1x,
      "strip@2x.png": strip2x,
      "strip@3x.png": strip3x,
    },
    {
      wwdr: fromBase64(process.env.APPLE_WWDR, "APPLE_WWDR"),
      signerCert: fromBase64(process.env.APPLE_SIGNER_CERT, "APPLE_SIGNER_CERT"),
      signerKey: fromBase64(process.env.APPLE_SIGNER_KEY, "APPLE_SIGNER_KEY"),
      signerKeyPassphrase: process.env.APPLE_KEY_PASSPHRASE || undefined,
    },
    {
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: process.env.APPLE_TEAM_ID!,
      organizationName: "SoyCasero",
      description: `Tarjeta de ${card.businessName}`,
      serialNumber: customer.id,
      // Group passes by business so different businesses don't stack together.
      // (Apple documents this key for event/boarding passes; for store cards it
      // may be ignored — see notes. Harmless if so.)
      groupingIdentifier: card.businessId,
      // When the program is deactivated, Apple greys the pass out as void.
      voided: card.isActive === false,
      ...(logoBuf ? {} : { logoText: card.businessName }),
      foregroundColor: hexToRgb(card.textColor || "#FFFFFF"),
      labelColor: hexToRgb(card.textColor || "#FFFFFF"),
      backgroundColor: hexToRgb(card.cardColor || "#E53935"),
      ...(updatable
        ? { webServiceURL: `${baseUrl}/api/wallet/apple`, authenticationToken: passAuthToken(customer.id) }
        : {}),
    }
  );

  pass.type = "storeCard";
  pass.headerFields.push({
    key: "count",
    label: "SELLOS",
    value: `${Math.min(customer.currentStamps, card.totalSlots)}/${card.totalSlots}`,
  });
  pass.secondaryFields.push({ key: "lastVisit", label: "ÚLTIMA VISITA", value: formatVisit(customer.lastStampDate) });
  pass.auxiliaryFields.push({ key: "code", label: "TU CÓDIGO", value: customer.cardCode });
  // Pass details (the back of the pass).
  pass.backFields.push({ key: "reward", label: "Recompensa", value: card.rewardDescription });
  pass.backFields.push({ key: "status", label: "Estado", value: card.isActive === false ? "Inactivo" : "Activo" });
  if (card.isActive === false) {
    // Apple's own "expired" banner on a voided pass is system text we can't
    // reword, so we show the Spanish message here where we control it.
    pass.backFields.push({ key: "ended", label: "Aviso", value: "Esta promoción ha terminado." });
  }
  pass.backFields.push({ key: "redeemed", label: "Recompensas canjeadas", value: String(customer.rewardsRedeemed || 0) });
  pass.backFields.push({ key: "lastStamp", label: "Último sello", value: formatVisit(customer.lastStampDate) });
  pass.backFields.push({ key: "created", label: "Fecha de creación", value: formatVisit(customer.createdAt) });
  pass.backFields.push({ key: "business", label: "Negocio", value: card.businessName });
  pass.backFields.push({ key: "passId", label: "Identificador", value: customer.id });
  pass.backFields.push({ key: "cardId", label: "ID de tarjeta", value: card.id });
  pass.backFields.push({ key: "poweredBy", label: "Acerca de", value: "Desarrollado por SoyCasero.com" });
  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: customer.cardCode,
    altText: "Desarrollado por soycasero.com",
    messageEncoding: "iso-8859-1",
  });

  return pass.getAsBuffer();
}
