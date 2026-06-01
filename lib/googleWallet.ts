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

export function balanceText(currentStamps: number, slots: number): string {
  return `${Math.min(currentStamps, slots)} / ${slots} sellos`;
}

// Detail rows shown on the Google pass (mirror the Apple back fields we surface).
function loyaltyTextModules(card: LoyaltyCard) {
  return [
    { id: "reward", header: "Recompensa", body: card.rewardDescription },
    { id: "cardId", header: "ID de tarjeta", body: card.id },
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

  const logoUri = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/logo.png`;
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
export async function issuePass(customer: CustomerCard, card: LoyaltyCard): Promise<{ objectId: string; saveUrl: string }> {
  const classId = await ensureLoyaltyClass(card);
  const id = objectIdFor(customer.id);

  const loyaltyObject = {
    id,
    classId,
    state: "ACTIVE",
    accountId: customer.cardCode,
    accountName: customer.customerName || "Cliente",
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(customer.currentStamps, card.totalSlots) } },
    barcode: { type: "QR_CODE", value: customer.cardCode, alternateText: `Código ${customer.cardCode}` },
    textModulesData: loyaltyTextModules(card),
  };
  const res = await api("POST", `/loyaltyObject`, loyaltyObject);
  if (res.status !== 200 && res.status !== 409) {
    throw new Error(`Error creando objeto de Wallet (${res.status}): ${await res.text()}`);
  }
  return { objectId: id, saveUrl: buildSaveUrl(id) };
}

export async function updatePassBalance(objectId: string, currentStamps: number, slots: number): Promise<void> {
  const res = await api("PATCH", `/loyaltyObject/${objectId}`, {
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(currentStamps, slots) } },
  });
  if (res.status !== 200) {
    throw new Error(`Error actualizando pase de Wallet (${res.status}): ${await res.text()}`);
  }
}

// Push a card edit (color / name) onto the shared loyalty class. 404 = no class
// exists yet (no Google passes issued for this card), which is fine to ignore.
export async function syncLoyaltyClass(card: LoyaltyCard): Promise<void> {
  const id = classIdFor(card.id);
  const heroUri = businessLogoUri(card);
  const res = await api("PATCH", `/loyaltyClass/${id}`, {
    issuerName: card.businessName || "SoyCasero",
    programName: card.businessName || "Programa de Lealtad",
    hexBackgroundColor: card.cardColor || "#E53935",
    ...(heroUri ? { heroImage: { sourceUri: { uri: heroUri } } } : {}),
  });
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`Error actualizando clase de Wallet (${res.status}): ${await res.text()}`);
  }
}

// Push a customer's current state onto their Google pass: balance, reward text,
// and ACTIVE/INACTIVE (INACTIVE greys it out when the program is deactivated).
export async function syncLoyaltyObject(customer: CustomerCard, card: LoyaltyCard): Promise<void> {
  const id = objectIdFor(customer.id);
  const res = await api("PATCH", `/loyaltyObject/${id}`, {
    state: card.isActive === false ? "INACTIVE" : "ACTIVE",
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(customer.currentStamps, card.totalSlots) } },
    textModulesData: loyaltyTextModules(card),
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
