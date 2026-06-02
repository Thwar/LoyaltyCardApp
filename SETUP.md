# SoyCasero — Setup (prototype)

A web app (Next.js) that lets a business create a digital stamp card and issue it to
customers via **Google Wallet** — no app to download. Backend is Firebase (project `casero-app`).

> This is a proof-of-concept. Google Wallet is the first wallet; Apple Wallet is a later phase.

---

## 0. Prerequisites

- Node.js 18+ and npm
- The Firebase project `casero-app` (already wired in `.env.local`)
- An account in the [Google Pay & Wallet Console](https://pay.google.com/business/console) (for the wallet step)

---

## 1. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000

The app will **not** work until you complete step 2 (the server needs a service-account key
to read/write Firestore). Step 3 (Google Wallet) is optional — without it, cards and codes still
work, you just don't get a wallet pass yet.

---

## 2. Firebase Admin service account  (REQUIRED)

All data goes through server routes using the Firebase Admin SDK.

1. Firebase Console → **casero-app** → ⚙️ **Project settings** → **Service accounts**.
2. Click **Generate new private key** → downloads a JSON file.
3. Turn it into one line and paste it into `.env.local` as `GCP_SERVICE_ACCOUNT_KEY`.
   - Easiest: open the JSON, copy everything, and paste as a single value. If newlines in
     `private_key` cause trouble, base64-encode the whole file instead — the app accepts either:
     ```bash
     # macOS/Linux
     base64 -w0 serviceAccount.json
     # Windows PowerShell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccount.json"))
     ```
     Paste the base64 string into `GCP_SERVICE_ACCOUNT_KEY`.
4. Enable **Email/Password** sign-in: Firebase Console → **Authentication** → Sign-in method → enable Email/Password.
5. Make sure **Firestore Database** is created (Console → Firestore Database → Create, production mode is fine — Admin bypasses rules).

Restart `npm run dev`. You can now: sign up → create a card → get the QR → enroll a test
customer → see their code → add a stamp. (The customer just gets a code for now.)

---

## 3. Google Wallet  (optional — turns on real passes)

1. **Enable the API**: Google Cloud Console → use the same project as the service account →
   APIs & Services → enable **Google Wallet API**.
2. **Create an Issuer**: [Google Pay & Wallet Console](https://pay.google.com/business/console) →
   Google Wallet API → create an **Issuer account**. Copy the **Issuer ID** → set
   `GOOGLE_WALLET_ISSUER_ID` in `.env.local`.
3. **Authorize the service account**: in the Wallet Console, add your service-account email
   (the `client_email` from the JSON) as a user with access to the issuer.
4. **Demo mode**: new issuers are in demo mode — only your own/whitelisted Google accounts can
   save a pass. To go public, complete the Business Profile and **Request publishing access**
   (can take days to weeks — start early).
5. **Public URL for testing**: Google fetches your logo and checks `origins`, so passes only
   fully work from a **public https URL**, not `localhost`. Deploy to Vercel (step 4) and set
   `NEXT_PUBLIC_BASE_URL` to that URL before testing the "Add to Google Wallet" button on a phone.

Restart the app. Enrollment now returns a working **Añadir a Google Wallet** link, and each
stamp pushes the new balance to the phone.

---

## 3b. Apple Wallet (Phase A — issuance)

Lets customers add the stamp card to **Apple Wallet** on iPhone. Needs an Apple Developer
account ($99/yr). The signing key + CSR were generated into `.certs/` and the WWDR cert is
already wired. You provide the Pass Type ID certificate:

1. **Create a Pass Type ID**: [developer.apple.com](https://developer.apple.com/account) →
   Certificates, Identifiers & Profiles → **Identifiers** → ＋ → **Pass Type IDs** →
   identifier `pass.com.soycasero.loyalty` → Register.
2. **Create the certificate** for it → **Upload CSR** = `.certs/SoyCasero.certSigningRequest`
   → download the resulting `pass.cer` into `.certs/`.
3. **Convert + wire it** (and set your Team ID, from Membership → Team ID):
   ```bash
   openssl x509 -inform DER -in .certs/pass.cer -out .certs/signerCert.pem
   # then base64 signerCert.pem -> APPLE_SIGNER_CERT, and set APPLE_PASS_TYPE_ID / APPLE_TEAM_ID
   ```
4. Restart `npm run dev`. The `/join` success screen now shows **Añadir a Apple Wallet**.

Env vars (all base64 of the PEM, except the IDs): `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`,
`APPLE_SIGNER_CERT`, `APPLE_SIGNER_KEY`, `APPLE_WWDR`, `APPLE_KEY_PASSPHRASE`.

> **⏰ Cert renewal — the one Apple landmine.** The current Pass Type ID signing cert
> (`APPLE_SIGNER_CERT`) expires **2027-07-01**. A lapsed cert silently breaks signing for your
> ENTIRE base — already-installed passes keep working, but you can't issue new passes or push
> any stamp updates. **Set a calendar reminder for ~2027-06-01** to regenerate it: repeat steps
> 1–3 above with a fresh certificate, re-base64 it into `APPLE_SIGNER_CERT` (locally + in Vercel),
> and redeploy. (Check the live expiry any time with `node -e` + `crypto.X509Certificate` on the
> base64 cert.)

> Live stamp updates (PassKit web service under `app/api/wallet/apple/v1/**` + APNs) are wired.

---

## 4. Deploy to Vercel

The repo is already linked to Vercel. Set the same env vars in
**Vercel → Project → Settings → Environment Variables** (Production):

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | from `.env.local` |
| `NEXT_PUBLIC_BASE_URL` | e.g. `https://www.soycasero.com` |
| `FIREBASE_PROJECT_ID` | `casero-app` |
| `GCP_SERVICE_ACCOUNT_KEY` | the one-line / base64 service-account key (secret) |
| `GOOGLE_WALLET_ISSUER_ID` | once you have an issuer |

Then `git push` the branch (or `vercel --prod`). Vercel auto-detects Next.js.

---

## What's where

```
app/
  page.tsx                 landing (/)
  signup/  login/          business-owner auth (Firebase Auth)
  dashboard/               create/edit card, QR, add stamps, customer list
  join/[cardId]/           public customer enrollment + Save-to-Wallet
  api/
    business/setup         create the business (after signup)
    business/card          create/update the stamp card
    business/me            dashboard data
    enroll                 public: create customer card + Google Wallet pass
    stamp                  add a stamp / redeem  -> Firestore + Wallet PATCH
    card/[loyaltyCardId]   public: card display info for /join
lib/                       firebase client+admin, google wallet, types, card codes
components/                CardPreview, QrCode
```

## Notes / next steps

- The dashboard's "Sumar un sello" box is the staff tool for now (owner = staff). A dedicated
  mobile `/stamp` page + QR scanning is a natural next refinement.
- `/api/enroll` is public (customers aren't logged in). Add basic rate-limiting before launch.
- Apple Wallet (.pkpass + APNs) is a later phase — see `BUSINESS_PLAN_Wallet_Loyalty_Pivot.md`.

## God mode (founder admin) — `/admin`

A founder-only console at **`/admin`**: all businesses + system stats, per-business
drill-in (cards/clients), set plan + expiration (e.g. cash paid for 3 months of Café),
hard-delete a business and all its data, and a DB/schema viewer.

- **Access is by email allowlist**, checked server-side on every `/api/admin/*` call
  (fail-closed). Set yours in **`lib/admin.ts` → `ADMIN_EMAILS`** to the email you log
  into SoyCasero with. Anyone else gets 403.
- Plans never auto-bill: set `plan` + `planExpiresAt` here by hand. An expired paid plan
  reverts to free automatically (`effectivePlan` in `lib/plans.ts`).
- Delete is a **hard** cascade (Firestore data only — the owner's login is left intact)
  and requires typing the business name to confirm.
