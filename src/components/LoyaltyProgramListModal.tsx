import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, Modal, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
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
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{selectedBusiness.name}</Text>
          <View style={{ width: 24 }}>{joiningCard && <ActivityIndicator size="small" color={COLORS.primary} />}</View>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.businessInfoSection}>
            <View style={styles.businessHeaderModal}>
              <View style={styles.logoContainer}>
                {selectedBusiness.logoUrl ? (
                  <Image source={{ uri: selectedBusiness.logoUrl }} style={styles.logoLarge} />
                ) : (
                  <View style={[styles.logoLarge, styles.logoPlaceholder]}>
                    <Ionicons name="business" size={40} color={COLORS.gray} />
                  </View>
                )}
              </View>
              <View style={styles.businessDetailsModal}>
                <Text style={styles.businessNameLarge}>{selectedBusiness.name}</Text>
                {selectedBusiness.city && (
                  <Text style={styles.businessCityLarge}>
                    <Ionicons name="location" size={16} />
                    {selectedBusiness.city}
                  </Text>
                )}
                <Text style={styles.businessDescriptionLarge}>{selectedBusiness.description}</Text>
              </View>
            </View>
          </View>{" "}
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
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: SPACING.md,
  },
  modalContent: {
    flex: 1,
  },
  businessInfoSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  businessHeaderModal: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logoContainer: {
    marginRight: SPACING.md,
  },
  logoLarge: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  logoPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  businessDetailsModal: {
    flex: 1,
  },
  businessNameLarge: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
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
