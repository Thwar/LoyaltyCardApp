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

## Step 2 — DONE (creation + UI)
- `POST /api/business/card`: `cardId` present → edit that card; absent → create a
  new one, gated by `effectivePlan(business).maxCards` (403 over the limit). Edit
  no longer resets `isActive`.
- `POST /api/business/deactivate`: takes a `cardId` (per-card); falls back to the
  business's only card. Pushes both wallets (each pass rebuilds from its own card,
  so a business-wide push correctly greys only the toggled card).
- Dashboard **Tarjetas** tab: one `CardPanel` per card (preview, edit, its own QR,
  activate/deactivate) + a `NewCardTile` enabled when `cards.length < maxCards`.
  Resumen uses per-card slots (`cardsById`); `CardManager` now takes `business` +
  `cards[]`.
- Stamping unchanged (business-unique codes resolve any card).
- Gating is config-driven: any plan with `maxCards > current` can add (Café 3 /
  Negocio 10 / Gratis 1). Set Café `maxCards: 1` in `lib/plans.ts` for
  negocio-only multi-card.

## Step 3 — DONE (analytics); normalization still optional
- `business/me`: `count` is now **distinct clients** (by `customerId`), so a person
  with multiple cards counts once (the "Clientes" stat + the free-tier limit).
- **Clientes recientes** is grouped by person (`groupClients`); a `ClientModal`
  shows their identity, client-level contact, and all their cards. Consent is
  client-level (any opt-in counts) — this also smooths the per-card snapshot drift.
- **Per-card filter** on Resumen scopes the stat cards + recent list to one card
  (shown only when a business has >1 card); the client-limit bar stays business-wide.

### Still optional (not done)
- Promote to a dedicated `customers` collection (single client doc; strip the
  identity snapshot off memberships; readers + wallet issuance join). Restores the
  fully normalized schema. It's a bigger migration; the denormalized model works
  today and the consent drift is already handled in `groupClients`, so low priority.
