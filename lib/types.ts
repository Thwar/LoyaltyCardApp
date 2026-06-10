// Data model — carried over from the original app's Firestore collections.
// Customers no longer need an account (wallet-only), so CustomerCard holds
// the customer's contact info directly instead of pointing at a Users doc.

export const COLLECTIONS = {
  USERS: "users",
  BUSINESSES: "businesses",
  LOYALTY_CARDS: "loyaltyCards",
  CUSTOMER_CARDS: "customerCards",
  STAMPS: "stamps",
  REWARDS: "rewards",
  APPLE_REGISTRATIONS: "appleRegistrations",
  STAFF: "staff",
  // Memberships (VIP / club cards) — a parallel structure to loyalty, for
  // gyms, clubs, and member-only businesses. Managed separately from stamp cards.
  MEMBERSHIP_PROGRAMS: "membershipPrograms", // the card template (≤1 per business in V1)
  MEMBERS: "members", // an enrolled member (status, expiry, visits)
  VISITS: "visits", // attendance/usage log (analogous to stamps)
} as const;

// A cajero (cashier): a limited login that can only add stamps for one business.
export interface Staff {
  uid: string; // Firebase Auth uid
  businessId: string;
  name: string;
  email: string;
  role: "cajero";
  createdAt?: number;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string; // owner's full name (collected at signup)
  ownerPhone?: string; // owner's cellphone incl. country code (collected at signup)
  logoUrl?: string;
  logoPng?: string; // business brand logo (base64 PNG) — default for passes when a card has none
  description?: string; // short business description, shown on the wallet pass
  // Subscription tier. Absent/"gratis" = free; "cafe"/"negocio" unlock paid
  // features (e.g. seeing customer contact info). Set in god mode (no billing yet).
  plan?: "gratis" | "cafe" | "negocio";
  // Paid-plan expiry (ms epoch). Once past, the plan reverts to free (see
  // effectivePlan). null/absent = no expiry. Set in god mode (e.g. cash for 3 months).
  planExpiresAt?: number | null;
  broadcastHistory?: { message: string; at: number; count?: number; segment?: string }[]; // sent broadcasts (log + rate-limit source)
  broadcastRateResetAt?: number; // god-mode timer reset: ignore broadcasts at/before this for rate limiting
  createdAt?: number;
}

// The scannable code printed on the wallet pass (staff scans it to add stamps).
export type BarcodeType = "pdf417" | "qr";

export type StampShape =
  | "circle" | "square" | "star" | "diamond" | "heart" // geometric
  | "coffee" | "beer" | "wine" | "pizza" | "burger" | "icecream" | "cookie" | "bread" // food & drink
  | "scissors" | "paw" | "gift" | "bag" | "tag" | "leaf"; // services & retail

export interface LoyaltyCard {
  id: string;
  businessId: string;
  businessName: string;
  totalSlots: number;
  rewardDescription: string;
  welcomeMessage?: string; // shown/notified when a customer joins (customizable per card; all plans)
  // Custom wallet notification templates (paid plans). Tokens {sellos}/{total}.
  // Empty/absent → the default template in lib/notifications.ts is used.
  stampMessage?: string; // sent on each new stamp
  completeMessage?: string; // sent when the card fills up
  redeemMessage?: string; // sent when the reward is redeemed
  cardColor: string;
  textColor?: string;
  stampShape?: StampShape; // stamp icon shape (paid plans); default circle
  barcodeType?: BarcodeType; // code on the pass: pdf417 (barras, default) or qr
  logoPng?: string; // optional business logo (base64 PNG), shown instead of the name
  isActive: boolean;
  createdAt?: number;
  deletedAt?: number; // soft-deleted by the owner: hidden from the dashboard, but kept (voided) so customers' passes keep rendering greyed
}

