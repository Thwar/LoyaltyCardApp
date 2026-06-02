# Multi-card support (negocio plan) — plan

Goal: a business on the **negocio** plan can run more than one stamp card. A
customer is one **client** (per business + email); each card they join is a
**membership**. Same email = same client — never a duplicate person.

## Data model decisions
- **Client = a person**, identified by `(businessId, customerEmail)`, linked
  across cards by a shared `customerId` (+ reused name/phone/consent).
- **Membership = a `customerCards` doc** (one per card). Each carries its own
  stamps, `cardCode`, and wallet pass (Apple serial / Google object = the
  membership doc id). This is required — every card needs its own pass + counter.
- **Card codes stay unique per business** (not per card). That's what lets the
  single "Sumar un sello" box resolve any card from a bare code — keep it.
  Codes auto-grow in length as a business fills the 3-digit space.
- **Consent is client-level** (sticky): once opted in, it carries to new cards.

## Step 1 — DONE (backend foundation)
- `enroll`: same email → reuse client (shared `customerId` + identity); dedupe
  per `(business, email, loyaltyCard)`; a new card adds a membership, not a
  duplicate client. (`app/api/enroll/route.ts`)
- `getLoyaltyCardsByBusiness` returns all cards; `business/me` now returns
  `cards[]` (plus `card` = primary, for the current UI). (`lib/serverData.ts`,
  `app/api/business/me/route.ts`)
- `customerId` repurposed as the shared client id (was an unused random UUID).

## Step 2 — TODO (creation + UI)
- `POST /api/business/card`: allow creating **additional** cards when
  `plan === "negocio"` and under `maxCards`; today it upserts a single card.
  (`app/api/business/card/route.ts` — "POC keeps it to one card")
- Dashboard **Tarjetas** tab: consume `cards[]` — list all cards, per-card
  edit + QR + activate/deactivate. Enable the "＋ Nueva tarjeta" tile for
  negocio (gate by `maxCards`); keep it disabled (upsell) otherwise.
- Stamping: the single box already works (business-unique codes) — no change.

## Step 3 — TODO (analytics + normalization)
- `business/me`: `count` should be **distinct clients** (by `customerId`), not
  membership rows, so multi-card doesn't inflate the client count / free limit.
- **Clientes recientes**: group by client (one person, showing their N cards)
  instead of one row per membership.
- Per-card stats (stamps/completions per card) + a card filter on Resumen.
- (Optional) Promote to a dedicated `customers` collection (single client doc;
  strip the identity snapshot off memberships; readers join). Restores the
  original normalized schema intent. Today consent re-opt-in only updates the
  re-enrolled card's snapshot — normalization fixes that.
