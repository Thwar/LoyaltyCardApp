// One-off: seed a public "example" business + loyalty card so the /ejemplo page
// links to a REAL, enrollable /join card (visitors can add it to their wallet).
// Reads GCP_SERVICE_ACCOUNT_KEY from .env.local at runtime; never prints the key.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const env = readFileSync(".env.local", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("GCP_SERVICE_ACCOUNT_KEY="));
if (!line) throw new Error("GCP_SERVICE_ACCOUNT_KEY not found in .env.local");
const raw = line.slice("GCP_SERVICE_ACCOUNT_KEY=".length).trim();
const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
const sa = JSON.parse(json);

initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const db = getFirestore();

const BUSINESS_ID = "demo-ejemplo-negocio";
const CARD_ID = "demo-pizza-ejemplo";
const now = Date.now();
const logoPng = readFileSync("public/homepage/pizza.png").toString("base64");

await db.collection("businesses").doc(BUSINESS_ID).set(
  {
    name: "Pizzería Don Luis (Ejemplo)",
    ownerId: "demo-owner",
    plan: "cafe",
    description: "Tarjeta de ejemplo de SoyCasero. Junta sellos y gana pizza gratis.",
    logoPng,
    createdAt: now,
  },
  { merge: true }
);

await db.collection("loyaltyCards").doc(CARD_ID).set(
  {
    businessId: BUSINESS_ID,
    businessName: "Pizzería Don Luis",
    totalSlots: 8,
    rewardDescription: "Tu 8.ª pizza, gratis 🍕",
    welcomeMessage: "¡Bienvenido al club de Pizzería Don Luis! 🍕 Junta sellos y gana pizza gratis.",
    cardColor: "#c1121f",
    textColor: "#FFFFFF",
    stampShape: "pizza",
    logoPng,
    isActive: true,
    createdAt: now,
  },
  { merge: true }
);

console.log("OK seeded demo card:", CARD_ID);
process.exit(0);
