import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { LoyaltyCard, CustomerCard } from "../types";

interface LoyaltyProgramItemProps {
  loyaltyCard: LoyaltyCard;
  hasCard: boolean;
  customerCard: CustomerCard | undefined;
  joiningCard: string | null;
  onJoinProgram: (loyaltyCard: LoyaltyCard) => void;
  onViewCard: (customerCard: CustomerCard) => void;
}

export const LoyaltyProgramItem: React.FC<LoyaltyProgramItemProps> = ({
  loyaltyCard,
  hasCard,
  customerCard,
  joiningCard,
  onJoinProgram,
  onViewCard,
}) => {
  return (
    <View style={styles.loyaltyCardItem}>
      <View style={styles.loyaltyCardHeader}>
        <View style={styles.loyaltyCardInfo}>
          <Text style={styles.loyaltyCardTitle}>Programa de Lealtad</Text>
          <Text style={styles.rewardDescription}>
            🎯 {loyaltyCard.rewardDescription}
          </Text>
          <Text style={styles.totalSlots}>
            🎫 {loyaltyCard.totalSlots} sellos para completar
          </Text>
        </View>
        {hasCard && (
          <View style={styles.joinedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
            />
            <Text style={styles.joinedText}>Unido</Text>
          </View>
        )}
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
            style={[
              styles.actionButton,
              styles.joinButton,
              joiningCard === loyaltyCard.id && styles.disabledButton,
            ]}
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
});
