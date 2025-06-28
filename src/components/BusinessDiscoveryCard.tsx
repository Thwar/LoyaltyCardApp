import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { getCityLabel, formatCategories } from "../constants/businessCategories";
import { Business, LoyaltyCard, CustomerCard } from "../types";

interface BusinessWithCards extends Business {
  loyaltyCards: LoyaltyCard[];
  customerCards: CustomerCard[];
  claimedRewardsCount: { [loyaltyCardId: string]: number };
}

interface BusinessDiscoveryCardProps {
  business: BusinessWithCards;
  onPress: (business: BusinessWithCards) => void;
}

export const BusinessDiscoveryCard: React.FC<BusinessDiscoveryCardProps> = ({ business, onPress }) => {
  return (
    <TouchableOpacity style={styles.businessCard} onPress={() => onPress(business)}>
      <View style={styles.businessHeader}>
        <View style={styles.businessInfo}>
          <View style={styles.logoContainer}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="business" size={24} color={COLORS.gray} />
              </View>
            )}
          </View>
          <View style={styles.businessDetails}>
            <Text style={styles.businessName}>{business.name}</Text>
            {business.city && (
              <Text style={styles.businessCity}>
                <Ionicons name="location" size={14} color={COLORS.textSecondary} />
                {getCityLabel(business.city)}
              </Text>
            )}
            {business.categories && business.categories.length > 0 && <Text style={styles.businessCategories}>{formatCategories(business.categories)}</Text>}
            <Text style={styles.businessDescription} numberOfLines={2}>
              {business.description}
            </Text>
            {business.customerCards.length > 0 && (
              <View style={styles.memberBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.memberText}>
                  Miembro de {business.customerCards.length} programa
                  {business.customerCards.length > 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.businessActions}>
          {/* <View style={styles.loyaltyCardCount}>
            <Text style={styles.cardCountNumber}>{business.loyaltyCards.length}</Text>
            <Text style={styles.cardCountLabel}>{business.loyaltyCards.length === 1 ? "Programa" : "Programas"}</Text>
          </View> */}
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  businessCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOWS.small,
  },
  businessHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    minHeight: 80,
  },
  businessInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
  },
  logoContainer: {
    width: 80,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  logoPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  businessDetails: {
    flex: 1,
    marginLeft: SPACING.xs,
    padding: SPACING.md,
  },
  businessName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  businessCity: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  businessCategories: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontStyle: "italic",
  },
  businessDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  businessActions: {
    alignItems: "center",
    justifyContent: "center",

    padding: SPACING.sm,
  },
  loyaltyCardCount: {
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  cardCountNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  cardCountLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  memberText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: "600",
    marginLeft: 4,
  },
});
