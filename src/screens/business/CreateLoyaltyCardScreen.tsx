import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, Dropdown, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService, BusinessService } from "../../services/api";
import { BusinessStackParamList } from "../../types";

interface CreateLoyaltyCardScreenProps {
  navigation: StackNavigationProp<BusinessStackParamList, "CreateCard">;
}

export const CreateLoyaltyCardScreen: React.FC<
  CreateLoyaltyCardScreenProps
> = ({ navigation }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    totalSlots: "10",
    rewardDescription: "",
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
    if (
      !formData.totalSlots ||
      isNaN(slotsNum) ||
      slotsNum < 3 ||
      slotsNum > 20
    ) {
      newErrors.totalSlots = "Los sellos deben estar entre 3 y 20";
    }
    if (!formData.rewardDescription.trim()) {
      newErrors.rewardDescription =
        "La descripción de la recompensa es requerida";
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
        throw new Error(
          "No se encontró el perfil del negocio. Por favor, contacta al soporte."
        );
      }
      const businessId = businesses[0].id; // Use the first business found

      const cardData = {
        businessId: businessId,
        businessName: businesses[0].name,
        businessLogo: businesses[0].logoUrl,
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription,
        isActive: true,
      };

      await LoyaltyCardService.createLoyaltyCard(cardData);

      showAlert({
        title: "¡Éxito!",
        message: "Tu tarjeta de lealtad ha sido creada exitosamente.",
        buttons: [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Error al crear la tarjeta de lealtad",
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Crear Tarjeta de Lealtad</Text>
            <Text style={styles.subtitle}>
              Configura un nuevo programa de lealtad para tus clientes
            </Text>
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
              onChangeText={(value) =>
                updateFormData("rewardDescription", value)
              }
              placeholder="ej., Café gratis o 20% de descuento en la próxima compra"
              leftIcon="gift"
              error={errors.rewardDescription}
              multiline
            />

            {/* Preview Section */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Vista Previa</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewBusinessName}>
                  {"Nombre de Tu Negocio"}
                </Text>
                <Text style={styles.previewStamps}>
                  0 / {formData.totalSlots || "10"} sellos
                </Text>
                <Text style={styles.previewReward}>
                  Recompensa:
                  {formData.rewardDescription || "Descripción de tu recompensa"}
                </Text>
              </View>
            </View>
            <Button
              title="Crear Tarjeta de Lealtad"
              onPress={handleCreateCard}
              loading={loading}
              size="large"
              style={styles.createButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    backgroundColor: COLORS.primary,
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
  previewStampDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.sm,
  },
  previewReward: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.9,
  },
  createButton: {
    marginTop: SPACING.lg,
  },
});
