// SoyCasero brand palette (carried over from the original app).
export const COLORS = {
  primary: "#E53935",
  primaryLight: "#EF5350",
  primaryDark: "#C62828",
  secondary: "#2C3E50",
  success: "#27AE60",
  warning: "#F39C12",
  error: "#E74C3C",
  white: "#FFFFFF",
  lightGray: "#F8F9FA",
  gray: "#95A5A6",
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  inputBorder: "#E9ECEF",
} as const;

// A short list of card colors a business owner can pick from (keeps setup simple).
export const CARD_COLOR_CHOICES = [
  "#E53935", // brand red
  "#2C3E50", // slate
  "#1E88E5", // blue
  "#43A047", // green
  "#8E24AA", // purple
  "#FB8C00", // orange
  "#000000", // black
] as const;

export const CARD_DEFAULTS = {
  MIN_SLOTS: 3,
  MAX_SLOTS: 20,
  DEFAULT_SLOTS: 9,
  DEFAULT_REWARD: "Tu novena compra gratis",
} as const;
