export const COLORS = {
  // Primary brand color (darker red as requested)
  primary: "#8B1538",
  primaryLight: "#B91C47",
  primaryDark: "#6B0E29",

  // Secondary colors
  secondary: "#2C3E50",
  secondaryLight: "#34495E",

  // Status colors
  success: "#27AE60",
  warning: "#F39C12",
  error: "#E74C3C",
  info: "#3498DB",

  // Neutral colors
  white: "#FFFFFF",
  lightGray: "#F8F9FA",
  gray: "#95A5A6",
  darkGray: "#7F8C8D",
  black: "#2C3E50",

  // Background colors
  background: "#FFFFFF",
  surface: "#F8F9FA",

  // Text colors
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  textLight: "#BDC3C7",

  // Card colors
  cardBackground: "#FFFFFF",
  cardShadow: "rgba(0, 0, 0, 0.1)",

  // Button colors
  buttonPrimary: "#8B1538",
  buttonSecondary: "#95A5A6",
  buttonDisabled: "#BDC3C7",

  // Input colors
  inputBackground: "#F8F9FA",
  inputBorder: "#E9ECEF",
  inputFocus: "#8B1538",

  // Tab colors
  tabActive: "#8B1538",
  tabInactive: "#95A5A6",

  // Stamp colors for loyalty cards
  stampFilled: "#8B1538",
  stampEmpty: "#E9ECEF",
  stampBorder: "#BDC3C7",
} as const;

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
} as const;

export const FONT_WEIGHTS = {
  light: "300",
  normal: "400",
  medium: "500",
  semiBold: "600",
  bold: "700",
} as const;

export const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
} as const;

export const FIREBASE_COLLECTIONS = {
  USERS: "users",
  BUSINESSES: "businesses",
  LOYALTY_CARDS: "loyaltyCards",
  CUSTOMER_CARDS: "customerCards",
  STAMPS: "stamps",
  REWARDS: "rewards",
} as const;

export const USER_TYPES = {
  CUSTOMER: "customer",
  BUSINESS: "business",
} as const;

export const CARD_DEFAULTS = {
  MIN_SLOTS: 3,
  MAX_SLOTS: 20,
  DEFAULT_SLOTS: 10,
  DEFAULT_STAMP_DESCRIPTION: "Purchase",
  DEFAULT_REWARD_DESCRIPTION: "Get your next purchase free!",
} as const;

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 6,
  BUSINESS_NAME_MIN_LENGTH: 2,
  BUSINESS_NAME_MAX_LENGTH: 50,
  REWARD_DESCRIPTION_MAX_LENGTH: 200,
  STAMP_DESCRIPTION_MAX_LENGTH: 50,
} as const;
