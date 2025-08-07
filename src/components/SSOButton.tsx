import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

interface SSOButtonProps {
  provider: "google" | "facebook";
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SSOButton: React.FC<SSOButtonProps> = ({ provider, onPress, loading = false, disabled = false, style }) => {
  const getButtonConfig = () => {
    switch (provider) {
      case "google":
        return {
          backgroundColor: "#FFFFFF",
          borderColor: "#DADCE0",
          textColor: "#3C4043",
          icon: "logo-google" as keyof typeof Ionicons.glyphMap,
          text: "Continuar con Google",
        };
      case "facebook":
        return {
          backgroundColor: "#1877F2",
          borderColor: "#1877F2",
          textColor: "#FFFFFF",
          icon: "logo-facebook" as keyof typeof Ionicons.glyphMap,
          text: "Continuar con Facebook",
        };
      default:
        return {
          backgroundColor: "#FFFFFF",
          borderColor: "#DADCE0",
          textColor: "#3C4043",
          icon: "logo-google" as keyof typeof Ionicons.glyphMap,
          text: "Continuar",
        };
    }
  };

  const config = getButtonConfig();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Ionicons name={config.icon} size={20} color={config.textColor} style={styles.icon} />
        <Text style={[styles.text, { color: config.textColor }]}>{loading ? "Iniciando sesión..." : config.text}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: SPACING.sm,
  },
  text: {
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default SSOButton;
