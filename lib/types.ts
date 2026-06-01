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
  logoUrl?: string;
  createdAt?: number;
}

export interface LoyaltyCard {
  id: string;
  businessId: string;
  businessName: string;
  totalSlots: number;
  rewardDescription: string;
  cardColor: string;
  textColor?: string;
  logoPng?: string; // optional business logo (base64 PNG), shown instead of the name
  isActive: boolean;
  createdAt?: number;
}

export interface CustomerCard {
  id: string;
  loyaltyCardId: string;
  businessId: string;
  customerId: string; // generated id (no auth account for customers)
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
  createdAt?: number;
  lastStampDate?: number;
}
