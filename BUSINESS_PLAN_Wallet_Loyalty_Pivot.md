# Soy Casero — Business Implementation Plan
### Pivoting from a native iOS loyalty app to a web + wallet loyalty SaaS for Bolivian SMEs

*Prepared for a solo technical founder. Numbers in this document are planning estimates; line items marked "verify" should be confirmed before you bet money on them.*

---

## 1. Verdict: How realistic is this?

**Feasibility rating: HIGH.** This is one of the more de-risked SaaS pivots I've reviewed, for four concrete reasons:

1. **The model is proven, not speculative.** Wallet-based digital stamp cards are a crowded, converging market: LoyalzClub (Argentina, Spanish, your direct template), Loopy Loyalty, Stamp Me, Boomerangme, Pass2U, PassKit, Loyicard, FaveCard, SQUID, Passcreator. A dozen companies have validated both the demand and the exact technical architecture you'd copy. You are not inventing anything — you are localizing a working formula. LoyalzClub *self-reports* ~1,000 businesses, ~100,000 cardholders, 8M push messages across 13 countries (marketing claims, not audited, but the existence of so many priced competitors corroborates real demand).

2. **The technology is fully confirmed by primary sources.** Apple's own docs confirm app-less delivery and remote stamp updates via the PassKit web service + APNs; Google's docs confirm pure-web issuance via REST + a Save-to-Wallet JWT with *no* push server at all. Both verified-claim reviews returned "mostly-true-with-caveats" — nothing load-bearing is false; the caveats are operational obligations (cert renewal, hosting, approval gates), not blockers.

3. **You have an unusual head start.** You already built a complete loyalty data model and business logic (Firestore + `customerCardService.ts`) that maps almost 1:1 onto wallet passes, and your codebase *already targets web* (react-native-web, Vercel config, webpack, a landing site). The pivot reuses your backend and brand wholesale; you're discarding the React Native UI, not rewriting the system. You also own `soycasero.com` and a Spanish brand identity.

4. **Bolivia is structurally well-suited to this product specifically.** ~85–93% Android share means Google Wallet (the cheaper, simpler half) covers the vast majority of your market, and Google Wallet in Bolivia *does* support adding loyalty passes (only NFC tap-to-pay is unavailable — irrelevant to you). The country is mid-explosion in digital payments (QR transaction volume up ~48x 2021→2024; >1 billion electronic transactions by Aug 2025), so SMEs are already being trained to scan QR and adopt digital tools.

**The real risks are commercial and operational, not technical:**

- **Distribution/sales in Bolivia is the hard part.** ~400,000 registered firms, 9 of 10 micro/small, ~90%+ informal, low digitization, and real price sensitivity squeezed further by an FX crisis. Landing paying customers — not building the product — is what will make or break this.
- **Payment collection.** Stripe does **not** support Bolivia-based businesses (only Brazil and Mexico in LatAm). Confirmed, hard constraint with workarounds, not a dead end (Section 7).
- **Single-founder bandwidth.** You'll be building, selling, supporting, and onboarding simultaneously. The product is achievable solo; the *company* is the bottleneck.

**Bottom line:** The bet is fundamentally a go-to-market bet on Bolivian SMEs, not a technology bet. That's the right kind of risk — the kind you can de-risk with five customer conversations next week, before writing a line of pivot code.

---

## 2. Why the web + wallet model beats your native app

Your finished Expo iOS app has **zero customers**, and the native-app route fights three structural headwinds your competitors have already escaped:

| Dimension | Your native iOS app | Web + Wallet model |
|---|---|---|
| **Customer friction** | Find, download, install, register in an app | Scan QR → web form → "Add to Wallet" → done. No install. |
| **Platform reach** | iOS only (≈12% of Bolivia) | Android (Google Wallet) + iOS (Apple Wallet) — covers ~100% |
| **Where the card lives** | Inside your app (must be opened) | In the OS wallet the user already opens for boarding passes, tickets |
| **App Store gatekeeping** | Review, rejections, 30% IAP risk, annual churn | None — you serve a signed file / a link |
| **Merchant onboarding** | "Tell your customers to download our app" (high drop-off) | "Put this QR on your counter" |

