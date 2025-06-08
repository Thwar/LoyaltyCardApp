import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { LoyaltyCard as LoyaltyCardType } from "../types";

interface LoyaltyCardProps {
  card: LoyaltyCardType;
  currentStamps?: number;
  onPress?: () => void;
  style?: any;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ card, currentStamps = 0, onPress, style }) => {
  const progress = Math.min(currentStamps / card.totalSlots, 1);
  const isCompleted = currentStamps >= card.totalSlots;

  const renderStamps = () => {
    const stamps = [];
    for (let i = 0; i < card.totalSlots; i++) {
      const isStamped = i < currentStamps;
      stamps.push(
        <View key={i} style={[styles.stamp, isStamped ? styles.stampFilled : styles.stampEmpty]}>
          <Text style={[styles.stampText, isStamped ? styles.stampTextFilled : styles.stampTextEmpty]}>{isStamped ? "✓" : ""}</Text>
        </View>
      );
    }
    return stamps;
  };

  const CardContent = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.businessName} numberOfLines={1}>
          {card.businessName}
        </Text>
        <Text style={styles.progress}>
          {currentStamps}/{card.totalSlots}
        </Text>
      </View>
      {/* Stamp Description */}
      <Text style={styles.stampDescription} numberOfLines={2}>
        {card.stampDescription}
      </Text>
      {/* Stamps Grid */}
      <View style={styles.stampsContainer}>
        <View style={styles.stampsGrid}>{renderStamps()}</View>
      </View>
      {/* Reward Description */}
      <View style={styles.rewardContainer}>
        <Text style={styles.rewardLabel}>Recompensa:</Text>
        <Text style={styles.rewardDescription} numberOfLines={2}>
          {card.rewardDescription}
        </Text>
      </View>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
        {isCompleted && <Text style={styles.completedText}>¡Listo para Reclamar!</Text>}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.cardWrapper, style]} onPress={onPress}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <CardContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.cardWrapper, style]}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <CardContent />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  gradient: {
    borderRadius: 16,
    padding: SPACING.lg,
  },
  container: {
    minHeight: 200,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    flex: 1,
  },
  progress: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stampDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.md,
  },
  stampsContainer: {
    marginBottom: SPACING.md,
  },
  stampsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  stamp: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stampEmpty: {
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "transparent",
  },
  stampFilled: {
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  stampText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
  },
  stampTextEmpty: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  stampTextFilled: {
    color: COLORS.primary,
  },
  rewardContainer: {
    marginBottom: SPACING.md,
  },
  rewardLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  progressBarContainer: {
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  completedText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
});
