import "server-only";

// Google Wallet loyalty passes — pure server-side (REST + a signed "save" JWT).
// No push server needed: a stamp is a single PATCH; Google syncs it to the phone.
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getServiceAccount } from "./firebaseAdmin";
import type { CustomerCard, LoyaltyCard } from "./types";

const BASE = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

export function walletConfigured(): boolean {
  return !!(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GCP_SERVICE_ACCOUNT_KEY);
}

function issuerId(): string {
  const id = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (!id) throw new Error("GOOGLE_WALLET_ISSUER_ID no está configurado.");
  return id;
}

const classIdFor = (loyaltyCardId: string) => `${issuerId()}.card_${loyaltyCardId}`;
const objectIdFor = (customerCardId: string) => `${issuerId()}.cust_${customerCardId}`;

// Public URL for the business's logo so Google can fetch it for the hero banner.
// Content-addressed by a hash of the image, so changing the logo busts Google's
// server-side cache. Returns null when the business hasn't uploaded a logo.
function businessLogoUri(card: LoyaltyCard): string | null {
  if (!card.logoPng) return null;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const v = crypto.createHash("sha1").update(card.logoPng).digest("hex").slice(0, 10);
  return `${base}/api/card/${card.id}/logo?v=${v}`;
}

// Square version of the business logo (centered on the card color) for Google's
// circular program logo, where a wide/white wordmark would crop or vanish.
function businessLogoSquareUri(card: LoyaltyCard): string | null {
  if (!card.logoPng) return null;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  const v = crypto.createHash("sha1").update(card.logoPng).digest("hex").slice(0, 10);
  return `${base}/api/card/${card.id}/logo?shape=square&v=${v}`;
}

export function balanceText(currentStamps: number, slots: number): string {
  return `${Math.min(currentStamps, slots)} / ${slots} sellos`;
}

function formatDate(ts?: number): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

// Detail rows shown on the Google pass — mirror the Apple back fields so both
// wallets show the same info. "Negocio" is intentionally omitted: the business
// name is already the program name at the top of the Google card. "Sellos
// acumulados" is the lifetime total across completed cards (each redemption
// clears a full card of totalSlots). Kept at ≤10 modules in every state.
function loyaltyTextModules(card: LoyaltyCard, customer: CustomerCard, description?: string) {
  const totalStamps = (customer.rewardsRedeemed || 0) * card.totalSlots + customer.currentStamps;
  return [
    { id: "reward", header: "Recompensa", body: card.rewardDescription },
    ...(description ? [{ id: "about", header: "Sobre el negocio", body: description }] : []),
    { id: "status", header: "Estado", body: card.isActive === false ? "Inactivo" : "Activo" },
    ...(card.isActive === false
      ? [{ id: "ended", header: "Aviso", body: "Esta promoción ha terminado." }]
      : []),
    { id: "totalStamps", header: "Sellos acumulados", body: String(totalStamps) },
    { id: "redeemed", header: "Recompensas canjeadas", body: String(customer.rewardsRedeemed || 0) },
    { id: "lastStamp", header: "Último sello", body: formatDate(customer.lastStampDate) },
    { id: "memberSince", header: "Casero desde", body: formatDate(customer.createdAt) },
    { id: "passId", header: "Identificador", body: customer.id },
    { id: "cardId", header: "ID de tarjeta", body: card.id },
    // Drop the SoyCasero credit when a business description is present (keeps ≤10 modules).
    ...(description ? [] : [{ id: "poweredBy", header: "Acerca de", body: "Desarrollado por SoyCasero.com" }]),
  ];
}

let authClient: GoogleAuth | null = null;
async function accessToken(): Promise<string> {
  if (!authClient) {
    const sa = getServiceAccount();
    authClient = new GoogleAuth({
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
      scopes: [SCOPE],
    });
  }
  const client = await authClient.getClient();
  const res = await client.getAccessToken();
  if (!res.token) throw new Error("No se pudo obtener token de acceso de Google Wallet.");
  return res.token;
}