**The Android-dominance point is decisive for Bolivia.** With ~85–93% of Bolivian phones on Android, an iOS-only app addresses roughly one in eight phones. Worse, the *value proposition of a stamp card is ubiquity* — every customer must be able to hold it. A native iOS app structurally cannot deliver that in this market. The wallet model inverts it: the card lands in the OS-native wallet on *both* platforms with no download, and on Android (your dominant segment) the implementation is the cheap, server-light Google Wallet path.

The single most powerful sales line in this entire plan — **"It's not another app your customers have to download"** — is *only* available to you if you pivot. It's also the exact objection every café owner will have. Lead with it.

---

## 3. How the technology actually works

### 3.1 Apple Wallet (the harder, smaller half — ~12% of Bolivia)

A wallet "stamp card" is a signed `.pkpass` file (a ZIP of `pass.json` + images + a manifest + a PKCS#7 signature). There is **no native punch-card UI** in Apple Wallet, so the stamps are an *image trick*. Flow:

1. **One-time setup.** Enroll in the Apple Developer Program ($99/yr). Register a **Pass Type ID** (reverse-DNS, e.g. `pass.com.soycasero.loyalty`), generate a **Pass Type ID signing certificate** (.p12 with private key), and obtain the **Apple WWDR intermediate cert** (currently "G4" — verify active series at signing time). The same cert signs passes *and* authenticates APNs pushes.

2. **Issue a pass (no app needed).** Your server builds `pass.json` (style = `storeCard`, Apple's designated loyalty style), generates the stamp image, computes SHA-1 hashes into `manifest.json`, creates a detached PKCS#7 signature, ZIPs it into a `.pkpass`. Serve it with MIME type `application/vnd.apple.pkpass` from a web link / QR / "Add to Apple Wallet" button → iPhone shows the Add-to-Wallet sheet. **The private key must never leave the server** — this is why a server is mandatory.

3. **Stamp = regenerate the image + push.** Because there's no stamp widget, your backend regenerates `strip.png` (≈375×123 pt; **verify dimensions** — provide @2x/@3x) drawing N filled / M empty icons (e.g. Sede Café's sailboat flags), updates the field text ("7 de 10"), re-signs the pass, then sends an **empty-payload APNs push** (`apns-topic` = the Pass Type ID, `apns-push-type: background`) to each registered device. Wallet then calls back to fetch the rebuilt pass.

4. **The PassKit Web Service you must host** (all under your HTTPS `webServiceURL`, prefix `/v1`):
   - `POST /v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serial}` — device registers, sends its `pushToken`
   - `GET /v1/devices/{deviceLibraryId}/registrations/{passTypeId}?passesUpdatedSince=…` — returns changed serials
   - `GET /v1/passes/{passTypeId}/{serial}` — returns the rebuilt `.pkpass` (supports `If-Modified-Since`/304)
   - `DELETE …/registrations/…` — unregister
   - Auth: `Authorization: ApplePass {authenticationToken}`; never change the token on updates.

**Operational gotchas (confirmed):** server mandatory; cert expires ~398 days (≈annual) — a lapsed cert silently breaks stamping for your *entire* base (installed passes keep working, but you can't sign new ones or push updates); APNs JWT tokens expire after 1 hour if you use token auth; APNs is HTTP/2 only (legacy protocol decommissioned 2021); pushes are best-effort/coalesced, not guaranteed-instant; per-device throttling returns 429 — use backoff.

**Library:** `passkit-generator` (Node, MIT) builds + signs the `.pkpass`. It does *not* do APNs or the web service — pair with a webservice toolkit / Node's `http2` + `jsonwebtoken`, or `node-apn`. Image generation is your own code (`sharp` or `canvas`). Avoid `pass-js` (AGPL-3.0 copyleft — licensing risk for closed-source SaaS).

### 3.2 Google Wallet (the easier, bigger half — ~85%+ of Bolivia)

Dramatically simpler — **no push server, no APNs, no device registration to operate.**

1. **One-time setup.** Create a **Google Cloud project** + **service account**; in the **Google Pay & Wallet Console** create an **Issuer account** (accept ToS). New accounts start in **demo mode** ("[TEST ONLY]" label, only your test accounts can save). To go public: complete a **Business Profile + payments profile**, create ≥1 Passes Class, then **"Request publishing access"** (~1–2 business days official, but community reports show occasional multi-week waits — **don't assume same-week go-live**; screenshots are no longer required). Google Wallet API is **not** available to new businesses in India (irrelevant to you, but regional gating exists).

2. **Architecture.** A `LoyaltyClass` (template: brand, program name, logo, hero image) + per-user `LoyaltyObject` (account ID, current stamps/points, barcode), both created via REST (`walletobjects.googleapis.com`).

3. **Save to Wallet.** Serve a link `https://pay.google.com/gp/v/save/{signed_jwt}`. The JWT is RS256-signed with the service-account key (`iss`, `aud="google"`, `typ="savetowallet"`, `origins[]`). **Hard constraint:** the encoded URL must stay under ~1,800 chars — use the "thin JWT" pattern: pre-create class+object via REST, reference only the object ID in the JWT.

4. **Stamp = a single HTTP PATCH.** `PATCH …/v1/loyaltyobject/{id}` bumps `loyaltyPoints.balance`; Google propagates it to the user's pass on next sync — **with zero infrastructure on your side**. To actively notify, set `notifyPreference="notifyOnUpdate"` or call AddMessage with `TEXT_AND_NOTIFY`. **Caps:** 3 notifications per pass per rolling 24h; you **cannot** customize the notification title/body; API rate limit 20 req/s.

5. **Stamp visuals.** Same as Apple — no native punch widget. Express progress via `loyaltyPoints` ("7 de 10") + `textModulesData`, and/or a dynamically generated `heroImage`/strip showing the dots.

**iOS-on-Google note:** the Save link works in iOS Safari *only if the user has the Google Wallet app installed*. For default iPhone users you still want the Apple path. In practice: serve **both** buttons and let the device pick.

### 3.3 The staff "scan to add a stamp" flow

This is where your existing code shines. When a customer buys coffee:

1. Customer shows the barcode/QR on their wallet pass (it encodes their **`cardCode`** — your existing unique per-business code from `cardCodeUtils.ts`), **or** staff opens your **staff PWA** and types the 3-digit code.
2. Staff PWA hits a **server endpoint** that runs your existing `addStampByCardCodeAndBusiness` logic (stamp accrual + completion detection) against Firestore — but **moved server-side** (Section 6).
3. The server then fires the two update paths: **regenerate + APNs push** (Apple) and **PATCH loyaltyobject** (Google).
4. On the 9th stamp the pass flips to "reward ready"; redemption runs `claimRewardByCardCodeAndBusiness` and resets.

Architecture in words: *Browser/PWA → your API (Node serverless on Vercel) → Firebase Admin (stamp logic + ledger) → fan-out to {passkit-generator + APNs} and {Google Wallet REST}.*

---

## 4. Build vs Buy decision

**Recommendation: Hybrid. BUY the pass layer to reach your first paying customer in days; OWN your database + dashboard from day one so you can swap to in-house pass generation later with no re-platforming.**

The trap to avoid: spending 4–8 weeks building Apple cert/APNs/web-service plumbing *before* you've proven a single Bolivian café will pay. Apple's side is the time sink; Google's is fast. A pass API removes that entire risk for the validation phase.

| Path | Time to first paying customer | Recurring cost | Pros | Cons |
|---|---|---|---|---|
| **BUY — PassKit.com** | Days | From ~$39.50/mo (1 seat, 250 multi-use + 250 single-use passes); per-pass $0.045→$0.0005 at volume | Apple+Google+Samsung, REST + webhooks, no cert/APNs ops, 45-day trial | Per-seat model costly; multi-tenant reseller not self-serve; custom domain/de-branding extra |
| **BUY — Pass2U** | Days | Credits ~$0.012–0.019/normal pass; punch card 10 credits; optional $39–79/mo unlimited-updates | Cheapest thin layer | Less clearly white-label/multi-tenant |
| **BUILD from scratch** | ~4–8 weeks (1 experienced full-stack dev) | $99/yr Apple + ~$25–75/mo hosting; Google free | Full control, best long-term margin, no lock-in, no per-pass erosion | Apple cert/APNs + web service = real engineering; annual renewal; you own all ops |

**My specific recommendation for you (experienced engineer, data model already built):**

- **Phase 1 (validate + first paying customer):** Build the **Google Wallet path yourself** — genuinely quick (REST + JWT, no push server), free, covers ~85%+ of your market. For Apple, either **stub it** (Google-only at launch is defensible in Bolivia) or **buy PassKit/Pass2U** for the iOS minority so you don't burn two weeks on APNs before revenue.
- **Phase 2+ (scale + protect margin):** Bring Apple in-house with `passkit-generator` + APNs once paying customers fund the work. Because you kept Firestore as system of record, this is an additive backend change, not a rewrite.

---

## 5. Reusing your existing assets

The pivot is **mostly reuse**. Your codebase already targets web (react-native-web 0.21, `vercel.json`, `webpack.config.js`, `scripts/build-web.cjs`, `site/`) — a UI swap plus new pass services, not a rewrite.

**Carries over directly:**
- **Entire data model** — `src/types/index.ts` (User/Business/LoyaltyCard/CustomerCard/Stamp/Reward/StampActivity). `customerCards` is the natural source for a wallet pass; `currentStamps`/`totalSlots` → pass fields; `cardColor`/`logo` → pass styling. **Fully reusable as-is.**
- **Core business logic** — `customerCardService.ts` (`joinLoyaltyProgram` with transactional code reservation, `addStamp`/`addStampByCardCodeAndBusiness`, `claimRewardByCardCodeAndBusiness`, delete cascade). Pure Firebase JS SDK; runs in browser unchanged — though you'll **move stamp/redeem server-side** (Section 6).
- **CRUD services** — `loyaltyCardService.ts`, `businessService.ts`, `userService.ts`, `stampActivityService.ts`.
- **Auth** — `authService.ts` (already has `Platform.OS==='web'` branches) and `firebase.ts` (already has a web init branch).
- **Security** — `firestore.rules` (role-based customer vs business owner, ownership cross-validation), `firestore.indexes.json`, `storage.rules`.
- **The card-code generator** — `cardCodeUtils.ts` is a ready-made **wallet serial number / QR payload**.
- **Serverless + email** — `api/delete-account.js`, `api/send-welcome-email.js` (Resend) + Spanish welcome templates; the `api/` folder already uses `firebase-admin` — the exact pattern your new pass-update functions need.
- **Brand** — `assets/` (logos, icon, favicon, BalooBhaijaan2 font), the `#E53935` palette, `CARD_DEFAULTS`, Spanish category taxonomy (`businessCategories.ts`), and **`soycasero.com`** + the existing landing/privacy site.
- **The live Firestore data** — existing businesses/cards carry over; no migration if you stay on Firebase.

**Discard:** all RN UI (`src/screens/**`, `src/components/**`, `src/navigation/**` + React Navigation), iOS ATT (commit 2d00ad8), native build config (`eas.json`, `app.json`, `app.config.js`, plists, keystore scripts, `metro.config.js`), native deps (haptics/sensors/audio/notifications, `soundService.ts`, `notificationService.ts`, `api/send-push-notification.js` Expo push, native SSO SDKs, reanimated, gesture-handler, image-picker), and RN-only utils (`fontLoader.ts`, `platformStyles.ts`, `imageCache.ts`).

**Security note:** rotate the hardcoded Resend key in `send-welcome-email.js`, the Sentry DSN, and any Firebase fallbacks in `config/env.ts` before reuse.

---

## 6. Recommended tech architecture

**Stack (minimal, leverages what you have):**
- **Backend / system of record:** Firebase (Auth + Firestore + Storage) — keep it. Your model and rules are done.
- **API / pass services:** Node serverless functions on **Vercel**, alongside the existing `api/` folder, using `firebase-admin`.
- **Dashboard + registration + staff PWA:** A web frontend. Pragmatic choice: **Next.js on Vercel** (clean SSR, integrates with your existing Vercel pipeline) — or, to maximize reuse, react-native-web behind your existing webpack build. Next.js is the cleaner long-term bet.
- **Apple passes:** `passkit-generator` + `sharp` (image regen) + `http2`/`jsonwebtoken` for APNs (Phase 2). PassKit.com/Pass2U as the Phase-1 buy-option.
- **Google passes:** Wallet REST + `google-auth-library` (build in Phase 1).

**Components (build these):**
1. **Merchant dashboard** — business signup/login (reuse `authService`), create/edit a loyalty program (reuse `loyaltyCardService`), upload logo/colors/stamp icon, view customers & analytics.
2. **Customer registration page** — the per-customer web form LoyalzClub uses (nombre, apellido, teléfono, email, cumpleaños, consent checkboxes), reachable by **QR on the counter**. On submit: `joinLoyaltyProgram` → mint the wallet pass → show **both** "Añadir a Google Wallet" and "Add to Apple Wallet" buttons.
3. **Wallet pass service** (serverless) — Google: create class/object, sign thin JWT, serve Save link; Apple: build/sign `.pkpass`, host the PassKit web service, send APNs pushes.
4. **Staff scan PWA** — installable web app; staff logs in, scans the pass barcode *or* types the `cardCode`, calls the server stamp endpoint. **Move `addStamp`/`claimReward` server-side here** so the same call updates Firestore *and* triggers both wallet updates.
5. **Push/notify** — Google: `notifyPreference`/AddMessage; Apple: APNs. (Both stamp-tied, not a separate marketing blast yet.)

**MVP scope (ruthlessly cut):** one mechanic (**stamp/punch card only** — what cafés want), single location per business, Google Wallet first (Apple via buy-option or fast-follow), Spanish UI, WhatsApp-friendly share links. **No** referrals, automation sequences, multi-location, API, or segmentation in the MVP — those are Grow/Business-tier features you add once people pay.

---

## 7. Pricing & packaging for Bolivia

**Strategy: undercut LoyalzClub's USD prices meaningfully while pricing in BOB for local trust, and protect margin by keeping Google-first (free/cheap) costs low.** Your marginal cost per business is tiny (Google Wallet is free; hosting ~$25–75/mo total across all customers), so you can price aggressively without bleeding.

### Competitor price anchors (USD/mo)

| Product | Entry | Mid | Top |
|---|---|---|---|
| **LoyalzClub** (target to undercut) | $39 | $89 | $249 |
| Loopy Loyalty | $25 | $69 | $95 |
| Stamp Me | $29 | $49 | $119 |
| Loyicard (Spain/LatAm) | from €30 | — | — |
| FaveCard | $0 | $19 | — |
| Boomerangme (agency tier) | — | — | $199–299 |

### Proposed Soy Casero tiers

*(Official rate ~6.96 BOB/USD; BOB rounded to friendly local price points. A parallel/black-market rate trades above official, squeezing purchasing power — hence pricing low and offering BOB billing.)*

| Tier | BOB/month | ≈ USD/month | What's included | vs LoyalzClub |
|---|---|---|---|---|
| **Gratis** (acquisition wedge) | Bs 0 | $0 | 1 stamp card, 1 location, ~50 active cards, Google + Apple Wallet, "Soy Casero" badge on pass | LoyalzClub has no free tier |
| **Café** (entry) | **Bs 99** | **~$14** | Unlimited cards, 1 location, 1 stamp program, unlimited Google/Apple passes + stamp notifications, basic analytics | **64% under** Start ($39) |
| **Negocio** (most popular) | **Bs 249** | **~$36** | 3 programs, 3 locations, up to 10 staff seats, referrals, customer segments, WhatsApp share tools | **60% under** Grow ($89) |
| **Cadena** (multi-location) | **Bs 599** | **~$86** | 10 programs, 10 locations, 50 staff, automation, basic API/export | **65% under** Business ($249) |

**Annual:** offer ~2 months free (~17% off) to lock in cash and reduce churn-checking overhead — critical for a solo founder.

**Margin protection:** at Bs 99 (~$14) with near-zero marginal cost on Google Wallet, you keep nearly all of it. If you *buy* PassKit for the iOS minority, watch per-pass fees on long-lived loyalty cards — the one line item that could erode the Café tier. Bring Apple in-house once you scale to protect this.

### Bolivia payment-collection reality (the operational crux)

- **Stripe is out** for a Bolivia-registered business (confirmed: LatAm = Brazil + Mexico only). Mercado Pago is **doubtful** for a Bolivia-based merchant (its merchant eligibility list excludes Bolivia — treat as unavailable for collection).
- **Three viable paths, in order of recommendation:**
  1. **dLocal Go** (self-serve, *covers Bolivia*, **no setup/monthly fee**, per-transaction only, onboards in minutes, no legal entity required, supports local methods incl. cards/QR/Tigo Money). **Most likely answer** — confirm exact Bolivia methods, fees (LatAm card fees typically ~3.5–6%+, **unverified**), and settlement currency directly with dLocal.
  2. **Local QR / bank transfer (BCB QR, Tigo Money)** for domestic collection — Bolivia is QR-dominant and your SMEs already use it daily. Lowest customer friction, more manual reconciliation for you.
  3. **Form a US LLC (doola / Stripe Atlas) → use Stripe globally.** Most reliable processing, but real friction: LLC formation (~$50–300+), EIN, US bank account (Mercury/Wise — approval not guaranteed), annual US compliance (Form 5472/1120 penalties are steep), plus FX/repatriation cost. **Worth it later**, overkill for first customers.
- **Tax reality:** Bolivia has 13% IVA on SaaS with no exemption, monthly VAT returns, and **mandatory electronic invoicing (SFV)**. If you operate as a local **empresa unipersonal** (SEPREC matrícula ~Bs130 initial / ~Bs260 renewal — **verify**) you'll need a NIT and SFV invoicing. Confirm with a Bolivian tax advisor before billing.

**Practical first-customer collection:** start with **dLocal Go or direct QR/bank transfer + a manual SFV invoice.** Don't let payments-infrastructure perfectionism delay revenue — you can collect your first Bs 99 via QR the day the product works.

---

## 8. Go-to-market: landing the first 10 Bolivian SMEs (cafés first)

**Positioning (lead with this everywhere):** *"Tarjeta de sellos digital para tus clientes — sin que tengan que descargar otra app. Se guarda en su Google Wallet o Apple Wallet con solo escanear un QR."* The "no app to download" message kills the #1 objection before it's raised.

**Why cafés first:** repeat-visit business (stamp cards fit perfectly — Sede Café's "en tu novena visita el café va por SEDE"), visible counter for a QR, owner-operator who can say yes on the spot, tight community where word travels.

**The solo-founder playbook to 10 customers:**

1. **Validate before building more (this week).** Walk into 5–10 cafés in your city. Show LoyalzClub/Sede Café on your phone as the reference. Ask: "Would you pay ~Bs 99/month for this with your brand?" You need ~3 yeses to proceed. Highest-value activity in the entire plan.
2. **Pilot offer (irresistible for the first 5–10):** *"3 meses gratis, configuro tu tarjeta yo mismo, y si no te gusta no pagas nada."* You concierge-onboard them (build their program, their stamp icon, print their counter QR). Free pilot removes payment-collection friction during your riskiest phase and buys testimonials.
3. **Done-for-you setup** — as a solo technical founder your scarce resource is the merchant's time, not yours (yet). Hand them a printed QR table-tent and a one-page WhatsApp guide. They do nothing but scan customers.
4. **Referral loop, two levels:**
   - *Merchant→merchant:* "Refiere otro café y ambos obtienen 1 mes gratis." Cafés know other café owners.
   - *Built-in customer referral* (Phase 2 feature): the loyalty product itself becomes your growth engine.
5. **WhatsApp-native everything.** It's the de facto SME channel in LatAm (>98% open rate). Enrollment links, support, onboarding, invoices — all shareable via WhatsApp. Don't build a support portal; *be* a WhatsApp number.
6. **Local social proof.** Once Sede-style logos are live, post before/after ("Café X recuperó clientes con sellos digitales") on Instagram/TikTok in Spanish; tag the cafés.

**Target:** 10 cafés on free pilots in ~30 days → convert ~5+ to Bs 99–249 paid by end of pilot. Your proof the GTM works.

---

## 9. Phased roadmap (solo dev)

Each phase has a **verification checkpoint** — don't advance until it's green.

**Phase 0 — Validate (1–2 weeks).** No new code. 5–10 café conversations; secure 3 verbal pilot commitments; confirm dLocal Go covers Bolivia + the SFV/NIT path with a tax advisor; create Apple Developer ($99) and Google Cloud + Wallet Issuer accounts and **request Google publishing access immediately** (can take days–weeks — start the clock now).
> **Checkpoint:** ≥3 café owners say "yes, I'd pay" AND Google publishing-access request submitted. If you can't get 3 yeses, stop and rethink before building.

**Phase 1 — MVP to first paying customer (3–5 weeks).** Strip RN UI; stand up Next.js dashboard reusing your Firestore services; build the customer registration page; build the **Google Wallet** issue + PATCH-update path in-house; cover iOS via **PassKit/Pass2U buy-option** (or stub it); build the staff scan PWA; move `addStamp`/`claimReward` server-side; wire dLocal Go or QR collection.
> **Checkpoint:** A real café is live, real customers hold real Google Wallet passes, a stamp added in the PWA appears on a phone, AND at least one café has paid (even a discounted first month). The milestone that matters.

**Phase 2 — Harden + Apple in-house + first scale (4–6 weeks).** Bring **Apple Wallet in-house** (`passkit-generator` + APNs web service + image regen) to kill per-pass fees; add referrals (merchant + customer); add segmentation/basic analytics; polish onboarding so merchants can self-serve setup; set up annual cert-renewal reminders.
> **Checkpoint:** 5–10 paying customers; self-serve signup works without you holding their hand; both wallets update reliably on-device.

**Phase 3 — Grow the business (ongoing).** Multi-location (Cadena tier), automation/scheduled push, WhatsApp deeper integration, possibly the US-LLC + Stripe route as MRR justifies it, and consider a white-label/agency angle (the lever behind LoyalzClub's multi-country footprint) for expansion beyond Bolivia.
> **Checkpoint:** ~Bs 5,000+ MRR and churn under control (<5%/mo) before investing in expansion features.

---

## 10. Risks & how to de-risk

| Risk | Severity | De-risk |
|---|---|---|
| **Apple cert expires (~398d)** | High — silently breaks stamping for whole base | Calendar reminder 30 days out; back up the private key off the public server; monitor signing in production |
| **Google publishing-access delay/reject** | Medium — can stall go-live weeks | Request in Phase 0 *before* you need it; keep use-case clearly "loyalty"; have Apple/buy-option as fallback |
| **APNs JWT/HTTP2/throttle quirks** | Medium | Use HTTP/2 provider API, regenerate JWT hourly, exponential backoff on 429; treat updates as best-effort (Google is your reliable path anyway) |
| **Payment collection (no Stripe)** | High — commercial blocker if mishandled | dLocal Go or QR for domestic first; US-LLC later. Confirm dLocal Bolivia methods/fees directly |
| **FX crisis / parallel rate / card-restriction reversal** | Medium | Price and bill in **BOB** via local rails so you don't depend on international-card stability; treat USD pricing as reference only |
| **Churn (SMEs try, don't stick)** | High — kills SaaS unit economics | Concierge onboarding, annual billing, ensure end-customers actually get stamped (a dead card churns the merchant); track redemption rate as leading indicator |
| **Support load on a solo founder** | High | WhatsApp-only support, done-for-you setup, ruthless MVP scope, templated answers; don't ship features you can't support |
| **Single-founder / bus-factor** | High | Keep the stack boring and documented; lean on managed services (Firebase, Vercel, Google Wallet); keep buy-option as a fallback if in-house Apple becomes a maintenance burden |
| **Competitor (LoyalzClub) enters Bolivia harder** | Medium | Your moats are local: BOB pricing, Spanish + Bolivian-context onboarding, WhatsApp-native support, lower price, local presence/invoicing |

---

## 11. Immediate next 7–14 day action checklist

1. **Talk to 5–10 café owners** in your city. Show Sede Café/LoyalzClub as the reference. Ask the Bs 99/month question. Get ≥3 pilot commitments. *(This gates everything.)*
2. **Enroll in the Apple Developer Program** ($99/yr) and create a **Google Cloud project + Google Wallet Issuer account.**
3. **Submit Google "Request publishing access" now** — complete the Business Profile + payments profile + one demo Passes Class. Start the approval clock before you need it.
4. **Contact dLocal Go** to confirm Bolivia coverage, supported methods (cards/QR/Tigo Money), fees, settlement currency. In parallel, decide a QR/bank-transfer manual fallback for the very first invoice.
5. **Talk to a Bolivian tax advisor** about empresa unipersonal (SEPREC), NIT, 13% IVA, and mandatory SFV electronic invoicing — confirm the cheapest compliant way to bill.
6. **Spin up the pivot repo** from the existing codebase: delete `src/screens`, `src/navigation`, `src/components`, native config/deps; keep `src/services/*`, `src/types`, `firestore.rules`, `assets`, `api/`. Confirm the web build still runs.
7. **Rotate secrets** — the hardcoded Resend key in `send-welcome-email.js`, Sentry DSN, and any Firebase fallbacks in `config/env.ts`.
8. **Build a Google Wallet "Hello World"**: a script that creates a LoyaltyClass + LoyaltyObject and produces a working Save-to-Wallet link you can scan with your own Android phone. Proves the core mechanic end-to-end in an afternoon and is the foundation of Phase 1.
9. **Decide the iOS approach for launch** — Google-only at first (defensible at ~85%+ Android) vs. a quick PassKit/Pass2U buy-option for the iOS minority. Pick one; don't build in-house Apple yet.
10. **Draft the one-page Spanish pilot offer** ("3 meses gratis, yo te lo configuro") to hand to the cafés that said yes in step 1.

---

### Key sources (verified against primary docs)

- Apple PassKit / Wallet: `developer.apple.com/documentation/WalletPasses/adding-a-web-service-to-update-passes`, `/wallet/`
- Google Wallet loyalty: `developers.google.com/wallet/retail/loyalty-cards/web`, `/use-cases/jwt`, `/test-and-go-live/request-publishing-access`
- `passkit-generator`: `github.com/alexandercerutti/passkit-generator`
- Stripe global availability: `stripe.com/global` (LatAm = BR + MX only)
- dLocal Go coverage: `dlocalgo.com`, `helpcenter.dlocalgo.com`
- Bolivia OS share: `gs.statcounter.com/os-market-share/mobile/bolivia`
- Google Wallet Bolivia support: `support.google.com/wallet/answer/12060037`
- Competitor pricing: `loyalzclub.com`, `loopyloyalty.com`, `passkit.com/pricing/rates/`, `pass2u.net/pricing`

*Items marked "verify" rely on third-party or time-sensitive data and should be confirmed before you commit money.*
