import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../context/AuthContext";
import { Button, InputField, useAlert } from "../components";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { AuthStackParamList } from "../types";

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Login">;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, resetPassword } = useAuth();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Por favor ingrese un email válido";
    }

    if (!password) {
      newErrors.password = "La contraseña es requerida";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log("LoginScreen: Starting login process");
      await login(email, password);
      console.log("LoginScreen: Login process completed successfully");
      // Navigation will be handled by the auth context when user state changes
    } catch (error) {
      console.error("LoginScreen: Login error caught:", error);
      showAlert({
        title: "Login Incorrecto",
        message: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
      // Clear form on error to prevent confusion
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showAlert({
        title: "Email Requerido",
        message: "Por favor ingresa tu correo electrónico para enviar las instrucciones de restablecimiento de contraseña.",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showAlert({
        title: "Email Inválido",
        message: "Por favor ingresa una dirección de correo electrónico válida.",
      });
      return;
    }

    setResetPasswordLoading(true);
    try {
      await resetPassword(email);
      showAlert({
        title: "Email Enviado",
        message: "Se han enviado las instrucciones para restablecer tu contraseña a tu correo electrónico. Por favor revisa tu bandeja de entrada y spam.",
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Ocurrió un error al enviar el email de restablecimiento.",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate("Register");
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Bienvenido de Vuelta</Text>
            <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>
          </View>
          <View style={styles.form}>
            <InputField
              label="Correo Electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="Ingresa tu correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
            />
            <InputField label="Contraseña" value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" isPassword leftIcon="lock-closed" error={errors.password} />

            <View style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText} onPress={handleForgotPassword} disabled={resetPasswordLoading}>
                {resetPasswordLoading ? "Enviando..." : "¿Olvidaste tu contraseña?"}
              </Text>
            </View>

            <Button title="Iniciar Sesión" onPress={handleLogin} loading={loading} size="large" style={styles.loginButton} />
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No tienes una cuenta?{" "}
              <Text style={styles.linkText} onPress={navigateToRegister}>
                Regístrate
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
    marginTop: SPACING.xl,
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
    justifyContent: "center",
  },
  loginButton: {
    marginTop: SPACING.lg,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  forgotPasswordText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: "600",
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
