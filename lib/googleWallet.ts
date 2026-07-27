import "server-only";

// Google Wallet loyalty passes — pure server-side (REST + a signed "save" JWT).
// No push server needed: a stamp is a single PATCH; Google syncs it to the phone.
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getServiceAccount } from "./firebaseAdmin";
import type { CustomerCard, LoyaltyCard, Member, MembershipProgram } from "./types";
import { memberStatus, visitsRemaining, MEMBER_STATUS_LABEL } from "./membership";

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

// Per-customer hero banner = the stamp grid for their current count. Object-level
// heroImage overrides the class hero, and the ?filled= URL changes on every stamp
// so Google re-fetches the updated banner. ?v= busts the cache on a design change.
function stampHeroUri(card: LoyaltyCard, currentStamps: number): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  const v = crypto
    .createHash("sha1")
    .update(`${card.stampShape || "circle"}|${card.cardColor}|${card.textColor}|${card.totalSlots}`)
    .digest("hex")
    .slice(0, 8);
  const filled = Math.max(0, Math.min(currentStamps, card.totalSlots));
  return `${base}/api/card/${card.id}/stamps?filled=${filled}&v=${v}`;
}

export function balanceText(currentStamps: number, slots: number): string {
  return `${Math.min(currentStamps, slots)} / ${slots} sellos`;
}

function formatDate(ts?: number): string {
  if (!ts) return "—";
  try {
    // Pinned to Bolivia time so the logged hour is correct (built on a UTC server).
    return new Date(ts).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/La_Paz",
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  }
}

// Detail rows shown on the Google pass — mirror the Apple back fields so both
// wallets show the same info. "Negocio" is intentionally omitted: the business
// name is already the program name at the top of the Google card. "Sellos
// acumulados" is the lifetime total across completed cards (each redemption
// clears a full card of totalSlots). Kept at ≤10 modules in every state.
// Referral share screen (QR + share buttons) for this customer.
function referralLinks(customer: CustomerCard) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  return { uris: [{ uri: `${base}/share/${customer.id}`, description: "Invita y gana un sello", id: "referral" }] };
}

