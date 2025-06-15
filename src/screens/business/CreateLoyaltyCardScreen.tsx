import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, KeyboardAvoidingView, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, Dropdown, ColorPicker, StampShapePicker, StampsGrid, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService, BusinessService } from "../../services/api";

interface CreateLoyaltyCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateLoyaltyCardModal: React.FC<CreateLoyaltyCardModalProps> = ({ visible, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    totalSlots: "10",
    rewardDescription: "",
    cardColor: "#8B1538", // Default to primary color
    stampShape: "circle" as "circle" | "square" | "egg" | "triangle" | "diamond" | "star",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create dropdown options for stamps from 3 to 20
  const stampOptions = Array.from({ length: 18 }, (_, i) => ({
    label: `${i + 3} sellos`,
    value: (i + 3).toString(),
  }));

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

  const handleCreateCard = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      // Get the existing business for the current user
      const businesses = await BusinessService.getBusinessesByOwner(user.id);

      if (businesses.length === 0) {
        throw new Error("No se encontró el perfil del negocio. Por favor, contacta al soporte.");
      }
      const businessId = businesses[0].id;

      const cardData = {
        businessId: businessId,
        businessName: businesses[0].name,
        businessLogo: businesses[0].logoUrl,
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription,
        cardColor: formData.cardColor,
        stampShape: formData.stampShape,
        isActive: true,
      };
      await LoyaltyCardService.createLoyaltyCard(cardData);

      // Close modal immediately after successful creation
      onClose();
      onSuccess?.();

      // Show success alert after modal is closed
      showAlert({
        title: "¡Éxito!",
        message: "Tu tarjeta de lealtad ha sido creada exitosamente.",
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al crear la tarjeta de lealtad",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear Tarjeta de Lealtad</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.subtitle}>Configura un nuevo programa de lealtad para tus clientes</Text>
            </View>

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
                placeholder="ej., Café gratis o 20% de descuento en la próxima compra"
                leftIcon="gift"
                error={errors.rewardDescription}
                labelStyle={{ fontSize: 16 }}
                multiline
              />
              <ColorPicker label="Color de la Tarjeta" selectedColor={formData.cardColor} onColorSelect={(color) => updateFormData("cardColor", color)} error={errors.cardColor} />
              <StampShapePicker label="Forma del Sello" selectedShape={formData.stampShape} onShapeSelect={(shape) => updateFormData("stampShape", shape)} error={errors.stampShape} />{" "}
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
                    <Text style={styles.previewBusinessName}>{"Nombre de Tu Negocio"}</Text> <Text style={styles.previewStamps}>1 / {formData.totalSlots || "10"} sellos</Text>
                    <StampsGrid
                      totalSlots={parseInt(formData.totalSlots) || 10}
                      currentStamps={1}
                      stampShape={formData.stampShape}
                      showAnimation={false}
                      size="small"
                      stampColor={formData.cardColor || COLORS.primary}
                      containerStyle={styles.previewStampsContainer}
                    />
                    <Text style={styles.previewReward}>Recompensa: {formData.rewardDescription || "Descripción de tu recompensa"}</Text>
                  </LinearGradient>
                </View>
              </View>
              <Button title="Crear Tarjeta de Lealtad" onPress={handleCreateCard} loading={loading} size="large" style={styles.createButton} />
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
  keyboardAvoid: {
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
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  form: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
    minHeight: 800,
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
  createButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
});
