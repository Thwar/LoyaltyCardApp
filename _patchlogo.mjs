import { GoogleAuth } from "google-auth-library";
function getSA() {
  let j = (process.env.GCP_SERVICE_ACCOUNT_KEY || "").trim();
  if (!j.startsWith("{")) j = Buffer.from(j, "base64").toString("utf8");
  return JSON.parse(j);
}
const sa = getSA();
const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
const auth = new GoogleAuth({
  credentials: { client_email: sa.client_email, private_key: sa.private_key },
  scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
});
const token = (await (await auth.getClient()).getAccessToken()).token;
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const list = await (
  await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass?issuerId=${issuerId}`, { headers: H })
).json();
for (const c of list.resources || []) {
  const cardId = c.id.split(".card_")[1];
  const sq = `https://www.soycasero.com/api/card/${cardId}/logo?shape=square&v=fill2`;
  const ok = (await fetch(sq)).status === 200;
  const uri = ok ? sq : "https://www.soycasero.com/icon.png";
  const r = await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${c.id}`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({ reviewStatus: "UNDER_REVIEW", programLogo: { sourceUri: { uri } } }),
  });
  console.log(c.id, "->", r.status, ok ? "business logo" : "icon fallback");
}
