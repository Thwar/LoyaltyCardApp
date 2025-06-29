import { Platform, ViewStyle, TextStyle } from "react-native";

interface ShadowProps {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

interface WebShadowProps {
  boxShadow?: string;
}

interface TextShadowProps {
  textShadowColor?: string;
  textShadowOffset?: { width: number; height: number };
  textShadowRadius?: number;
}

interface WebTextShadowProps {
  textShadow?: string;
}

/**
 * Creates platform-specific shadow styles
 * On web, uses boxShadow CSS property
 * On native, uses React Native shadow properties
 */
export const createShadowStyle = (props: ShadowProps): ViewStyle => {
  if (Platform.OS === "web") {
    const { shadowColor = "#000", shadowOffset = { width: 0, height: 2 }, shadowOpacity = 0.25, shadowRadius = 3.84 } = props;

    // Convert RGBA color if needed
    let color = shadowColor;
    if (shadowColor.startsWith("#")) {
      // Convert hex to rgba
      const hex = shadowColor.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      color = `rgba(${r}, ${g}, ${b}, ${shadowOpacity})`;
    } else if (shadowColor.includes("rgba")) {
      // Use as is but apply opacity
      color = shadowColor.replace(/[\d\.]+\)$/g, `${shadowOpacity})`);
    }

    return {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px ${color}`,
    } as ViewStyle;
  }

  return props;
};

/**
 * Creates platform-specific text shadow styles
 * On web, uses textShadow CSS property
 * On native, uses React Native textShadow properties
 */
export const createTextShadowStyle = (props: TextShadowProps): TextStyle => {
  if (Platform.OS === "web") {
    const { textShadowColor = "rgba(0, 0, 0, 0.5)", textShadowOffset = { width: 1, height: 1 }, textShadowRadius = 2 } = props;

    return {
      textShadow: `${textShadowOffset.width}px ${textShadowOffset.height}px ${textShadowRadius}px ${textShadowColor}`,
    } as TextStyle;
  }

  return props;
};
