import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { LoyaltyCardService } from "../../services/api";

interface CreateLoyaltyCardScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CreateLoyaltyCardScreen: React.FC<CreateLoyaltyCardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    businessName: "",
    totalSlots: "10",
    rewardDescription: "",
    stampDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleCreateCard = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      const cardData = {
        businessId: user.id, // For simplicity, using user ID as business ID
        businessName: formData.businessName,
        totalSlots: parseInt(formData.totalSlots),
        rewardDescription: formData.rewardDescription,
        stampDescription: formData.stampDescription,
        isActive: true,
      };
      await LoyaltyCardService.createLoyaltyCard(cardData);

      showAlert({
        title: "Success!",
        message: "Your loyalty card has been created successfully.",
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
        message: error instanceof Error ? error.message : "Failed to create loyalty card",
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create Loyalty Card</Text>
            <Text style={styles.subtitle}>Set up a new loyalty program for your customers</Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Business Name"
              value={formData.businessName}
              onChangeText={(value) => updateFormData("businessName", value)}
              placeholder="Enter your business name"
              leftIcon="business"
              error={errors.businessName}
            />

            <InputField
              label="Number of Stamps Required"
              value={formData.totalSlots}
              onChangeText={(value) => updateFormData("totalSlots", value)}
              placeholder="e.g., 10"
              keyboardType="numeric"
              leftIcon="star"
              error={errors.totalSlots}
            />

            <InputField
              label="How to Earn a Stamp"
              value={formData.stampDescription}
              onChangeText={(value) => updateFormData("stampDescription", value)}
              placeholder="e.g., Buy any coffee or Purchase $10 or more"
              leftIcon="checkmark-circle"
              error={errors.stampDescription}
              multiline
            />

            <InputField
              label="Reward Description"
              value={formData.rewardDescription}
              onChangeText={(value) => updateFormData("rewardDescription", value)}
              placeholder="e.g., Free coffee or 20% off next purchase"
              leftIcon="gift"
              error={errors.rewardDescription}
              multiline
            />

            {/* Preview Section */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewBusinessName}>{formData.businessName || "Your Business Name"}</Text>
                <Text style={styles.previewStamps}>0 / {formData.totalSlots || "10"} stamps</Text>
                <Text style={styles.previewStampDesc}>{formData.stampDescription || "How to earn stamps"}</Text>
                <Text style={styles.previewReward}>Reward: {formData.rewardDescription || "Your reward description"}</Text>
              </View>
            </View>

            <Button title="Create Loyalty Card" onPress={handleCreateCard} loading={loading} size="large" style={styles.createButton} />
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
