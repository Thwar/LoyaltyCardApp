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
  email?: string;
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
  stampDescription: string;
  cardColor?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface CustomerCard {
  id: string;
  customerId: string;
  loyaltyCardId: string;
  currentStamps: number;
  isRewardClaimed: boolean;
  createdAt: Date;
  lastStampDate?: Date;
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
  Home: undefined;
  MyCards: undefined;
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
  CardDetails: { customerCard: CustomerCard };
  BusinessProfile: { businessId: string };
  ClaimReward: { customerCard: CustomerCard };
};

export type BusinessStackParamList = {
  BusinessTabs: undefined;
  CreateCard: undefined;
  EditCard: { cardId: string };
  CustomerDetails: { customerId: string };
  AddStamp: { customerCardId: string };
};
