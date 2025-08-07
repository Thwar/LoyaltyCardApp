import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Platform } from "react-native";
import { COLORS, FONT_SIZES } from "../constants";
import { useCustomFonts, getFontFamily } from "../utils/fontLoader";

export const FontTroubleshootingScreen = () => {
  const fontsLoaded = useCustomFonts();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.header}>🔍 Font Troubleshooting</Text>

        <Text style={styles.info}>Platform: {Platform.OS}</Text>
        <Text style={styles.info}>Fonts Loaded: {fontsLoaded ? "✅ Yes" : "❌ No"}</Text>

        <Text style={styles.sectionHeader}>System Font (Expected: Segoe UI on Windows)</Text>
        <Text style={[styles.testText, { fontFamily: undefined }]}>The quick brown fox jumps over the lazy dog - System Default</Text>

        <Text style={styles.sectionHeader}>BalooBhaijaan2 Fonts</Text>

        <Text style={styles.fontLabel}>Regular:</Text>
        <Text style={[styles.testText, { fontFamily: getFontFamily("regular") }]}>The quick brown fox - BalooBhaijaan2 Regular</Text>

        <Text style={styles.fontLabel}>Medium:</Text>
        <Text style={[styles.testText, { fontFamily: getFontFamily("medium") }]}>The quick brown fox - BalooBhaijaan2 Medium</Text>

        <Text style={styles.fontLabel}>SemiBold:</Text>
        <Text style={[styles.testText, { fontFamily: getFontFamily("semiBold") }]}>The quick brown fox - BalooBhaijaan2 SemiBold</Text>

        <Text style={styles.fontLabel}>Bold:</Text>
        <Text style={[styles.testText, { fontFamily: getFontFamily("bold") }]}>The quick brown fox - BalooBhaijaan2 Bold</Text>

        <Text style={styles.fontLabel}>ExtraBold:</Text>
        <Text style={[styles.testText, { fontFamily: getFontFamily("extraBold") }]}>The quick brown fox - BalooBhaijaan2 ExtraBold</Text>

        <Text style={styles.sectionHeader}>Raw Font Names (Direct)</Text>

        <Text style={[styles.testText, { fontFamily: "BalooBhaijaan2-Regular" }]}>Direct: BalooBhaijaan2-Regular</Text>

        <Text style={[styles.testText, { fontFamily: "BalooBhaijaan2-Bold" }]}>Direct: BalooBhaijaan2-Bold</Text>

        <Text style={styles.instructions}>
          📱 Testing Instructions:{"\n"}• On Web: Custom fonts may show as fallbacks{"\n"}• On Mobile: Should show BalooBhaijaan2{"\n"}• Check browser dev tools console for font loading logs{"\n"}•
          Try refreshing the app (Ctrl+R or r in terminal)
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    padding: 20,
  },
  header: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  info: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  fontLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 15,
    marginBottom: 5,
    fontWeight: "600",
  },
  testText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    marginBottom: 10,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  instructions: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    lineHeight: 20,
  },
});