async function api(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function ensureLoyaltyClass(card: LoyaltyCard): Promise<string> {
  const id = classIdFor(card.id);
  const existing = await api("GET", `/loyaltyClass/${id}`);
  if (existing.status === 200) return id;

  // Business logo (square, on the card color) for the circular program logo;
  // falls back to the square SoyCasero red mark when the business has no logo.
  const logoUri =
    businessLogoSquareUri(card) || `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com"}/icon.png`;
  const heroUri = businessLogoUri(card);
  const loyaltyClass = {
    id,
    issuerName: card.businessName || "SoyCasero",
    programName: card.businessName || "Programa de Lealtad",
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: card.cardColor || "#E53935",
    programLogo: { sourceUri: { uri: logoUri } },
    ...(heroUri ? { heroImage: { sourceUri: { uri: heroUri } } } : {}),
  };
  const inserted = await api("POST", `/loyaltyClass`, loyaltyClass);
  if (inserted.status !== 200 && inserted.status !== 409) {
    throw new Error(`Error creando clase de Wallet (${inserted.status}): ${await inserted.text()}`);
  }
  return id;
}

// Creates the per-customer pass object and returns a "Save to Google Wallet" URL.
export async function issuePass(customer: CustomerCard, card: LoyaltyCard, description?: string): Promise<{ objectId: string; saveUrl: string }> {
  const classId = await ensureLoyaltyClass(card);
  const id = objectIdFor(customer.id);

  const loyaltyObject = {
    id,
    classId,
    state: "ACTIVE",
    accountId: customer.cardCode,
    accountName: customer.customerName || "Cliente",
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(customer.currentStamps, card.totalSlots) } },
    barcode: { type: "PDF_417", value: customer.cardCode, alternateText: `Código ${customer.cardCode}` },
    textModulesData: loyaltyTextModules(card, customer, description),
    // Welcome message — Google surfaces this as a notification when the pass is saved.
    messages: [
      {
        id: `welcome-${customer.id}`,
        header: card.businessName || "SoyCasero",
        body: card.welcomeMessage || `¡Bienvenido a ${card.businessName}! 🎉`,
      },
    ],
  };
  const res = await api("POST", `/loyaltyObject`, loyaltyObject);
  if (res.status !== 200 && res.status !== 409) {
    throw new Error(`Error creando objeto de Wallet (${res.status}): ${await res.text()}`);
  }
  return { objectId: id, saveUrl: buildSaveUrl(id) };
}

// Push a card edit (color / name) onto the shared loyalty class. 404 = no class
// exists yet (no Google passes issued for this card), which is fine to ignore.
export async function syncLoyaltyClass(card: LoyaltyCard): Promise<void> {
  const id = classIdFor(card.id);
  const heroUri = businessLogoUri(card);
  const logoUri =
    businessLogoSquareUri(card) || `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com"}/icon.png`;
  const res = await api("PATCH", `/loyaltyClass/${id}`, {
    // Required when modifying an already-APPROVED class (Google rejects the PATCH
    // otherwise); re-submits the class for review.
    reviewStatus: "UNDER_REVIEW",
    issuerName: card.businessName || "SoyCasero",
    programName: card.businessName || "Programa de Lealtad",
    hexBackgroundColor: card.cardColor || "#E53935",
    programLogo: { sourceUri: { uri: logoUri } },
    ...(heroUri ? { heroImage: { sourceUri: { uri: heroUri } } } : {}),
  });
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`Error actualizando clase de Wallet (${res.status}): ${await res.text()}`);
  }
}

// Push a customer's current state onto their Google pass: balance, reward text,
// and ACTIVE/INACTIVE (INACTIVE greys it out when the program is deactivated).
export async function syncLoyaltyObject(customer: CustomerCard, card: LoyaltyCard, message?: string, description?: string): Promise<void> {
  const id = objectIdFor(customer.id);
  const res = await api("PATCH", `/loyaltyObject/${id}`, {
    state: card.isActive === false ? "INACTIVE" : "ACTIVE",
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(customer.currentStamps, card.totalSlots) } },
    textModulesData: loyaltyTextModules(card, customer, description),
    // A new message id triggers a Google Wallet notification; replacing the array
    // (rather than appending) keeps only the latest event on the pass.
    ...(message
      ? { messages: [{ id: `evt-${Date.now()}`, header: card.businessName || "SoyCasero", body: message }] }
      : {}),
  });
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`Error actualizando objeto de Wallet (${res.status}): ${await res.text()}`);
  }
}

function buildSaveUrl(objectId: string): string {
  const sa = getServiceAccount();
  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: [process.env.NEXT_PUBLIC_BASE_URL || ""],
    payload: { loyaltyObjects: [{ id: objectId }] },
  };
  return `https://pay.google.com/gp/v/save/${jwt.sign(claims, sa.private_key, { algorithm: "RS256" })}`;
}
