import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { getFontFamily } from "../utils/fontLoader";
import { COLORS, FONT_SIZES } from "../constants";

interface TypographyProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "body1" | "body2" | "caption" | "button";
  weight?: "regular" | "medium" | "semiBold" | "bold" | "extraBold";
  color?: string;
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({ variant = "body1", weight = "regular", color = COLORS.textPrimary, style, children, ...props }) => {
  const getVariantStyle = (): TextStyle => {
    let fontFamily: string;

    switch (variant) {
      case "h1":
        fontFamily = getFontFamily("bold");
        return {
          fontSize: FONT_SIZES.xxxl,
          fontFamily,
          lineHeight: FONT_SIZES.xxxl * 1.2,
        };
      case "h2":
        fontFamily = getFontFamily("semiBold");
        return {
          fontSize: FONT_SIZES.xxl,
          fontFamily,
          lineHeight: FONT_SIZES.xxl * 1.2,
        };
      case "h3":
        fontFamily = getFontFamily("semiBold");
        return {
          fontSize: FONT_SIZES.xl,
          fontFamily,
          lineHeight: FONT_SIZES.xl * 1.2,
        };
      case "body1":
        fontFamily = getFontFamily(weight);
        return {
          fontSize: FONT_SIZES.md,
          fontFamily,
          lineHeight: FONT_SIZES.md * 1.4,
        };
      case "body2":
        fontFamily = getFontFamily(weight);
        return {
          fontSize: FONT_SIZES.sm,
          fontFamily,
          lineHeight: FONT_SIZES.sm * 1.4,
        };
      case "caption":
        fontFamily = getFontFamily(weight);
        return {
          fontSize: FONT_SIZES.xs,
          fontFamily,
          lineHeight: FONT_SIZES.xs * 1.3,
        };
      case "button":
        fontFamily = getFontFamily("semiBold");
        return {
          fontSize: FONT_SIZES.md,
          fontFamily,
          lineHeight: FONT_SIZES.md * 1.2,
        };
      default:
        fontFamily = getFontFamily(weight);
        return {
          fontSize: FONT_SIZES.md,
          fontFamily,
          lineHeight: FONT_SIZES.md * 1.4,
        };
    }
  };

  const variantStyle = getVariantStyle();

  // Debug logging (remove in production)
  if (__DEV__) {
    console.log(`Typography ${variant} using font: ${variantStyle.fontFamily}`);
  }

  return (
    <Text style={[variantStyle, { color }, style]} {...props}>
      {children}
    </Text>
  );
};
