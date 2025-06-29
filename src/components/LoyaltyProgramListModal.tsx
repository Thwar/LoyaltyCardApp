import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Modal, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS, getCategoryLabel } from "../constants";
import { Business, LoyaltyCard, CustomerCard } from "../types";
import { LoyaltyProgramItem } from "./LoyaltyProgramItem";

interface BusinessWithCards extends Business {
  loyaltyCards: LoyaltyCard[];
  customerCards: CustomerCard[]; // Only unclaimed cards
  claimedRewardsCount: { [loyaltyCardId: string]: number }; // Count of claimed rewards per loyalty card
}

interface LoyaltyCardModalProps {
  selectedBusiness: BusinessWithCards | null;
  joiningCard: string | null;
  onClose: () => void;
  onJoinProgram: (loyaltyCard: LoyaltyCard) => void;
  onViewCard: (customerCard: CustomerCard) => void;
}

export const LoyaltyProgramListModal: React.FC<LoyaltyCardModalProps> = ({ selectedBusiness, joiningCard, onClose, onJoinProgram, onViewCard }) => {
  if (!selectedBusiness) return null;

  return (
    <Modal animationType="slide" transparent={false} visible={!!selectedBusiness} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <ScrollView style={styles.modalContent}>
          <View style={styles.logoContainer}>
            {selectedBusiness.logoUrl ? (
              <Image source={{ uri: selectedBusiness.logoUrl }} style={styles.logoLarge} />
            ) : (
              <View style={[styles.logoLarge, styles.logoPlaceholder]}>
                <Ionicons name="business" size={40} color={COLORS.gray} />
              </View>
            )}
            {/* Overlay elements */}
            <SafeAreaView style={styles.overlayContainer}>
              <View style={styles.overlayHeader}>
                <TouchableOpacity onPress={onClose} style={styles.overlayBackButton}>
                  <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.overlayTitleContainer}>{joiningCard && <ActivityIndicator size="small" color={COLORS.white} />}</View>
              </View>
              <View style={styles.overlayTitleSection}>
                <Text style={styles.overlayTitle}>{selectedBusiness.name}</Text> {/* Categories Badges */}
                {selectedBusiness.categories && selectedBusiness.categories.length > 0 && (
                  <View style={styles.categoriesContainer}>
                    {selectedBusiness.categories.map((categoryValue) => {
                      const categoryLabel = getCategoryLabel(categoryValue);

                      return (
                        <View key={categoryValue} style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {/* City Badge */}
                {selectedBusiness.city && (
                  <View style={styles.cityBadge}>
                    <Text style={styles.cityBadgeText}>{selectedBusiness.city}</Text>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </View>
          <View style={styles.businessInfoSection}>
            {/* Description and Social Media in new line below */}
            <View>
              <Text style={styles.businessDescriptionLarge}>{selectedBusiness.description}</Text>
              <View style={styles.businessHeaderModal}>
                <View style={styles.businessDetailsModal}>
                  {/* Address */}
                  {selectedBusiness.address && (
                    <View style={styles.addressContainer}>
                      <Ionicons name="location" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.addressText}>{selectedBusiness.address}</Text>
                    </View>
                  )}
                  {/* Phone */}
                  {selectedBusiness.phone && (
                    <View style={styles.contactItem}>
                      <Ionicons name="call" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.contactText}>{selectedBusiness.phone}</Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Social Media Card */}
              {(selectedBusiness.facebook || selectedBusiness.instagram || selectedBusiness.tiktok) && (
                <View style={styles.socialMediaTextContainer}>
                  {selectedBusiness.facebook && (
                    <View style={styles.socialMediaRow}>
                      <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                      <Text style={styles.socialMediaText}>Facebook: {selectedBusiness.facebook}</Text>
                    </View>
                  )}
                  {selectedBusiness.instagram && (
                    <View style={styles.socialMediaRow}>
                      <Ionicons name="logo-instagram" size={18} color="#E4405F" />
                      <Text style={styles.socialMediaText}>Instagram: {selectedBusiness.instagram}</Text>
                    </View>
                  )}
                  {selectedBusiness.tiktok && (
                    <View style={styles.socialMediaRow}>
                      <Ionicons name="logo-tiktok" size={18} color="#000000" />
                      <Text style={styles.socialMediaText}>TikTok: {selectedBusiness.tiktok}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
          <View style={styles.loyaltyCardsSection}>
            <Text style={styles.sectionTitle}>Programas de Lealtad ({selectedBusiness.loyaltyCards.length})</Text>
            {selectedBusiness.loyaltyCards.map((loyaltyCard) => {
              const hasCard = selectedBusiness.customerCards.some((card) => card.loyaltyCardId === loyaltyCard.id);
              const customerCard = selectedBusiness.customerCards.find((card) => card.loyaltyCardId === loyaltyCard.id);
              const claimedRewardsCount = selectedBusiness.claimedRewardsCount[loyaltyCard.id] || 0;
              return (
                <LoyaltyProgramItem
                  key={loyaltyCard.id}
                  loyaltyCard={loyaltyCard}
                  hasCard={hasCard}
                  customerCard={customerCard}
                  claimedRewardsCount={claimedRewardsCount}
                  joiningCard={joiningCard}
                  onJoinProgram={onJoinProgram}
                  onViewCard={onViewCard}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    flex: 1,
  },
  businessInfoSection: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOWS.small,
  },
  businessHeaderModal: {
    marginTop: SPACING.sm,
    alignItems: "flex-start",
  },

  logoContainer: {
    position: "relative",
  },
  logoLarge: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  logoPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: "space-between",
  },
  overlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  overlayBackButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: SPACING.sm,
    ...SHADOWS.small,
  },
  overlayTitleContainer: {
    width: 24,
    alignItems: "center",
  },
  overlayTitleSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    alignItems: "flex-start",
  },
  overlayTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.white,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 12,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs / 2,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  socialMediaTextContainer: {
    marginTop: SPACING.md,
  },

  socialMediaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  socialMediaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  businessDetailsModal: {
    flex: 1,
    width: "100%",
  },
  businessNameLarge: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  addressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  cityBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  cityBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: "600",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  businessCityLarge: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  businessDescriptionLarge: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loyaltyCardsSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
});