function loyaltyTextModules(card: LoyaltyCard, customer: CustomerCard, description?: string, hideBranding?: boolean) {
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
    // Drop the SoyCasero credit when a description is present (keeps ≤10 modules) or
    // when the plan is white-labeled (Negocio).
    ...(description || hideBranding ? [] : [{ id: "poweredBy", header: "Acerca de", body: "Desarrollado por SoyCasero.com" }]),
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

// Google only raises an Android notification for a message delivered through the
// dedicated addMessage endpoint with messageType TEXT_AND_NOTIFY. A message
// embedded in an object PATCH renders on the card details screen and defaults to
// messageType TEXT — which is why pass updates were reaching Android phones without
// ever notifying anyone.
//
// The two mechanisms are used together on purpose (see eventMessagePatch):
//   * the PATCH *replaces* messages[], which is what keeps the list bounded
//   * addMessage *appends* — Google warns ids "could possibly duplicate", i.e. there
//     is no replace-by-id, and documents messages[] as max 10 entries
// so notifying through addMessage alone would grow the array by one per event until
// the pass could no longer accept messages at all.
//
// Best-effort: the message is already on the pass from the PATCH, so a failure here
// (including Google's cap of 3 notifying messages per object per rolling 24h, which
// answers QuotaExceededException) costs the notification, not the content.
async function addNotifyingMessage(kind: "loyaltyObject" | "genericObject", objectId: string, header: string, body: string): Promise<void> {
  try {
    const res = await api("POST", `/${kind}/${objectId}/addMessage`, {
      // Unique id per event. Google warns message ids "could possibly duplicate",
      // i.e. addMessage never replaces by id — so reusing one would risk the second
      // and later events being treated as a no-op and never notifying. The list
      // stays bounded because the PATCH above replaced it, not because of the id.
      message: { id: `evt-notify-${Date.now()}`, header, body, messageType: "TEXT_AND_NOTIFY" },
    });
    if (res.status !== 200 && res.status !== 404) {
      console.error(`[google notify] ${kind}/${objectId} -> ${res.status}: ${await res.text()}`);
    }
  } catch (e) {
    console.error("[google notify] error:", objectId, e);
  }
}

// The messages[] value for an object PATCH. Always returns an array so the PATCH
// *replaces* whatever the object accumulated — this is the only thing keeping the
// list from growing without bound.
function eventMessagePatch(header: string, message?: string) {
  return { messages: message ? [{ id: "evt", header, body: message, messageType: "TEXT" }] : [] };
}

// Classes that this warm instance has already confirmed exist. Enrollment used to
// pay a ~700ms GET here every single time, to re-learn something that is true
// forever once the class is created. Per-instance and non-authoritative on purpose:
// a cold start just re-checks, and the insert below tolerates a 409 either way.
const knownClasses = new Set<string>();

async function ensureLoyaltyClass(card: LoyaltyCard): Promise<string> {
  const id = classIdFor(card.id);
  if (knownClasses.has(id)) return id;
  const existing = await api("GET", `/loyaltyClass/${id}`);
  if (existing.status === 200) {
    knownClasses.add(id);
    return id;
  }

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
  knownClasses.add(id);
  return id;
}

// Creates the per-customer pass object and returns a "Save to Google Wallet" URL.
export async function issuePass(customer: CustomerCard, card: LoyaltyCard, description?: string, hideBranding?: boolean): Promise<{ objectId: string; saveUrl: string }> {
  const classId = await ensureLoyaltyClass(card);
  const id = objectIdFor(customer.id);

  const loyaltyObject = {
    id,
    classId,
    state: "ACTIVE",
    accountId: customer.cardCode,
    accountName: customer.customerName || "Cliente",
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(customer.currentStamps, card.totalSlots) } },
    barcode: { type: card.barcodeType === "qr" ? "QR_CODE" : "PDF_417", value: customer.cardCode, alternateText: `Código ${customer.cardCode}` },
    heroImage: { sourceUri: { uri: stampHeroUri(card, customer.currentStamps) } },
    textModulesData: loyaltyTextModules(card, customer, description, hideBranding),
    linksModuleData: referralLinks(customer),
    // Welcome message. messageType is required for it to reach the phone as a
    // notification — without it Google renders it on the details screen only.
    messages: [
      {
        id: `welcome-${customer.id}`,
        header: card.businessName || "SoyCasero",
        body: card.welcomeMessage || `¡Bienvenido a ${card.businessName}! 🎉`,
        messageType: "TEXT_AND_NOTIFY",
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
//
// The event message goes out twice on purpose, and the two copies do different
// jobs: the one in this PATCH *replaces* messages[], which is the only thing
// bounding the list; the addNotifyingMessage one is what actually buzzes the phone.
// Don't remove the PATCH copy — addMessage only appends, and Google caps
// messages[] at 10, so notifying alone would brick the pass within a card cycle.
export async function syncLoyaltyObject(customer: CustomerCard, card: LoyaltyCard, message?: string, description?: string, hideBranding?: boolean, notify = false): Promise<void> {
  const id = objectIdFor(customer.id);
  const header = card.businessName || "SoyCasero";
  const res = await api("PATCH", `/loyaltyObject/${id}`, {
    state: card.isActive === false ? "INACTIVE" : "ACTIVE",
    loyaltyPoints: { label: "Sellos", balance: { string: balanceText(customer.currentStamps, card.totalSlots) } },
    // Included so an owner switching barras ↔ QR updates already-issued passes.
    barcode: { type: card.barcodeType === "qr" ? "QR_CODE" : "PDF_417", value: customer.cardCode, alternateText: `Código ${customer.cardCode}` },
    heroImage: { sourceUri: { uri: stampHeroUri(card, customer.currentStamps) } },
    textModulesData: loyaltyTextModules(card, customer, description, hideBranding),
    linksModuleData: referralLinks(customer),
    // Resets the list to just this event (or clears it) — see eventMessagePatch.
    ...eventMessagePatch(header, message),
  });
  if (res.status === 404) return; // no Google pass issued for this customer
  if (res.status !== 200) {
    throw new Error(`Error actualizando objeto de Wallet (${res.status}): ${await res.text()}`);
  }
  // The PATCH above put the text on the pass; this is what makes the phone buzz.
  if (message && notify) await addNotifyingMessage("loyaltyObject", id, header, message);
}

function buildSaveUrl(objectId: string): string {
  return buildSaveUrlFor({ loyaltyObjects: [{ id: objectId }] });
}

function buildSaveUrlFor(payload: Record<string, unknown>): string {
  const sa = getServiceAccount();
  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: [process.env.NEXT_PUBLIC_BASE_URL || ""],
    payload,
  };
  return `https://pay.google.com/gp/v/save/${jwt.sign(claims, sa.private_key, { algorithm: "RS256" })}`;
}

// ===================== Memberships (Google "generic" passes) =====================
const genericClassIdFor = (programId: string) => `${issuerId()}.mem_${programId}`;
const genericObjectIdFor = (memberId: string) => `${issuerId()}.member_${memberId}`;

function programLogoUri(program: MembershipProgram): string | null {
  if (!program.logoPng) return null;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com";
  const v = crypto.createHash("sha1").update(program.logoPng).digest("hex").slice(0, 10);
  return `${base}/api/membership/${program.id}/logo?shape=square&v=${v}`;
}

async function ensureGenericClass(program: MembershipProgram): Promise<string> {
  const id = genericClassIdFor(program.id);
  if (knownClasses.has(id)) return id; // see the note on knownClasses
  const existing = await api("GET", `/genericClass/${id}`);
  if (existing.status === 200) {
    knownClasses.add(id);
    return id;
  }
  const inserted = await api("POST", `/genericClass`, { id });
  if (inserted.status !== 200 && inserted.status !== 409) {
    throw new Error(`Error creando clase de membresía (${inserted.status}): ${await inserted.text()}`);
  }
  knownClasses.add(id);
  return id;
}

function membershipModules(member: Member, program: MembershipProgram) {
  const rem = visitsRemaining(member);
  return [
    { id: "estado", header: "Estado", body: MEMBER_STATUS_LABEL[memberStatus(member)] },
    { id: "vence", header: "Vence", body: member.expiresAt != null ? formatDate(member.expiresAt) : "Sin vencimiento" },
    ...(program.tracksVisits ? [{ id: "visitas", header: "Visitas restantes", body: rem != null ? String(rem) : "Ilimitado" }] : []),
    ...(program.description ? [{ id: "beneficios", header: "Beneficios", body: program.description }] : []),
    { id: "memberId", header: "Identificador", body: member.id },
  ];
}

function membershipObject(member: Member, program: MembershipProgram, classId: string) {
  const logoUri = programLogoUri(program) || `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.soycasero.com"}/icon.png`;
  return {
    id: genericObjectIdFor(member.id),
    classId,
    genericType: "GENERIC_GYM_MEMBERSHIP",
    cardTitle: { defaultValue: { language: "es", value: program.name } },
    header: { defaultValue: { language: "es", value: member.memberName || "Socio" } },
    subheader: { defaultValue: { language: "es", value: MEMBER_STATUS_LABEL[memberStatus(member)] } },
    hexBackgroundColor: program.cardColor || "#1f2937",
    logo: { sourceUri: { uri: logoUri } },
    textModulesData: membershipModules(member, program),
    barcode: { type: "PDF_417", value: member.memberCode, alternateText: `Código ${member.memberCode}` },
    // Greys the pass out on Android the way Apple voids it — the conditions are kept
    // identical to lib/appleWallet.ts on purpose. Without this the object stayed
    // ACTIVE forever, so a deleted program's members kept a normal-looking card.
    //
    // Deliberately NOT "no_visits": Google files an INACTIVE object under "Expired
    // passes", and running out of visits is recoverable (the owner can reset them),
    // so archiving there would bury a live customer's card — and would do it in the
    // same request that sends their last-visit notification.
    state: program.isActive === false || program.deletedAt || memberStatus(member) === "expired" ? "INACTIVE" : "ACTIVE",
    // Google marks the pass expired after this instant.
    ...(member.expiresAt != null ? { validTimeInterval: { end: { date: new Date(member.expiresAt).toISOString() } } } : {}),
  };
}

export async function issueMembershipPass(member: Member, program: MembershipProgram): Promise<{ objectId: string; saveUrl: string }> {
  const classId = await ensureGenericClass(program);
  const obj = membershipObject(member, program, classId);
  const res = await api("POST", `/genericObject`, {
    ...obj,
    messages: [{ id: `welcome-${member.id}`, header: program.name || "SoyCasero", body: program.welcomeMessage || `¡Bienvenido a ${program.name}! 🎉`, messageType: "TEXT_AND_NOTIFY" }],
  });
  if (res.status !== 200 && res.status !== 409) {
    throw new Error(`Error creando membresía de Wallet (${res.status}): ${await res.text()}`);
  }
  return { objectId: obj.id, saveUrl: buildSaveUrlFor({ genericObjects: [{ id: obj.id }] }) };
}

// Save-to-Wallet URL for an already-issued membership object (no API call).
export function membershipSaveUrl(memberId: string): string {
  return buildSaveUrlFor({ genericObjects: [{ id: genericObjectIdFor(memberId) }] });
}

// Push a member's current state (status, visits, expiry) onto their Google pass.
// Same two-step as syncLoyaltyObject: the PATCH replaces messages[] (bounding it),
// then addMessage is what actually notifies the phone.
export async function syncMembershipObject(member: Member, program: MembershipProgram, message?: string, notify = false): Promise<void> {
  const id = genericObjectIdFor(member.id);
  const classId = genericClassIdFor(program.id);
  const header = program.name || "SoyCasero";
  const res = await api("PATCH", `/genericObject/${id}`, {
    ...membershipObject(member, program, classId),
    ...eventMessagePatch(header, message),
  });
  if (res.status === 404) return; // no Google pass issued for this member
  if (res.status !== 200) {
    throw new Error(`Error actualizando membresía de Wallet (${res.status}): ${await res.text()}`);
  }
  if (message && notify) await addNotifyingMessage("genericObject", id, header, message);
}
