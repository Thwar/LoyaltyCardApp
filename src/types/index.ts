export interface User {
  id: string;
  email: string;
  displayName: string;
  userType: "customer" | "business";
  createdAt: Date;
  profileImage?: string;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  city?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  categories?: string[]; // Up to 2 categories
  createdAt: Date;
  isActive: boolean;
}

export interface LoyaltyCard {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  totalSlots: number;
  rewardDescription: string;
  cardColor?: string;
  stampShape?: "circle" | "square" | "egg" | "triangle" | "diamond" | "star";
  backgroundImage?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface CustomerCard {
  id: string;
  customerId: string;
  loyaltyCardId: string;
  businessId: string; // Direct reference to business for efficient querying
  currentStamps: number;
  isRewardClaimed: boolean;
  createdAt: Date;
  lastStampDate?: Date;
  cardCode?: string; // 3-digit unique identifier for business-customer combination
  customerName?: string; // Customer's display name (populated from Users collection)
  // Virtual relationship fields (populated from other collections)
  loyaltyCard?: LoyaltyCard;
}

export interface Stamp {
  id: string;
  customerCardId: string;
  customerId: string;
  businessId: string;
  loyaltyCardId: string;
  timestamp: Date;
  note?: string;
}

export interface Reward {
  id: string;
  customerCardId: string;
  customerId: string;
  businessId: string;
  loyaltyCardId: string;
  claimedAt: Date;
  redeemedAt?: Date;
  isRedeemed: boolean;
  note?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface StampActivity {
  id: string;
  customerCardId: string;
  customerId: string;
  businessId: string;
  loyaltyCardId: string;
  timestamp: Date;
  customerName?: string;
  businessName?: string;
  stampCount: number; // The stamp count after this activity
  note?: string;
}

// Navigation types
export type RootStackParamList = {
  AuthStack: undefined;
  MainStack: undefined;
};

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type CustomerTabParamList = {
  Home: { refresh?: boolean; timestamp?: number } | undefined;
  Discovery: undefined;
  Profile: undefined;
};

export type BusinessTabParamList = {
  Dashboard: undefined;
  MyProgram: undefined;
  Customers: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: undefined;
  BusinessProfile: { businessId: string };
  CustomerCardDetails: { customerCard: CustomerCard };
  BusinessDiscovery: undefined;
};

export type BusinessStackParamList = {
  BusinessTabs: undefined;
  CustomerDetails: { customerId: string };
  AddStamp: { loyaltyCardId: string; businessId: string };
};
