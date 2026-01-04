import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

export const BusinessDiscoveryEmptyState: React.FC = () => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.iconContainer}>
        <Ionicons name="storefront-outline" size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No hay programas disponibles</Text>
      <Text style={styles.emptyMessage}>
        En este momento no hay negocios con programas de lealtad activos. ¡Vuelve
        pronto para descubrir nuevas oportunidades de recompensas!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
});
