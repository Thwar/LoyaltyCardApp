import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../context/AuthContext";
import { Button, InputField, useAlert } from "../components";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { AuthStackParamList } from "../types";
import { testFirebaseConnection } from "../utils/firebaseTest";

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Register">;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    userType: "customer" as "customer" | "business",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleRegister = async () => {
    if (!validateForm()) return; // Test Firebase connection first
    const isFirebaseConnected = testFirebaseConnection();
    if (!isFirebaseConnected) {
      showAlert({
        title: "Configuration Error",
        message: "Firebase is not properly configured. Please check the console for details.",
      });
      return;
    }

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.displayName, formData.userType);
      // Navigation will be handled by the auth context
    } catch (error) {
      console.error("Registration error details:", error);
      showAlert({
        title: "Registration Failed",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate("Login");
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join LoyaltyCard today</Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Full Name"
              value={formData.displayName}
              onChangeText={(value) => updateFormData("displayName", value)}
              placeholder="Enter your full name"
              leftIcon="person"
              error={errors.displayName}
            />

            <InputField
              label="Email"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
            />

            <InputField
              label="Password"
              value={formData.password}
              onChangeText={(value) => updateFormData("password", value)}
              placeholder="Create a password"
              isPassword
              leftIcon="lock-closed"
              error={errors.password}
            />

            <InputField
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData("confirmPassword", value)}
              placeholder="Confirm your password"
              isPassword
              leftIcon="lock-closed"
              error={errors.confirmPassword}
            />

            {/* User Type Selection */}
            <View style={styles.userTypeSection}>
              <Text style={styles.userTypeLabel}>I am a:</Text>
              <View style={styles.userTypeButtons}>
                <Button
                  title="Customer"
                  onPress={() => updateFormData("userType", "customer")}
                  variant={formData.userType === "customer" ? "primary" : "outline"}
                  size="medium"
                  style={styles.userTypeButton}
                />
                <Button
                  title="Business Owner"
                  onPress={() => updateFormData("userType", "business")}
                  variant={formData.userType === "business" ? "primary" : "outline"}
                  size="medium"
                  style={styles.userTypeButton}
                />
              </View>
            </View>

            <Button title="Create Account" onPress={handleRegister} loading={loading} size="large" style={styles.registerButton} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.linkText} onPress={navigateToLogin}>
                Sign in
              </Text>
            </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  form: {
    flex: 1,
  },
  userTypeSection: {
    marginBottom: SPACING.lg,
  },
  userTypeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  userTypeButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  userTypeButton: {
    flex: 1,
  },
  registerButton: {
    marginTop: SPACING.lg,
  },
  footer: {
    alignItems: "center",
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
