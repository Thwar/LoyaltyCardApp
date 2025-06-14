import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Modal, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, ColorPicker, StampShapePicker, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService } from "../../services/api";
import { LoyaltyCard } from "../../types";

interface EditLoyaltyCardModalProps {
  visible: boolean;
  cardId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditLoyaltyCardModal: React.FC<EditLoyaltyCardModalProps> = ({ visible, cardId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    totalSlots: "",
    rewardDescription: "",
    cardColor: "#8B1538",
    stampShape: "circle" as "circle" | "square" | "egg",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (visible && cardId) {
      loadLoyaltyCard();
    }
  }, [cardId, visible]);
  const loadLoyaltyCard = async () => {
    if (!cardId || !visible) {
      return;
    }

    try {
      setLoading(true);
      const card = await LoyaltyCardService.getLoyaltyCard(cardId);
      if (card) {
        setLoyaltyCard(card);
        setFormData({
          businessName: card.businessName,
          totalSlots: card.totalSlots.toString(),
          rewardDescription: card.rewardDescription,
          cardColor: card.cardColor || "#8B1538",
          stampShape: card.stampShape || "circle",
        });
      }
    } catch (error) {
      showAlert({
        title: "Error",
        message: "Error al cargar los detalles de la tarjeta de lealtad",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName.trim()) {
      newErrors.businessName = "El nombre del negocio es requerido";
    }

    const slotsNum = parseInt(formData.totalSlots);
    if (!formData.totalSlots || isNaN(slotsNum) || slotsNum < 1 || slotsNum > 20) {
      newErrors.totalSlots = "Los sellos deben estar entre 1 y 20";
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
        businessName: formData.businessName.trim(),
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription.trim(),
        cardColor: formData.cardColor,
        stampShape: formData.stampShape,
      };
      await LoyaltyCardService.updateLoyaltyCard(loyaltyCard.id, updates);
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad actualizada exitosamente!",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ],
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
  const handleDeleteCard = () => {
    showAlert({
      title: "Eliminar Tarjeta de Lealtad",
      message: "¿Estás seguro que quieres eliminar esta tarjeta de lealtad? Esta acción no se puede deshacer y afectará a todos los clientes que tienen esta tarjeta.",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: confirmDeleteCard,
        },
      ],
    });
  };

  const confirmDeleteCard = async () => {
    if (!loyaltyCard) return;

    setSaving(true);
    try {
      await LoyaltyCardService.deleteLoyaltyCard(loyaltyCard.id);
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad eliminada exitosamente!",
        buttons: [
          {
            text: "OK",
            onPress: () => {
              onClose();
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
  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (!loyaltyCard) {
    return <LoadingState error="Tarjeta de lealtad no encontrada" onRetry={() => onClose()} />;
  }
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
                <InputField
                  label="Nombre del Negocio"
                  value={formData.businessName}
                  onChangeText={(value) => updateFormData("businessName", value)}
                  placeholder="Ingresa el nombre de tu negocio"
                  error={errors.businessName}
                />
                <InputField
                  label="Número de Sellos Requeridos"
                  value={formData.totalSlots}
                  onChangeText={(value) => updateFormData("totalSlots", value)}
                  placeholder="ej., 10"
                  keyboardType="numeric"
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
                />
                <ColorPicker label="Color de la Tarjeta" selectedColor={formData.cardColor} onColorSelect={(color) => updateFormData("cardColor", color)} error={errors.cardColor} />
                <StampShapePicker label="Forma del Sello" selectedShape={formData.stampShape} onShapeSelect={(shape) => updateFormData("stampShape", shape)} error={errors.stampShape} />
              </View>
              <View style={styles.buttonContainer}>
                <Button title="Actualizar Tarjeta" onPress={handleUpdateCard} loading={saving} style={styles.updateButton} />
                <Button title="Eliminar Tarjeta" onPress={handleDeleteCard} variant="outline" loading={saving} style={styles.deleteButton} textStyle={{ color: COLORS.error }} />
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
  deleteButton: {
    borderWidth: 1,
    borderColor: COLORS.error,
  },
});
