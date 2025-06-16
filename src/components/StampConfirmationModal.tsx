import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { CustomerCard } from "../types";
import { StampsGrid } from "./StampsGrid";

interface StampConfirmationModalProps {
  customerCard: CustomerCard | null;
  isVisible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirmStamp: () => void;
}

export const StampConfirmationModal: React.FC<StampConfirmationModalProps> = ({ customerCard, isVisible, loading, onClose, onConfirmStamp }) => {
  if (!customerCard) return null;

  const { loyaltyCard } = customerCard;
  const isCardComplete = loyaltyCard && customerCard.currentStamps + 1 >= loyaltyCard.totalSlots;

  return (
    <Modal animationType="slide" transparent={false} visible={isVisible} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isCardComplete ? "Canjear Recompensa" : "Confirmar Sello"}</Text>
          <View style={{ width: 24 }}>{loading && <ActivityIndicator size="small" color={COLORS.primary} />}</View>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.confirmationSection}>
            <View style={styles.iconContainer}>
              <Ionicons name={isCardComplete ? "gift" : "checkmark-circle"} size={64} color={isCardComplete ? COLORS.warning : COLORS.success} />
            </View>
            <Text style={styles.confirmationTitle}>{isCardComplete ? "¡Tarjeta Lista para Canjear!" : "¡Tarjeta de Cliente Encontrada!"}</Text>
            <Text style={styles.confirmationSubtitle}>{isCardComplete ? "Esta tarjeta está lista para canjear la recompensa" : "Revisa los detalles antes de agregar el sello"}</Text>
          </View>

          <View style={styles.customerInfoSection}>
            <Text style={styles.sectionTitle}>Información del Cliente</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{customerCard.customerName || "Cliente"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Código de Tarjeta:</Text>
              <Text style={styles.infoValue}>{customerCard.cardCode}</Text>
            </View>
          </View>

          {loyaltyCard && (
            <View style={styles.loyaltyCardSection}>
              {/* <Text style={styles.sectionTitle}>Programa de Lealtad</Text> */}
              <View style={styles.cardContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{loyaltyCard.businessName}</Text>
                  <Text style={styles.rewardDescription}>{loyaltyCard.rewardDescription}</Text>
                </View>

                <View style={styles.stampsSection}>
                  <Text style={styles.stampsLabel}>
                    Sellos Actuales: {customerCard.currentStamps} de {loyaltyCard.totalSlots}
                  </Text>
                  <StampsGrid
                    totalSlots={loyaltyCard.totalSlots}
                    currentStamps={customerCard.currentStamps}
                    stampShape={loyaltyCard.stampShape || "circle"}
                    showAnimation={false}
                    size="medium"
                    containerStyle={styles.stampsGrid}
                    specialStampColor="darkgray"
                    stampColor={loyaltyCard.cardColor || COLORS.primary}
                  />
                  <View style={[styles.nextStampPreview, isCardComplete && styles.completeCardPreview]}>
                    <Text style={[styles.previewLabel, isCardComplete && styles.completeCardLabel]}>
                      {isCardComplete ? "¡Listo para canjear!" : `Después del sello: ${customerCard.currentStamps + 1} de ${loyaltyCard.totalSlots}`}
                    </Text>
                    <StampsGrid
                      totalSlots={loyaltyCard.totalSlots}
                      currentStamps={customerCard.currentStamps + 1}
                      stampShape={loyaltyCard.stampShape || "circle"}
                      showAnimation={false}
                      size="small"
                      containerStyle={styles.previewGrid}
                      stampColor={loyaltyCard.cardColor || COLORS.primary}
                      specialStampColor={"darkgray"}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.actionSection}>
            <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={onConfirmStamp} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name={isCardComplete ? "gift" : "add-circle"} size={20} color={COLORS.white} />
                  <Text style={styles.confirmButtonText}>{isCardComplete ? "Canjear Recompensa" : "Agregar Sello"}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
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
  confirmationSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  confirmationTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  confirmationSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  customerInfoSection: {
    backgroundColor: COLORS.lightGray,
    marginRight: SPACING.lg,
    marginLeft: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: "bold",
  },
  loyaltyCardSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  cardContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  cardHeader: {
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  rewardDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  stampsSection: {
    alignItems: "center",
  },
  stampsLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  stampsGrid: {
    marginBottom: SPACING.lg,
  },
  nextStampPreview: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  previewLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  previewGrid: {
    marginBottom: 0,
  },
  completeCardPreview: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  completeCardLabel: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  actionSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.white,
    marginLeft: SPACING.xs,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
