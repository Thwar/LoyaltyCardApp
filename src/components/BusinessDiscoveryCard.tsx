import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { getCityLabel, formatCategories } from "../constants/businessCategories";
import { Business, LoyaltyCard, CustomerCard } from "../types";

export interface BusinessWithCards extends Business {
  loyaltyCards: LoyaltyCard[];
  customerCards: CustomerCard[];
  claimedRewardsCount: { [loyaltyCardId: string]: number };
}

interface BusinessDiscoveryCardProps {
  business: BusinessWithCards;
  onPress: (business: BusinessWithCards) => void;
}

export const BusinessDiscoveryCard: React.FC<BusinessDiscoveryCardProps> = ({
  business,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(business)}
      activeOpacity={0.9}
    >
      <View style={styles.contentContainer}>
        {/* Left Side: Logo */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoContainer}>
            {business.logoUrl ? (
              <Image source={{ uri: business.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="business" size={28} color={COLORS.gray} />
              </View>
            )}
          </View>
        </View>

        {/* Right Side: Content */}
        <View style={styles.infoContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.businessName} numberOfLines={1}>
                {business.name}
                </Text>
                 {business.customerCards.length > 0 && (
                    <View style={styles.memberBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.memberText}>Miembro</Text>
                    </View>
                )}
            </View>
          

          <View style={styles.metaRow}>
            {business.city && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="location-sharp"
                  size={12}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.metaText}>{getCityLabel(business.city)}</Text>
              </View>
            )}
            {business.categories && business.categories.length > 0 && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {formatCategories(business.categories)}
                </Text>
              </>
            )}
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {business.description}
          </Text>

         
        </View>

        {/* Arrow Icon */}
        <View style={styles.arrowContainer}>
           <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    overflow: "hidden",
  },
  contentContainer: {
    flexDirection: "row",
    padding: SPACING.md,
  },
  logoWrapper: {
    marginRight: SPACING.md,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    ...SHADOWS.small, 
    backgroundColor: COLORS.white, // Ensure shadow shows
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  logoPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow:{
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: 2,
    fontWeight: "500",
  },
  separator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  arrowContainer: {
      justifyContent: 'center',
      paddingLeft: SPACING.xs,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: SPACING.xs,
  },
  memberText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: "700",
    marginLeft: 2,
    textTransform: 'uppercase',
  },
});
