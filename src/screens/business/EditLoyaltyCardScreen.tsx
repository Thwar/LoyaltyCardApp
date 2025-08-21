import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, ColorPicker, StampShapePicker, AnimatedLoyaltyCard, Dropdown, ImagePicker, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService } from "../../services/api";
import { ImageUploadService } from "../../services/imageUpload";
import { LoyaltyCard } from "../../types";
import { imageCache, refreshFlags } from "../../utils";

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
    cardColor: "#E53935",
    stampShape: "circle" as "circle" | "square" | "egg" | "triangle" | "diamond" | "star",
    backgroundImage: "",
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
        cardColor: cardData.cardColor || "#E53935",
        stampShape: cardData.stampShape || "circle",
        backgroundImage: cardData.backgroundImage || "",
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
      let backgroundImageUrl = formData.backgroundImage;
      const oldBackgroundImage = loyaltyCard.backgroundImage;

      // If background image was removed (empty string), keep it empty
      if (!formData.backgroundImage) {
        backgroundImageUrl = "";
        // Delete old background image if it exists
        if (oldBackgroundImage && oldBackgroundImage.startsWith("https://")) {
          try {
            await ImageUploadService.deleteLoyaltyCardBackground(oldBackgroundImage);
            // Clear the image from cache
            imageCache.clearImage(oldBackgroundImage);
          } catch (deleteError) {
            console.warn("Could not delete old background image:", deleteError);
            // Don't fail the update if deletion fails
          }
        }
      }
      // If there's a new background image and it's not already an HTTP URL, upload it
      else if (formData.backgroundImage && !formData.backgroundImage.startsWith("http")) {
        try {
          console.log("🔄 Uploading background image from:", formData.backgroundImage.substring(0, 100) + "...");
          backgroundImageUrl = await ImageUploadService.uploadLoyaltyCardBackground(formData.backgroundImage, loyaltyCard.id);
          console.log("✅ Successfully uploaded new background image:", backgroundImageUrl);

          // Delete old background image after successful upload since we now use unique filenames
          if (oldBackgroundImage && oldBackgroundImage.startsWith("https://")) {
            try {
              await ImageUploadService.deleteLoyaltyCardBackground(oldBackgroundImage);
              console.log("🗑️ Deleted old background image:", oldBackgroundImage);
            } catch (deleteError) {
              console.warn("Could not delete old background image:", deleteError);
              // Don't fail the update if deletion fails - continue with the update
            }
          }
        } catch (uploadError) {
          console.error("Error uploading background image:", uploadError);
          showAlert({
            title: "Error",
            message: "Error al subir la imagen de fondo. Por favor, intenta de nuevo.",
          });
          setSaving(false);
          return;
        }
      }
      // If it's already an HTTP URL (existing image), keep it as is
      // backgroundImageUrl = formData.backgroundImage (already set above)

      // Safety check: Never store local file URIs in the database
      if (backgroundImageUrl && (backgroundImageUrl.startsWith("file://") || backgroundImageUrl.startsWith("content://"))) {
        console.error("❌ Preventing storage of local file URI in database:", backgroundImageUrl);
        showAlert({
          title: "Error",
          message: "Error: la imagen no se subió correctamente. Por favor, intenta de nuevo.",
        });
        setSaving(false);
        return;
      }

      const updates = {
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription.trim(),
        cardColor: formData.cardColor,
        stampShape: formData.stampShape,
        backgroundImage: backgroundImageUrl,
      };

      console.log("🔄 Updating loyalty card with:", {
        ...updates,
        backgroundImage: backgroundImageUrl?.substring(0, 100) + "..." || "NO IMAGE",
      });

      await LoyaltyCardService.updateLoyaltyCard(loyaltyCard.id, updates);

      console.log("✅ Loyalty card updated successfully in database");

      // Set refresh flags to trigger fresh data fetch in customer screens
      await refreshFlags.setRefreshForAllScreens();

      // Clear old background image from cache if it was changed
      if (oldBackgroundImage && oldBackgroundImage !== backgroundImageUrl) {
        imageCache.clearImage(oldBackgroundImage);
        console.log("🗑️ Cleared old background image from cache:", oldBackgroundImage);
      }

      // Also clear the entire loyalty card images from cache to ensure fresh display
      imageCache.clearLoyaltyCardImages({
        backgroundImage: backgroundImageUrl,
        businessLogo: loyaltyCard.businessLogo,
      });

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
    console.log("🔴 handleDeactivateCard called");

    // For web, use native browser confirm
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "¿Estás seguro que quieres desactivar esta tarjeta de lealtad? Los clientes ya no podrán unirse a este programa, pero las tarjetas existentes seguirán funcionando."
      );
      if (confirmed) {
        onClose();
        confirmDeactivateCard();
      }
      return;
    }

    // For mobile - use React Native's native Alert
    Alert.alert(
      "Desactivar Tarjeta de Lealtad",
      "¿Estás seguro que quieres desactivar esta tarjeta de lealtad? Los clientes ya no podrán unirse a este programa, pero las tarjetas existentes seguirán funcionando.",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => {
            console.log("🔴 Cancel deactivate pressed");
          },
        },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: () => {
            console.log("🔴 Confirm deactivate pressed");
            onClose();
            confirmDeactivateCard();
          },
        },
      ]
    );
  };

  const handleActivateCard = () => {
    console.log("🟢 handleActivateCard called");

    // For web, use native browser confirm
    if (Platform.OS === "web") {
      const confirmed = window.confirm("¿Estás seguro que quieres activar esta tarjeta de lealtad? Los clientes podrán unirse a este programa nuevamente.");
      if (confirmed) {
        onClose();
        confirmActivateCard();
      }
      return;
    }

    // For mobile - use React Native's native Alert
    Alert.alert("Activar Tarjeta de Lealtad", "¿Estás seguro que quieres activar esta tarjeta de lealtad? Los clientes podrán unirse a este programa nuevamente.", [
      {
        text: "Cancelar",
        style: "cancel",
        onPress: () => {
          console.log("🟢 Cancel activate pressed");
        },
      },
      {
        text: "Activar",
        style: "default",
        onPress: () => {
          console.log("🟢 Confirm activate pressed");
          onClose();
          confirmActivateCard();
        },
      },
    ]);
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

  const confirmActivateCard = async () => {
    if (!loyaltyCard) return;

    setSaving(true);
    try {
      await LoyaltyCardService.activateLoyaltyCard(loyaltyCard.id);
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad activada exitosamente!",
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
        message: error instanceof Error ? error.message : "Error al activar la tarjeta de lealtad",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = () => {
    console.log("🗑️ handleDeleteCard called");

    // For web, use native browser confirm
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "⚠️ ATENCIÓN: Esta acción eliminará PERMANENTEMENTE la tarjeta de lealtad y TODOS los datos relacionados, incluyendo las tarjetas de clientes, sellos y actividades. Esta acción NO se puede deshacer.\n\n¿Estás completamente seguro?"
      );
      if (confirmed) {
        onClose();
        confirmDeleteCard();
      }
      return;
    }

    // For mobile - use React Native's native Alert
    Alert.alert(
      "Eliminar Tarjeta de Lealtad",
      "⚠️ ATENCIÓN: Esta acción eliminará PERMANENTEMENTE la tarjeta de lealtad y TODOS los datos relacionados, incluyendo las tarjetas de clientes, sellos y actividades. Esta acción NO se puede deshacer.\n\n¿Estás completamente seguro?",
      [
        {
          text: "Cancelar",
          style: "cancel",
          onPress: () => {
            console.log("🗑️ Cancel delete pressed");
          },
        },
        {
          text: "ELIMINAR",
          style: "destructive",
          onPress: () => {
            console.log("🗑️ Confirm delete pressed");
            onClose();
            confirmDeleteCard();
          },
        },
      ]
    );
  };
  const confirmDeleteCard = async () => {
    if (!loyaltyCard) return;

    setSaving(true);
    try {
      // Delete background image if it exists before deleting the card
      if (loyaltyCard.backgroundImage && loyaltyCard.backgroundImage.startsWith("https://")) {
        try {
          await ImageUploadService.deleteLoyaltyCardBackground(loyaltyCard.backgroundImage);
          // Clear the image from cache
          imageCache.clearImage(loyaltyCard.backgroundImage);
        } catch (deleteError) {
          console.warn("Could not delete background image:", deleteError);
          // Don't fail the deletion if image cleanup fails
        }
      }

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
                <ImagePicker
                  label="Imagen de Fondo (Opcional)"
                  value={formData.backgroundImage}
                  onImageSelect={(uri) => updateFormData("backgroundImage", uri)}
                  placeholder="Seleccionar imagen de fondo"
                  error={errors.backgroundImage}
                />
                <StampShapePicker label="Forma del Sello" selectedShape={formData.stampShape} onShapeSelect={(shape) => updateFormData("stampShape", shape)} error={errors.stampShape} />
                {/* Preview Section */}
                <Text style={styles.previewTitle}>Vista Previa</Text>
                <AnimatedLoyaltyCard
                  card={{
                    id: loyaltyCard?.id || "preview",
                    businessId: loyaltyCard?.businessId || "preview",
                    businessName: loyaltyCard?.businessName || "Nombre de Tu Negocio",
                    totalSlots: parseInt(formData.totalSlots) || 10,
                    rewardDescription: formData.rewardDescription || "Descripción de tu recompensa",
                    cardColor: formData.cardColor,
                    stampShape: formData.stampShape,
                    backgroundImage: formData.backgroundImage,
                    createdAt: loyaltyCard?.createdAt || new Date(),
                    isActive: loyaltyCard?.isActive ?? true,
                  }}
                  currentStamps={1}
                  showAnimation={false}
                  enableTilt={false}
                  style={styles.previewContainer}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button title="Actualizar Tarjeta" onPress={handleUpdateCard} loading={saving} style={styles.updateButton} />
                {loyaltyCard?.isActive ? (
                  <Button title="Desactivar Tarjeta" onPress={handleDeactivateCard} variant="outline" loading={saving} style={styles.deactivateButton} textStyle={{ color: COLORS.warning }} />
                ) : (
                  <Button title="Activar Tarjeta" onPress={handleActivateCard} variant="outline" loading={saving} style={styles.activateButton} textStyle={{ color: COLORS.success }} />
                )}
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
  activateButton: {
    borderWidth: 1,
    borderColor: COLORS.success,
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
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
});
