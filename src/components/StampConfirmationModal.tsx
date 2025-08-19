import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { CustomerCard } from "../types";
import { StampsGrid } from "./StampsGrid";
import { AddStampsInteractive } from "./AddStampsInteractive";
import * as Haptics from "expo-haptics";

interface StampConfirmationModalProps {
  customerCard: CustomerCard | null;
  isVisible: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirmStamp: (count?: number) => void;
  onRedeemReward?: () => void;
}

export const StampConfirmationModal: React.FC<StampConfirmationModalProps> = ({ customerCard, isVisible, loading, onClose, onConfirmStamp, onRedeemReward }) => {
  if (!customerCard) return null;

  const { loyaltyCard } = customerCard;
  const willCompleteCard = useMemo(() => (loyaltyCard ? customerCard.currentStamps + 1 >= loyaltyCard.totalSlots : false), [customerCard.currentStamps, loyaltyCard]);
  const isCardComplete = loyaltyCard && customerCard.currentStamps >= loyaltyCard.totalSlots;
  const canRedeem = isCardComplete && !customerCard.isRewardClaimed;
  const isAlreadyRedeemed = isCardComplete && customerCard.isRewardClaimed;

  // Pending increments selected in interactive card (non-redeem flow)
  const [pending, setPending] = useState(0);

  return (
    <Modal animationType="slide" transparent={false} visible={isVisible} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{canRedeem ? "Canjear Recompensa" : isAlreadyRedeemed ? "Recompensa Canjeada" : willCompleteCard ? "Completar Tarjeta" : "Confirmar Sello"}</Text>
          <View style={{ width: 24 }}>{loading && <ActivityIndicator size="small" color={COLORS.primary} />}</View>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.confirmationSection}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={canRedeem ? "gift" : isAlreadyRedeemed ? "checkmark-done-circle" : willCompleteCard ? "star" : "checkmark-circle"}
                size={48}
                color={canRedeem ? COLORS.primary : isAlreadyRedeemed ? COLORS.success : willCompleteCard ? COLORS.warning : COLORS.success}
              />
            </View>
            <Text style={styles.confirmationTitle}>
              {canRedeem ? "¡Tarjeta Lista para Canjear!" : isAlreadyRedeemed ? "¡Recompensa Ya Canjeada!" : willCompleteCard ? "¡Tarjeta se Completará!" : "¡Tarjeta de Cliente Encontrada!"}
            </Text>
            <Text style={styles.confirmationSubtitle}>
              {canRedeem
                ? "El cliente puede reclamar su recompensa ahora"
                : isAlreadyRedeemed
                ? "Esta recompensa ya fue canjeada por el cliente"
                : willCompleteCard
                ? "Esta tarjeta estará lista para canjear en la próxima visita"
                : "Revisa los detalles antes de agregar el sello"}
            </Text>
          </View>
          <View style={styles.loyaltyCardSection}>
            <View style={styles.cardContainer}>
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
          </View>
          {loyaltyCard && (
            <View style={styles.loyaltyCardSection}>
              <View style={styles.cardContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{loyaltyCard.businessName}</Text>
                  <Text style={styles.rewardDescription}>{loyaltyCard.rewardDescription}</Text>
                </View>

                <View style={styles.stampsSection}>
                  <Text style={styles.stampsLabel}>
                    Sellos Actuales: {customerCard.currentStamps} de {loyaltyCard.totalSlots}
                    {canRedeem && " - ¡COMPLETA!"}
                    {isAlreadyRedeemed && " - ¡CANJEADA!"}
                  </Text>
                  {!canRedeem && !isAlreadyRedeemed && loyaltyCard && (
                    <View style={[styles.nextStampPreview, willCompleteCard && styles.completeCardPreview]}>
                      <Text style={[styles.previewLabel, willCompleteCard && styles.completeCardLabel]}>
                        {pending > 0
                          ? `Seleccionados: ${pending} • Después: ${Math.min(customerCard.currentStamps + pending, loyaltyCard.totalSlots)} de ${loyaltyCard.totalSlots}`
                          : `Toca para agregar sellos (máx ${loyaltyCard.totalSlots - customerCard.currentStamps})`}
                      </Text>
                      <AddStampsInteractive
                        card={loyaltyCard}
                        currentStamps={customerCard.currentStamps}
                        cardCode={customerCard.cardCode}
                        // Always true per requirements
                        showAnimation={true}
                        enableTilt={true}
                        onPendingChange={setPending}
                      />
                    </View>
                  )}
                  {(canRedeem || isAlreadyRedeemed) && (
                    <View style={[styles.redeemSection, isAlreadyRedeemed && styles.redeemedSection]}>
                      <Text style={[styles.redeemLabel, isAlreadyRedeemed && styles.redeemedLabel]}>{isAlreadyRedeemed ? "¡Recompensa ya canjeada!" : "¡Recompensa disponible para canjear!"}</Text>
                      <View style={styles.rewardBox}>
                        <Text style={styles.rewardText}>{loyaltyCard.rewardDescription}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          <View style={styles.actionSection}>
            {!isAlreadyRedeemed && (
              <TouchableOpacity
                style={[styles.actionButton, canRedeem ? styles.redeemButton : styles.confirmButton]}
                onPress={
                  canRedeem
                    ? () => {
                        try {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {}
                        if (onRedeemReward) onRedeemReward();
                        else onConfirmStamp();
                      }
                    : () => {
                        try {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {}
                        onConfirmStamp(Math.max(1, pending));
                      }
                }
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name={canRedeem ? "gift" : willCompleteCard ? "star" : "add-circle"} size={24} color={COLORS.white} />
                    <Text style={styles.confirmButtonText}>{canRedeem ? "Canjear Recompensa" : pending > 0 ? `Agregar ${pending} sello${pending === 1 ? "" : "s"}` : "Agregar Sello"}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {isAlreadyRedeemed && (
              <View style={[styles.actionButton, styles.redeemedButton]}>
                <Ionicons name="checkmark-done-circle" size={24} color={COLORS.success} />
                <Text style={styles.redeemedButtonText}>Recompensa Ya Canjeada</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>{isAlreadyRedeemed ? "Cerrar" : "Cancelar"}</Text>
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
    padding: SPACING.md,
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  iconContainer: {
    marginBottom: SPACING.sm,
  },
  confirmationTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  confirmationSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  customerInfoSection: {
    backgroundColor: COLORS.lightGray,
    marginRight: SPACING.lg,
    marginLeft: SPACING.lg,
    borderRadius: 12,
    borderCurve: "continuous",
    ...SHADOWS.small,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cardContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  cardHeader: {
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.md,
  },
  nextStampPreview: {
    backgroundColor: "rgb(248, 249, 250)",
    borderRadius: 8,
    borderCurve: "continuous",
    padding: 0,
    alignItems: "center",
    alignSelf: "center",
    width: "94%",
    maxWidth: 680,
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
  },
  completeCardLabel: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  actionSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderCurve: "continuous",
    marginBottom: SPACING.md,
    minHeight: 56,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  redeemButton: {
    backgroundColor: COLORS.success,
    ...SHADOWS.small,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.lg,
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
  redeemSection: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    borderCurve: "continuous",
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  redeemLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  rewardBox: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderCurve: "continuous",
    padding: SPACING.sm,
    minWidth: "80%",
    alignItems: "center",
  },
  rewardText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.primary,
    textAlign: "center",
  },
  redeemedSection: {
    backgroundColor: COLORS.success,
  },
  redeemedLabel: {
    color: COLORS.white,
  },
  redeemedButton: {
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  redeemedButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
});
