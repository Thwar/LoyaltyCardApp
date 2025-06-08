import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { Business } from "../types";

interface BusinessCardProps {
  business: Business;
  onPress?: () => void;
  style?: any;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business, onPress, style }) => {
  const CardContent = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        {business.logoUrl ? (
          <Image source={{ uri: business.logoUrl }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Ionicons name="business" size={24} color={COLORS.gray} />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {business.name}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {business.description}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.gray} style={styles.arrow} />
      </View>

      {business.address && (
        <View style={styles.footer}>
          <Ionicons name="location" size={16} color={COLORS.gray} />
          <Text style={styles.address} numberOfLines={1}>
            {business.address}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={[styles.cardWrapper, style]} onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.cardWrapper, style]}>
      <CardContent />
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOWS.small,
  },
  container: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightGray,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  arrow: {
    marginLeft: SPACING.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  address: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    flex: 1,
  },
});
