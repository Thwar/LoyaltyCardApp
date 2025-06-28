import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { StampsGrid } from "./StampsGrid";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

interface LoyaltyCardPreviewProps {
  businessName?: string;
  totalSlots: number;
  currentStamps?: number;
  cardColor: string;
  stampShape: "circle" | "square" | "egg" | "triangle" | "diamond" | "star";
  rewardDescription: string;
  showTitle?: boolean;
  containerStyle?: ViewStyle;
  size?: "small" | "normal";
}

export const LoyaltyCardPreview: React.FC<LoyaltyCardPreviewProps> = ({
  businessName = "Nombre de Tu Negocio",
  totalSlots,
  currentStamps = 1,
  cardColor,
  stampShape,
  rewardDescription,
  showTitle = true,
  containerStyle,
  size = "normal",
}) => {
  const isSmall = size === "small";

  return (
    <View style={[styles.previewContainer, containerStyle]}>
      {showTitle && <Text style={styles.previewTitle}>Vista Previa</Text>}
      <View style={styles.previewCard}>
        <LinearGradient colors={[cardColor || COLORS.primary, cardColor ? `${cardColor}CC` : COLORS.primaryDark]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={[styles.previewBusinessName, isSmall && styles.previewBusinessNameSmall]}>{businessName}</Text>
          <Text style={[styles.previewStamps, isSmall && styles.previewStampsSmall]}>
            {currentStamps} / {totalSlots} sellos
          </Text>
          <StampsGrid
            totalSlots={totalSlots}
            currentStamps={currentStamps}
            stampShape={stampShape}
            showAnimation={false}
            size={isSmall ? "small" : undefined}
            stampColor={cardColor || COLORS.primary}
            containerStyle={styles.previewStampsContainer}
          />
          <Text style={[styles.previewReward, isSmall && styles.previewRewardSmall]}>🎯 Recompensa: {rewardDescription || "Descripción de tu recompensa"}</Text>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    marginVertical: SPACING.lg,
  },
  previewTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  previewCard: {
    borderRadius: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: "hidden",
    // Add subtle border to enhance the card edge
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    // Transform for subtle 3D perspective
    transform: [{ perspective: 1000 }, { rotateX: "2deg" }, { rotateY: "-1deg" }],
  },
  gradient: {
    borderRadius: 12,
    padding: SPACING.lg,
    // Add inner shadow effect
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    // Subtle inner border highlight
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  previewBusinessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  previewBusinessNameSmall: {
    fontSize: FONT_SIZES.md,
  },
  previewStamps: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  previewStampsSmall: {
    fontSize: FONT_SIZES.sm,
  },
  previewStampsContainer: {
    marginBottom: SPACING.sm,
  },
  previewReward: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    textAlign: "center",
    marginTop: SPACING.sm,
    fontStyle: "italic",
  },
  previewRewardSmall: {
    fontSize: FONT_SIZES.sm,
  },
});
