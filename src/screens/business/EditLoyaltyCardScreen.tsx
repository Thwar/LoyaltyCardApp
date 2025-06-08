import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService } from "../../services/api";
import { LoyaltyCard } from "../../types";

interface EditLoyaltyCardScreenProps {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ EditLoyaltyCard: { loyaltyCardId: string } }, "EditLoyaltyCard">;
}

export const EditLoyaltyCardScreen: React.FC<EditLoyaltyCardScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { loyaltyCardId } = route.params;

  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [formData, setFormData] = useState({
    businessName: "",
    totalSlots: "",
    rewardDescription: "",
    stampDescription: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLoyaltyCard();
  }, [loyaltyCardId]);

  const loadLoyaltyCard = async () => {
    try {
      setLoading(true);
      const card = await LoyaltyCardService.getLoyaltyCard(loyaltyCardId);
      if (card) {
        setLoyaltyCard(card);
        setFormData({
          businessName: card.businessName,
          totalSlots: card.totalSlots.toString(),
          rewardDescription: card.rewardDescription,
          stampDescription: card.stampDescription,
        });
      }
    } catch (error) {
      showAlert({
        title: "Error",
        message: "Failed to load loyalty card details",
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
      newErrors.businessName = "Business name is required";
    }

    const slotsNum = parseInt(formData.totalSlots);
    if (!formData.totalSlots || isNaN(slotsNum) || slotsNum < 1 || slotsNum > 20) {
      newErrors.totalSlots = "Slots must be between 1 and 20";
    }

    if (!formData.rewardDescription.trim()) {
      newErrors.rewardDescription = "Reward description is required";
    }

    if (!formData.stampDescription.trim()) {
      newErrors.stampDescription = "Stamp description is required";
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
        stampDescription: formData.stampDescription.trim(),
      };
      await LoyaltyCardService.updateLoyaltyCard(loyaltyCard.id, updates);

      showAlert({
        title: "Success",
        message: "Loyalty card updated successfully!",
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
        message: error instanceof Error ? error.message : "Failed to update loyalty card",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteCard = () => {
    showAlert({
      title: "Delete Loyalty Card",
      message: "Are you sure you want to delete this loyalty card? This action cannot be undone and will affect all customers who have this card.",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
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
        title: "Success",
        message: "Loyalty card deleted successfully!",
        buttons: [
          {
            text: "OK",
            onPress: () => navigation.navigate("BusinessTabs", { screen: "Dashboard" }),
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete loyalty card",
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (!loyaltyCard) {
    return <LoadingState error="Loyalty card not found" onRetry={() => navigation.goBack()} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.content}>
            <Text style={styles.title}>Edit Loyalty Card</Text>
            <Text style={styles.subtitle}>Update your loyalty card details</Text>

            <View style={styles.form}>
              <InputField
                label="Business Name"
                value={formData.businessName}
                onChangeText={(value) => updateFormData("businessName", value)}
                placeholder="Enter your business name"
                error={errors.businessName}
              />{" "}
              <InputField
                label="Number of Stamps Required"
                value={formData.totalSlots}
                onChangeText={(value) => updateFormData("totalSlots", value)}
                placeholder="e.g., 10"
                keyboardType="numeric"
                error={errors.totalSlots}
              />{" "}
              <InputField
                label="Reward Description"
                value={formData.rewardDescription}
                onChangeText={(value) => updateFormData("rewardDescription", value)}
                placeholder="e.g., Free coffee"
                multiline
                numberOfLines={3}
                error={errors.rewardDescription}
              />{" "}
              <InputField
                label="Stamp Description"
                value={formData.stampDescription}
                onChangeText={(value) => updateFormData("stampDescription", value)}
                placeholder="e.g., Purchase any drink"
                multiline
                numberOfLines={3}
                error={errors.stampDescription}
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button title="Update Card" onPress={handleUpdateCard} loading={saving} style={styles.updateButton} />{" "}
              <Button title="Delete Card" onPress={handleDeleteCard} variant="outline" loading={saving} style={styles.deleteButton} textStyle={{ color: COLORS.error }} />
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