export interface CustomerCard {
  id: string;
  loyaltyCardId: string;
  businessId: string;
  customerId: string; // shared client id per (business, email): links one person's multiple cards. Not an auth account.
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  currentStamps: number;
  isRewardClaimed: boolean;
  rewardsRedeemed?: number; // how many times the reward has been claimed (shown on the pass)
  cardCode: string; // short numeric code shown on the pass / typed by staff
  googleObjectId?: string; // Google Wallet object id, once issued
  appleUpdatedTag?: number; // bumped on each change so Apple Wallet knows to refresh
  passActive?: boolean; // true while the pass is on at least one device
  passRemovedAt?: number | null; // set when the customer removes the pass from Wallet
  welcomeNotified?: boolean; // Apple: welcome notification sent on first device registration
  createdAt?: number;
  lastStampDate?: number;
  marketingConsent?: boolean; // opted in (join-form checkbox) to share contact info for marketing
  referredBy?: string; // the customerCard id that referred this customer (referral program)
  referralRewarded?: boolean; // true once the referrer was paid out (on this customer's first real stamp)
  referralCount?: number; // how many new customers this customer has referred
  broadcastMessage?: string; // latest marketing broadcast targeted at THIS customer (rendered on the pass)
  lastEvent?: string; // latest stamp/complete/redeem notification text (drives the Apple Wallet lock-screen message)
}

// ---------- Memberships (VIP / club cards) — V1: simple member pass ----------
// Reserved for Phase 2 (tiered memberships). Unused in V1.
export type MembershipTier = string;

// The membership card template for a business (≤1 in V1; Franquicia plan = 3 later).
export interface MembershipProgram {
  id: string;
  businessId: string;
  name: string; // card title, e.g. "Membresía VIP" or "Socio Gimnasio Fit"
  description?: string; // benefits / details, shown on the back of the pass
  cardColor: string;
  textColor?: string;
  logoPng?: string; // optional logo (base64 PNG); falls back to the business logo
  // Visit/usage tracking is configurable per program (V1 answer): when on, each
  // member gets a visit allowance that counts down on scan; when off, the card is
  // unlimited access (a pure active/expired club pass).
  tracksVisits: boolean;
  defaultVisitLimit?: number | null; // applied at enrollment when tracksVisits; null = unlimited
  defaultDurationDays?: number | null; // membership length; sets expiresAt = join + N days. null/0 = no expiration
  welcomeMessage?: string; // notification when a member joins
  isActive: boolean;
  createdAt?: number;
  deletedAt?: number; // soft-deleted: hidden from the dashboard, members' passes render voided
}

// An enrolled member of a program.
export interface Member {
  id: string;
  programId: string;
  businessId: string;
  memberPersonId: string; // shared id per (business, email): one person, one membership. Not an auth account.
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  memberCode: string; // short numeric code shown on the pass / typed/scanned by staff
  expiresAt?: number | null; // membership expiry (ms epoch); null/absent = never expires. Owner sets/extends (offline fees).
  visitLimit?: number | null; // visits allowed (null = unlimited). Copied from the program at enrollment, editable per member.
  visitsUsed: number; // visits logged so far
  tier?: MembershipTier; // reserved for Phase 2
  googleObjectId?: string; // Google Wallet object id, once issued
  appleUpdatedTag?: number; // bumped on each change so Apple Wallet refreshes
  passActive?: boolean; // true while the pass is on at least one device
  passRemovedAt?: number | null;
  welcomeNotified?: boolean; // Apple: welcome notification sent on first device registration
  lastEvent?: string; // latest notification text (drives the Apple lock-screen message)
  lastVisitDate?: number;
  marketingConsent?: boolean;
  createdAt?: number;
  // Audit log of membership lifecycle events (joined, renewed, reset, (de)activated).
  history?: MemberEvent[];
}

export interface MemberEvent {
  t: number; // ms epoch
  kind: "created" | "renewed" | "reset" | "deactivated";
  days?: number; // for "renewed": how many days added
  until?: number | null; // for "renewed": the resulting expiry
}

// A single visit/usage event (attendance log; analogous to a stamp).
export interface Visit {
  id: string;
  memberId: string; // the Member doc id
  businessId: string;
  programId: string;
  timestamp: number;
  by?: string; // uid of the owner/cajero who logged it
}
