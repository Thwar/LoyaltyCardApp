import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES } from "../constants";

export const FontTestScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.systemFont}>System Font (Segoe UI expected)</Text>
      <Text style={styles.customRegular}>BalooBhaijaan2 Regular</Text>
      <Text style={styles.customMedium}>BalooBhaijaan2 Medium</Text>
      <Text style={styles.customSemiBold}>BalooBhaijaan2 SemiBold</Text>
      <Text style={styles.customBold}>BalooBhaijaan2 Bold</Text>
      <Text style={styles.customExtraBold}>BalooBhaijaan2 ExtraBold</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
    justifyContent: "center",
  },
  systemFont: {
    fontSize: FONT_SIZES.lg,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  customRegular: {
    fontFamily: "BalooBhaijaan2-Regular",
    fontSize: FONT_SIZES.lg,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  customMedium: {
    fontFamily: "BalooBhaijaan2-Medium",
    fontSize: FONT_SIZES.lg,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  customSemiBold: {
    fontFamily: "BalooBhaijaan2-SemiBold",
    fontSize: FONT_SIZES.lg,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  customBold: {
    fontFamily: "BalooBhaijaan2-Bold",
    fontSize: FONT_SIZES.lg,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  customExtraBold: {
    fontFamily: "BalooBhaijaan2-ExtraBold",
    fontSize: FONT_SIZES.lg,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
});
