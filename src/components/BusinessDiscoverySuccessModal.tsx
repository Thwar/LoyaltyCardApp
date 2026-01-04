import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";

interface BusinessDiscoverySuccessModalProps {
  visible: boolean;
  cardCode: string;
  onClose: () => void;
  onViewCards: () => void;
}

export const BusinessDiscoverySuccessModal: React.FC<
  BusinessDiscoverySuccessModalProps
> = ({ visible, cardCode, onClose, onViewCards }) => {
  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={56}
              color={COLORS.success}
            />
          </View>
          <Text style={styles.successModalTitle}>¡Bienvenido al Programa!</Text>
          <Text style={styles.modalMessage}>
            ¡Te has unido exitosamente! Ahora puedes empezar a ganar sellos y
            recompensas.
          </Text>
          
          <View style={styles.cardCodeContainer}>
            <Text style={styles.cardCodeLabel}>Tu código de identificación:</Text>
            <Text style={styles.cardCode}>{cardCode}</Text>
          </View>
          
          <Text style={styles.cardCodeDescription}>
            Presenta este código al negocio para recibir sellos.
          </Text>

          <TouchableOpacity style={styles.modalButton} onPress={onViewCards}>
            <Text style={styles.modalButtonText}>Ver Mis Tarjetas</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <Text style={styles.modalCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    width: "85%",
    maxWidth: 340,
    ...SHADOWS.medium,
  },
  successIcon: {
    marginBottom: SPACING.md,
    backgroundColor: `${COLORS.success}15`,
    padding: SPACING.sm,
    borderRadius: 50,
  },
  successModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  cardCodeContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.md,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderStyle: 'dashed',
  },
  cardCodeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardCode: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.primary,
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  cardCodeDescription: {
    fontSize: FONT_SIZES.xs + 1,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: SPACING.sm,
    width: "100%",
    ...SHADOWS.small,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    textAlign: "center",
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  modalCloseText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    textAlign: "center",
    fontWeight: "500",
  },
});
