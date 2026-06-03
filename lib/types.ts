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
} as const;

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
  broadcastMessage?: string; // (legacy) latest broadcast; messages are now per-customer (CustomerCard.broadcastMessage)
  broadcastHistory?: { message: string; at: number; count?: number; segment?: string }[]; // sent broadcasts (log + rate-limit source)
  broadcastRateResetAt?: number; // god-mode timer reset: ignore broadcasts at/before this for rate limiting
  createdAt?: number;
}

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
  welcomeMessage?: string; // shown/notified when a customer joins (customizable per card)
  cardColor: string;
  textColor?: string;
  stampShape?: StampShape; // stamp icon shape (paid plans); default circle
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
}
