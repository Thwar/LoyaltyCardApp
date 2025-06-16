import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, ColorPicker, StampShapePicker, StampsGrid, Dropdown, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService } from "../../services/api";
import { LoyaltyCard } from "../../types";

interface EditLoyaltyCardModalProps {
  visible: boolean;
  cardData: LoyaltyCard;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditLoyaltyCardModal: React.FC<EditLoyaltyCardModalProps> = ({ visible, cardData, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [formData, setFormData] = useState({
    totalSlots: "",
    rewardDescription: "",
    cardColor: "#8B1538",
    stampShape: "circle" as "circle" | "square" | "egg" | "triangle" | "diamond" | "star",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create dropdown options for stamps from 3 to 20
  const stampOptions = Array.from({ length: 18 }, (_, i) => ({
    label: `${i + 3} sellos`,
    value: (i + 3).toString(),
  }));

  useEffect(() => {
    if (visible && cardData) {
      setLoyaltyCard(cardData);
      setFormData({
        totalSlots: cardData.totalSlots.toString(),
        rewardDescription: cardData.rewardDescription,
        cardColor: cardData.cardColor || "#8B1538",
        stampShape: cardData.stampShape || "circle",
      });
    }
  }, [cardData, visible]);
  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const slotsNum = parseInt(formData.totalSlots);
    if (!formData.totalSlots || isNaN(slotsNum) || slotsNum < 3 || slotsNum > 20) {
      newErrors.totalSlots = "Los sellos deben estar entre 3 y 20";
    }
    if (!formData.rewardDescription.trim()) {
      newErrors.rewardDescription = "La descripción de la recompensa es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateCard = async () => {
    if (!validateForm() || !loyaltyCard) return;

    setSaving(true);
    try {
      const updates = {
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription.trim(),
        cardColor: formData.cardColor,
        stampShape: formData.stampShape,
      };
      await LoyaltyCardService.updateLoyaltyCard(loyaltyCard.id, updates);

      // Close modal immediately after successful update
      onClose();
      onSuccess?.();

      // Show success alert after modal is closed
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad actualizada exitosamente!",
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al actualizar la tarjeta de lealtad",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDeactivateCard = () => {
    // Close the modal first, then show the alert
    onClose();

    // Use a small delay to ensure the modal is fully closed before showing the alert
    setTimeout(() => {
      showAlert({
        title: "Desactivar Tarjeta de Lealtad",
        message: "¿Estás seguro que quieres desactivar esta tarjeta de lealtad? Los clientes ya no podrán unirse a este programa, pero las tarjetas existentes seguirán funcionando.",
        buttons: [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => {
              // If user cancels, we should potentially reopen the edit modal
              // but for now, just stay closed
            },
          },
          {
            text: "Desactivar",
            style: "destructive",
            onPress: confirmDeactivateCard,
          },
        ],
      });
    }, 100);
  };

  const confirmDeactivateCard = async () => {
    if (!loyaltyCard) return;

    setSaving(true);
    try {
      await LoyaltyCardService.deactivateLoyaltyCard(loyaltyCard.id);
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad desactivada exitosamente!",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              // Modal is already closed, just trigger success callback
              onSuccess?.();
            },
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al desactivar la tarjeta de lealtad",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = () => {
    // Close the modal first, then show the alert
    onClose();

    // Use a small delay to ensure the modal is fully closed before showing the alert
    setTimeout(() => {
      showAlert({
        title: "Eliminar Tarjeta de Lealtad",
        message:
          "⚠️ ATENCIÓN: Esta acción eliminará PERMANENTEMENTE la tarjeta de lealtad y TODOS los datos relacionados, incluyendo las tarjetas de clientes, sellos y actividades. Esta acción NO se puede deshacer.\n\n¿Estás completamente seguro?",
        buttons: [
          {
            text: "Cancelar",
            style: "cancel",
            onPress: () => {
              // If user cancels, we should potentially reopen the edit modal
              // but for now, just stay closed
            },
          },
          {
            text: "ELIMINAR",
            style: "destructive",
            onPress: confirmDeleteCard,
          },
        ],
      });
    }, 100);
  };
  const confirmDeleteCard = async () => {
    if (!loyaltyCard) return;

    setSaving(true);
    try {
      await LoyaltyCardService.deleteLoyaltyCard(loyaltyCard.id);
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad y todos los datos relacionados eliminados exitosamente!",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              // Modal is already closed, just trigger success callback
              onSuccess?.();
            },
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al eliminar la tarjeta de lealtad",
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Tarjeta de Lealtad</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              <Text style={styles.subtitle}>Actualiza los detalles de tu tarjeta de lealtad</Text>
              <View style={styles.form}>
                <Dropdown
                  label="Número de Sellos Requeridos"
                  value={formData.totalSlots}
                  options={stampOptions}
                  onSelect={(value) => updateFormData("totalSlots", value)}
                  placeholder="Seleccionar número de sellos"
                  error={errors.totalSlots}
                />
                <InputField
                  label="Descripción de la Recompensa"
                  value={formData.rewardDescription}
                  onChangeText={(value) => updateFormData("rewardDescription", value)}
                  placeholder="ej., Café gratis"
                  multiline
                  numberOfLines={3}
                  error={errors.rewardDescription}
                  labelStyle={{ fontSize: 16 }}
                />
                <ColorPicker label="Color de la Tarjeta" selectedColor={formData.cardColor} onColorSelect={(color) => updateFormData("cardColor", color)} error={errors.cardColor} />
                <StampShapePicker label="Forma del Sello" selectedShape={formData.stampShape} onShapeSelect={(shape) => updateFormData("stampShape", shape)} error={errors.stampShape} />
                {/* Preview Section */}
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Vista Previa</Text>
                  <View style={styles.previewCard}>
                    <LinearGradient
                      colors={[formData.cardColor || COLORS.primary, formData.cardColor ? `${formData.cardColor}CC` : COLORS.primaryDark]}
                      style={styles.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.previewBusinessName}>{"Nombre de Tu Negocio"}</Text>
                      <Text style={styles.previewStamps}>1 / {formData.totalSlots || "10"} sellos</Text>
                      <StampsGrid
                        totalSlots={parseInt(formData.totalSlots) || 10}
                        currentStamps={1}
                        stampShape={formData.stampShape}
                        showAnimation={false}
                        stampColor={formData.cardColor || COLORS.primary}
                        containerStyle={styles.previewStampsContainer}
                      />
                      <Text style={styles.previewReward}>Recompensa: {formData.rewardDescription || "Descripción de tu recompensa"}</Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>
              <View style={styles.buttonContainer}>
                <Button title="Actualizar Tarjeta" onPress={handleUpdateCard} loading={saving} style={styles.updateButton} />
                <Button title="Desactivar Tarjeta" onPress={handleDeactivateCard} variant="outline" loading={saving} style={styles.deactivateButton} textStyle={{ color: COLORS.warning }} />
                <Button title="Eliminar Permanentemente" onPress={handleDeleteCard} variant="outline" loading={saving} style={styles.deleteButton} textStyle={{ color: COLORS.error }} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    gap: SPACING.md,
  },
  updateButton: {
    marginBottom: SPACING.md,
  },
  deactivateButton: {
    borderWidth: 1,
    borderColor: COLORS.warning,
    marginBottom: SPACING.md,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  previewContainer: {
    marginVertical: SPACING.lg,
  },
  previewTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  previewCard: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 12,
    padding: SPACING.lg,
  },
  previewBusinessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  previewStamps: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  previewStampsContainer: {
    marginBottom: SPACING.sm,
  },
  previewReward: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
});
