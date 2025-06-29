import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { LoyaltyCard, CustomerCard } from "../types";
import { AnimatedLoyaltyCard } from "./AnimatedLoyaltyCard";

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
      <View style={styles.loyaltyCardHeader}>
        <View style={styles.loyaltyCardInfo}>
          <Text style={styles.cardReward}>🎫 {loyaltyCard.totalSlots} sellos para completar</Text>
        </View>
        {hasCard && (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.joinedText}>Unido</Text>
          </View>
        )}
      </View>
      {/* Card Preview */}
      <AnimatedLoyaltyCard
        card={loyaltyCard}
        currentStamps={hasCard && customerCard ? customerCard.currentStamps : 0}
        onPress={hasCard && customerCard ? () => onViewCard(customerCard) : undefined}
        showAnimation={false}
        cardCode={customerCard?.cardCode}
        enableTilt={false}
        style={styles.cardPreview}
      />
      {claimedRewardsCount > 0 && (
        <Text style={styles.claimedRewards}>
          🏆 {claimedRewardsCount} recompensa{claimedRewardsCount !== 1 ? "s" : ""} obtenida{claimedRewardsCount !== 1 ? "s" : ""}
        </Text>
      )}
      <View style={styles.loyaltyCardActions}>
        {hasCard ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.viewCardButton]}
            onPress={() => {
              if (customerCard) {
                console.log("🔄 Navigating to CustomerCardDetails for card:", customerCard);
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "#E3E8EF",
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
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
  claimedRewards: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: "500",
    marginBottom: SPACING.md,
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    minWidth: 140,
    justifyContent: "center",
    ...SHADOWS.small,
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
    marginHorizontal: 0,
  },
  cardReward: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
});
