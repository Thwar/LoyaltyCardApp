import React from "react";
import { View, Image, StyleSheet, Text } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../constants";
import { getFontFamily } from "../utils/fontLoader";

interface LogoHeaderProps {
  title: string;
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({ title }) => {
  return (
    <View style={styles.container}>
      <Image source={require("../../assets/logo-simple.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.dash}> - </Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 56, // Standard header height
  },
  logo: {
    width: 100,
    height: 40,
  },
  dash: {
    fontSize: FONT_SIZES.lg,
    fontFamily: getFontFamily("semiBold"),
    fontWeight: "600",
    color: COLORS.white,
    marginHorizontal: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontFamily: getFontFamily("semiBold"),
    fontWeight: "600",
    color: COLORS.white,
  },
});
