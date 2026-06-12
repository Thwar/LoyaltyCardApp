// One-off TEST seed: a FREE-tier business sitting at exactly 50 caseros so we can
// verify the client-cap enforcement (full /join message + enroll rejection +
// dashboard upgrade alert). Idempotent — deterministic doc ids keep it at 50 on re-run.
// Reads GCP_SERVICE_ACCOUNT_KEY from .env.local; never prints the key.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const env = readFileSync(".env.local", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("GCP_SERVICE_ACCOUNT_KEY="));
if (!line) throw new Error("GCP_SERVICE_ACCOUNT_KEY not found in .env.local");
const raw = line.slice("GCP_SERVICE_ACCOUNT_KEY=".length).trim();
const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
const sa = JSON.parse(json);

initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const db = getFirestore();
const auth = getAuth();

const BUSINESS_ID = "test-cap-free";
const CARD_ID = "test-cap-card";
const OWNER_EMAIL = "cap-test@soycasero.com";
const OWNER_PASS = "Casero1234!";
const TOTAL_SLOTS = 8;
const N = 50;
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// 1) Owner login (so we can open the dashboard and see the upgrade alert).
let ownerUid;
try {
  ownerUid = (await auth.getUserByEmail(OWNER_EMAIL)).uid;
  await auth.updateUser(ownerUid, { password: OWNER_PASS });
} catch {
  ownerUid = (await auth.createUser({ email: OWNER_EMAIL, password: OWNER_PASS, displayName: "Café Lleno (Prueba)" })).uid;
}

// 2) Free-tier business + its single loyalty card.
await db.collection("businesses").doc(BUSINESS_ID).set(
  {
    name: "Café Lleno (Prueba)",
    ownerId: ownerUid,
    ownerEmail: OWNER_EMAIL,
    ownerName: "Dueño de Prueba",
    plan: "gratis", // free tier → maxClients = 50
    description: "Negocio de prueba para validar el límite de 50 caseros.",
    createdAt: now - 90 * DAY,
  },
  { merge: true }
);

await db.collection("loyaltyCards").doc(CARD_ID).set(
  {
    businessId: BUSINESS_ID,
    businessName: "Café Lleno",
    totalSlots: TOTAL_SLOTS,
    rewardDescription: "Tu 8.º café, gratis ☕",
    welcomeMessage: "¡Bienvenido al club de Café Lleno! ☕",
    cardColor: "#6f4e37",
    textColor: "#FFFFFF",
    stampShape: "coffee",
    isActive: true,
    createdAt: now - 90 * DAY,
  },
  { merge: true }
);

// 3) 50 distinct caseros with randomized stats.
const FIRST = ["Ana", "Luis", "María", "Carlos", "Sofía", "Diego", "Valeria", "Jorge", "Camila", "Andrés", "Lucía", "Mateo", "Daniela", "Pablo", "Gabriela", "Fernando", "Paola", "Rodrigo", "Elena", "Marco"];
const LAST = ["Quispe", "Mamani", "Flores", "Vargas", "Choque", "Rojas", "Gutiérrez", "Aliaga", "Camacho", "Salazar", "Téllez", "Mendoza", "Cossío", "Arce", "Velasco"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const usedCodes = new Set();
const code = () => {
  let c;
  do {
    c = Math.floor(100 + Math.random() * 900).toString();
  } while (usedCodes.has(c));
  usedCodes.add(c);
  return c;
};

const batch = db.batch();
let completedCount = 0;
let rewardCount = 0;
for (let i = 0; i < N; i++) {
  const created = now - Math.floor(Math.random() * 80) * DAY; // joined within last ~80 days
  const stamps = Math.floor(Math.random() * (TOTAL_SLOTS + 1)); // 0..8
  const completed = stamps >= TOTAL_SLOTS;
  const redeemed = completed ? Math.floor(Math.random() * 3) : Math.random() < 0.15 ? 1 : 0;
  if (completed) completedCount++;
  if (redeemed > 0) rewardCount++;
  const lastStamp = Math.min(now, created + Math.floor(Math.random() * 40) * DAY); // some active, some lapsed
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const ref = db.collection("customerCards").doc(`cap-client-${i}`);
  batch.set(ref, {
    loyaltyCardId: CARD_ID,
    businessId: BUSINESS_ID,
    customerId: `cap-customer-${i}`, // distinct → counts as one casero each
    customerName: name,
    customerEmail: `casero${i}@ejemplo.test`,
    customerPhone: `+591 7${Math.floor(1000000 + Math.random() * 8999999)}`,
    currentStamps: stamps,
    isRewardClaimed: completed,
    rewardsRedeemed: redeemed,
    marketingConsent: Math.random() < 0.6,
    cardCode: code(),
    createdAt: created,
    lastStampDate: lastStamp,
    appleUpdatedTag: lastStamp,
  });
}
await batch.commit();

console.log(`OK — free business "${BUSINESS_ID}" seeded with ${N} caseros (${completedCount} completas, ${rewardCount} con recompensa).`);
console.log(`Login:  ${OWNER_EMAIL}  /  ${OWNER_PASS}`);
console.log(`Join URL (should show "promoción llena"):  /join/${CARD_ID}`);
process.exit(0);
