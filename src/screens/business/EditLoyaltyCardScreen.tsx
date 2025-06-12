import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService } from "../../services/api";
import { LoyaltyCard, BusinessStackParamList } from "../../types";

interface EditLoyaltyCardScreenProps {
  navigation: StackNavigationProp<BusinessStackParamList, "EditCard">;
  route: RouteProp<BusinessStackParamList, "EditCard">;
}

export const EditLoyaltyCardScreen: React.FC<EditLoyaltyCardScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { cardId } = route.params;

  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    totalSlots: "",
    rewardDescription: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    loadLoyaltyCard();
  }, [cardId]);

  const loadLoyaltyCard = async () => {
    try {
      setLoading(true);
      const card = await LoyaltyCardService.getLoyaltyCard(cardId);
      if (card) {
        setLoyaltyCard(card);
        setFormData({
          businessName: card.businessName,
          totalSlots: card.totalSlots.toString(),
          rewardDescription: card.rewardDescription,
        });
      }
    } catch (error) {
      showAlert({
        title: "Error",
        message: "Error al cargar los detalles de la tarjeta de lealtad",
      });
      navigation.goBack();
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
    if (
      !formData.totalSlots ||
      isNaN(slotsNum) ||
      slotsNum < 1 ||
      slotsNum > 20
    ) {
      newErrors.totalSlots = "Los sellos deben estar entre 1 y 20";
    }
    if (!formData.rewardDescription.trim()) {
      newErrors.rewardDescription =
        "La descripción de la recompensa es requerida";
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
      };
      await LoyaltyCardService.updateLoyaltyCard(loyaltyCard.id, updates);
      showAlert({
        title: "Éxito",
        message: "¡Tarjeta de lealtad actualizada exitosamente!",
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
            : "Error al actualizar la tarjeta de lealtad",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteCard = () => {
    showAlert({
      title: "Eliminar Tarjeta de Lealtad",
      message:
        "¿Estás seguro que quieres eliminar esta tarjeta de lealtad? Esta acción no se puede deshacer y afectará a todos los clientes que tienen esta tarjeta.",
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
            onPress: () => navigation.navigate("BusinessTabs"),
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message:
          error instanceof Error
            ? error.message
            : "Error al eliminar la tarjeta de lealtad",
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (!loyaltyCard) {
    return (
      <LoadingState
        error="Tarjeta de lealtad no encontrada"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text style={styles.title}>Editar Tarjeta de Lealtad</Text>
            <Text style={styles.subtitle}>
              Actualiza los detalles de tu tarjeta de lealtad
            </Text>
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
                onChangeText={(value) =>
                  updateFormData("rewardDescription", value)
                }
                placeholder="ej., Café gratis"
                multiline
                numberOfLines={3}
                error={errors.rewardDescription}
              />
            </View>
            <View style={styles.buttonContainer}>
              <Button
                title="Actualizar Tarjeta"
                onPress={handleUpdateCard}
                loading={saving}
                style={styles.updateButton}
              />
              <Button
                title="Eliminar Tarjeta"
                onPress={handleDeleteCard}
                variant="outline"
                loading={saving}
                style={styles.deleteButton}
                textStyle={{ color: COLORS.error }}
              />
            </View>
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
  keyboardView: {
    flex: 1,
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
