import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { LoyaltyCard, CustomerCard } from "../types";
import { StampsGrid } from "./StampsGrid";

interface LoyaltyProgramItemProps {
  loyaltyCard: LoyaltyCard;
  hasCard: boolean;
  customerCard: CustomerCard | undefined;
  claimedRewardsCount: number;
  joiningCard: string | null;
  onJoinProgram: (loyaltyCard: LoyaltyCard) => void;
  onViewCard: (customerCard: CustomerCard) => void;
}

export const LoyaltyProgramItem: React.FC<LoyaltyProgramItemProps> = ({ loyaltyCard, hasCard, customerCard, claimedRewardsCount, joiningCard, onJoinProgram, onViewCard }) => {
  return (
    <View style={styles.loyaltyCardItem}>
      {" "}
      <View style={styles.loyaltyCardHeader}>
        <View style={styles.loyaltyCardInfo}>
          <Text style={styles.totalSlots}>🎫 {loyaltyCard.totalSlots} sellos para completar</Text>
          {claimedRewardsCount > 0 && (
            <Text style={styles.claimedRewards}>
              🏆 {claimedRewardsCount} recompensa{claimedRewardsCount !== 1 ? "s" : ""} obtenida{claimedRewardsCount !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
        {hasCard && (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.joinedText}>Unido</Text>
          </View>
        )}
      </View>
      {/* Card Preview */}
      <View style={styles.cardPreview}>
        <LinearGradient
          colors={[loyaltyCard.cardColor || COLORS.primary, loyaltyCard.cardColor ? `${loyaltyCard.cardColor}CC` : COLORS.primaryDark]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardReward}>🎯 Recompensa: {loyaltyCard.rewardDescription}</Text>
          </View>
          <StampsGrid
            totalSlots={loyaltyCard.totalSlots}
            currentStamps={hasCard && customerCard ? customerCard.currentStamps : 0}
            stampShape={loyaltyCard.stampShape || "circle"}
            showAnimation={false}
            size={loyaltyCard.totalSlots >= 7 ? "medium" : "large"}
            stampColor={loyaltyCard.cardColor || COLORS.primary}
            specialStampColor="white"
            containerStyle={styles.stampsContainer}
          />
        </LinearGradient>
      </View>
      <View style={styles.loyaltyCardActions}>
        {hasCard ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.viewCardButton]}
            onPress={() => {
              if (customerCard) {
                onViewCard(customerCard);
              }
            }}
          >
            <Ionicons name="card" size={16} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Ver Mi Tarjeta</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton, joiningCard === loyaltyCard.id && styles.disabledButton]}
            onPress={() => onJoinProgram(loyaltyCard)}
            disabled={joiningCard === loyaltyCard.id}
          >
            {joiningCard === loyaltyCard.id ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.loadingText}>Uniéndose...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Unirse al Programa</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loyaltyCardItem: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  loyaltyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  loyaltyCardInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  loyaltyCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  rewardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  totalSlots: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  claimedRewards: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: "500",
    marginTop: SPACING.xs,
  },
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  joinedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: "600",
    marginLeft: SPACING.xs,
  },
  loyaltyCardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: "center",
  },
  viewCardButton: {
    backgroundColor: COLORS.primary,
  },
  joinButton: {
    backgroundColor: COLORS.secondary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: SPACING.xs,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: SPACING.xs,
  },
  cardPreview: {
    marginBottom: SPACING.md,
  },
  cardGradient: {
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 120,
  },
  cardHeader: {
    marginBottom: SPACING.sm,
  },
  cardBusinessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardReward: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  stampsContainer: {
    flex: 1,
    marginTop: SPACING.xs,
  },
});
