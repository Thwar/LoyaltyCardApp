// One-off teardown of the cap-test seed data. Scoped STRICTLY to the
// test business "test-cap-free" + its auth user. The /ejemplo demo
// business (demo-ejemplo-negocio) is untouched.
import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const BIZ = "test-cap-free";
const OWNER_EMAIL = "cap-test@soycasero.com";

const env = readFileSync(".env.local", "utf8");
const line = env.split(/\r?\n/).find((l) => l.startsWith("GCP_SERVICE_ACCOUNT_KEY="));
const raw = line.slice("GCP_SERVICE_ACCOUNT_KEY=".length).trim();
const sa = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const db = getFirestore();
const auth = getAuth();

const byBusiness = ["customerCards", "members", "visits", "stamps", "rewards", "membershipPrograms", "loyaltyCards"];

// 1) Inventory
const toDelete = {}; // collection -> [doc refs]
const passSerials = []; // customerCard + member ids → appleRegistrations serials
for (const col of byBusiness) {
  const snap = await db.collection(col).where("businessId", "==", BIZ).get();
  toDelete[col] = snap.docs.map((d) => d.ref);
  if (col === "customerCards" || col === "members") passSerials.push(...snap.docs.map((d) => d.id));
  console.log(`${col}: ${snap.size}`);
}

// Apple device registrations for any of those pass serials (chunked 'in' queries).
const regRefs = [];
for (let i = 0; i < passSerials.length; i += 30) {
  const chunk = passSerials.slice(i, i + 30);
  const snap = await db.collection("appleRegistrations").where("serialNumber", "in", chunk).get();
  regRefs.push(...snap.docs.map((d) => d.ref));
}
console.log(`appleRegistrations: ${regRefs.length}`);

// 2) Delete everything in batches (<500 each)
const allRefs = [...Object.values(toDelete).flat(), ...regRefs, db.collection("businesses").doc(BIZ)];
for (let i = 0; i < allRefs.length; i += 400) {
  const batch = db.batch();
  allRefs.slice(i, i + 400).forEach((r) => batch.delete(r));
  await batch.commit();
}
console.log(`deleted ${allRefs.length} docs (incl. businesses/${BIZ})`);

// 3) Delete the auth user
try {
  const user = await auth.getUserByEmail(OWNER_EMAIL);
  await auth.deleteUser(user.uid);
  console.log(`deleted auth user ${OWNER_EMAIL}`);
} catch (e) {
  console.log(`auth user: ${e.code || e.message}`);
}

// 4) Verify nothing remains
let leftovers = 0;
for (const col of [...byBusiness]) {
  const snap = await db.collection(col).where("businessId", "==", BIZ).limit(1).get();
  if (!snap.empty) { leftovers++; console.log(`LEFTOVER in ${col}`); }
}
const biz = await db.collection("businesses").doc(BIZ).get();
if (biz.exists) { leftovers++; console.log("LEFTOVER business doc"); }
console.log(leftovers === 0 ? "CLEAN — no leftovers" : `${leftovers} LEFTOVERS`);
process.exit(leftovers === 0 ? 0 : 1);
