import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Platform, KeyboardAvoidingView, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, Dropdown, ColorPicker, StampShapePicker, AnimatedLoyaltyCard, ImagePicker, useAlert, Typography } from "../../components";
import { COLORS, FONT_SIZES, SPACING, getFontFamily } from "../../constants";
import { LoyaltyCardService, BusinessService } from "../../services/api";
import { ImageUploadService } from "../../services/imageUpload";
import { refreshFlags } from "../../utils";

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
    cardColor: "#E53935", // Default to primary color
    stampShape: "circle" as "circle" | "square" | "egg" | "triangle" | "diamond" | "star",
    backgroundImage: "",
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

      // Create card data without background image first
      const cardData = {
        businessId: businessId,
        businessName: businesses[0].name,
        businessLogo: businesses[0].logoUrl,
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription,
        cardColor: formData.cardColor,
        stampShape: formData.stampShape,
        backgroundImage: "", // Will be updated after creation if image exists
        isActive: true,
      };

      // Create the loyalty card first to get its ID
      const createdCard = await LoyaltyCardService.createLoyaltyCard(cardData);

      // Set refresh flags to trigger data refresh in all relevant screens
      await refreshFlags.setRefreshForAllScreens();

      // If there's a background image and it's not already an HTTP URL, upload it
      let uploadSuccess = true;
      if (formData.backgroundImage && !formData.backgroundImage.startsWith("http")) {
        try {
          console.log("🔄 Uploading background image from:", formData.backgroundImage.substring(0, 100) + "...");
          const backgroundImageUrl = await ImageUploadService.uploadLoyaltyCardBackground(formData.backgroundImage, createdCard.id);
          console.log("✅ Successfully uploaded background image:", backgroundImageUrl);

          // Safety check: Ensure we got a valid Firebase Storage URL
          if (!backgroundImageUrl || !backgroundImageUrl.startsWith("https://")) {
            throw new Error("Invalid upload response - expected HTTPS URL");
          }

          // Update the card with the uploaded background image URL
          await LoyaltyCardService.updateLoyaltyCard(createdCard.id, {
            backgroundImage: backgroundImageUrl,
          });

          console.log("✅ Updated loyalty card with background image URL");
        } catch (uploadError) {
          console.error("Error uploading background image:", uploadError);
          uploadSuccess = false;
        }
      }

      // Close modal immediately after successful creation
      onClose();
      onSuccess?.();

      // Show appropriate success or warning alert after modal is closed
      if (uploadSuccess) {
        showAlert({
          title: "¡Éxito!",
          message: "Tu tarjeta de lealtad ha sido creada exitosamente.",
        });
      } else {
        showAlert({
          title: "Tarjeta Creada con Advertencia",
          message: "La tarjeta fue creada exitosamente, pero hubo un error al subir la imagen de fondo. Puedes editarla más tarde para agregar la imagen.",
        });
      }
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
            <Typography variant="h3" style={styles.modalTitle}>
              Crear Tarjeta de Lealtad
            </Typography>
            <View style={styles.closeButton} />
          </View>

          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Typography variant="body1" color={COLORS.textSecondary}>
                Configura un nuevo programa de lealtad para tus clientes
              </Typography>
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
              <ImagePicker
                label="Imagen de Fondo (Opcional)"
                value={formData.backgroundImage}
                onImageSelect={(uri) => updateFormData("backgroundImage", uri)}
                placeholder="Seleccionar imagen de fondo"
                error={errors.backgroundImage}
              />
              <StampShapePicker label="Forma del Sello" selectedShape={formData.stampShape} onShapeSelect={(shape) => updateFormData("stampShape", shape)} error={errors.stampShape} />
              {/* Preview Section */}
              <Typography variant="h3" style={styles.previewTitle}>
                Vista Previa
              </Typography>
              <AnimatedLoyaltyCard
                card={{
                  id: "preview",
                  businessId: "preview",
                  businessName: "Nombre de Tu Negocio",
                  totalSlots: parseInt(formData.totalSlots) || 10,
                  rewardDescription: formData.rewardDescription || "Descripción de tu recompensa",
                  cardColor: formData.cardColor,
                  stampShape: formData.stampShape,
                  backgroundImage: formData.backgroundImage,
                  createdAt: new Date(),
                  isActive: true,
                }}
                currentStamps={1}
                showAnimation={false}
                enableTilt={false}
                style={styles.previewContainer}
              />
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
    fontFamily: getFontFamily("semiBold"),
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
    fontFamily: getFontFamily("bold"),
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: getFontFamily("regular"),
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
    fontSize: FONT_SIZES.lg,
    fontFamily: getFontFamily("semiBold"),
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  createButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
});
