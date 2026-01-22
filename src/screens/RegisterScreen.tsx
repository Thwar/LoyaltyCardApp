import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Image } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../context/AuthContext";
import { Button, InputField, useAlert, SSOButton } from "../components";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { AuthStackParamList } from "../types";
import { testFirebaseConnection } from "../utils/firebaseTest";
import { BusinessService } from "../services/api";
import { auth } from "../services/firebase";

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Register">;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register, signInWithGoogle, signInWithFacebook } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    userType: "customer" as "customer" | "business",
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) {
      newErrors.displayName = formData.userType === "business" ? "El nombre del negocio es requerido" : "El nombre es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Por favor ingrese un email válido";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleRegister = async () => {
    if (!validateForm()) return; // Test Firebase connection first
    const isFirebaseConnected = testFirebaseConnection();
    if (!isFirebaseConnected) {
      showAlert({
        title: "Error de Configuración",
        message: "Firebase is not properly configured. Please check the console for details.",
      });
      return;
    }

    setLoading(true);
    try {
      const userData = await register(formData.email, formData.password, formData.displayName, formData.userType);

      // If registering as business, create the business profile automatically
      if (formData.userType === "business") {
        try {
          await BusinessService.createBusiness({
            name: formData.displayName,
            description: "",
            ownerId: userData.id,
            isActive: true,
          });
        } catch (businessError) {
          console.error("Error creating business profile:", businessError);
          showAlert({
            title: "Advertencia",
            message: "Tu cuenta fue creada exitosamente, pero hubo un problema al crear el perfil del negocio. Puedes completarlo más tarde en la configuración.",
          });
        }
      }

      // Navigation will be handled by the auth context
    } catch (error) {
      console.error("Registration error details:", error);
      showAlert({
        title: "Error de Registro",
        message: error instanceof Error ? error.message : "Ocurrió un error inesperado",
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate("Login");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      console.log("RegisterScreen: Starting Google Sign-In process");
      await signInWithGoogle(true, formData.userType);
      console.log("RegisterScreen: Google Sign-In process completed successfully");

      // If registering as business via Google, create the business profile automatically
      if (formData.userType === "business") {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            await BusinessService.createBusiness({
              name: formData.displayName || currentUser.displayName || "Mi Negocio",
              description: "",
              ownerId: currentUser.uid,
              isActive: true,
            });
          }
        } catch (businessError) {
          console.error("Error creating business profile:", businessError);
          showAlert({
            title: "Advertencia",
            message: "Tu cuenta fue creada exitosamente, pero hubo un problema al crear el perfil del negocio. Puedes completarlo más tarde en la configuración.",
          });
        }
      }
    } catch (error) {
      console.error("RegisterScreen: Google Sign-In error caught:", error);
      showAlert({
        title: "Error de Google",
        message: error instanceof Error ? error.message : "Error al registrarse con Google",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setFacebookLoading(true);
    try {
      console.log("RegisterScreen: Starting Facebook Sign-In process");
      await signInWithFacebook(true, formData.userType);
      console.log("RegisterScreen: Facebook Sign-In process completed successfully");

      // If registering as business via Facebook, create the business profile automatically
      if (formData.userType === "business") {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            await BusinessService.createBusiness({
              name: formData.displayName || currentUser.displayName || "Mi Negocio",
              description: "",
              ownerId: currentUser.uid,
              isActive: true,
            });
          }
        } catch (businessError) {
          console.error("Error creating business profile:", businessError);
          showAlert({
            title: "Advertencia",
            message: "Tu cuenta fue creada exitosamente, pero hubo un problema al crear el perfil del negocio. Puedes completarlo más tarde en la configuración.",
          });
        }
      }
    } catch (error) {
      console.error("RegisterScreen: Facebook Sign-In error caught:", error);
      showAlert({
        title: "Error de Facebook",
        message: error instanceof Error ? error.message : "Error al registrarse con Facebook",
      });
    } finally {
      setFacebookLoading(false);
    }
  };
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => {
      // If changing user type, clear the display name since the field meaning changes
      if (field === "userType" && prev.userType !== value) {
        return { ...prev, [field]: value, displayName: "" };
      }
      return { ...prev, [field]: value };
    });
    // Clear error when user starts typing or changes user type
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    // Clear display name error when switching user type
    if (field === "userType" && errors.displayName) {
      setErrors((prev) => ({ ...prev, displayName: "" }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image source={require("../../assets/logo-small-icon.png")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Crea tu cuenta para empezar</Text>
          </View>
          <View style={styles.form}>
            <InputField
              label={formData.userType === "business" ? "Nombre del Negocio" : "Nombre Completo"}
              value={formData.displayName}
              onChangeText={(value) => updateFormData("displayName", value)}
              placeholder={formData.userType === "business" ? "Ingresa el nombre de tu negocio" : "Ingresa tu nombre completo"}
              leftIcon="person"
              error={errors.displayName}
            />
            <InputField
              label="Correo Electrónico"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              placeholder="Ingresa tu correo electrónico"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
            />
            <InputField
              label="Contraseña"
              value={formData.password}
              onChangeText={(value) => updateFormData("password", value)}
              placeholder="Crea una contraseña"
              isPassword
              leftIcon="lock-closed"
              error={errors.password}
            />
            <InputField
              label="Confirmar Contraseña"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData("confirmPassword", value)}
              placeholder="Confirma tu contraseña"
              isPassword
              leftIcon="lock-closed"
              error={errors.confirmPassword}
            />
            {/* User Type Selection */}
            <View style={styles.userTypeSection}>
              <Text style={styles.userTypeLabel}>Soy un:</Text>
              <View style={styles.userTypeButtons}>
                <Button
                  title="Cliente"
                  onPress={() => updateFormData("userType", "customer")}
                  variant={formData.userType === "customer" ? "primary" : "outline"}
                  size="medium"
                  style={styles.userTypeButton}
                />
                <Button
                  title="Dueño de Negocio"
                  onPress={() => updateFormData("userType", "business")}
                  variant={formData.userType === "business" ? "primary" : "outline"}
                  size="medium"
                  style={styles.userTypeButton}
                />
              </View>
            </View>
            <Button title="Crear Cuenta" onPress={handleRegister} loading={loading} size="large" style={styles.registerButton} />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O regístrate con</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.ssoContainer}>
              <SSOButton provider="google" onPress={handleGoogleSignIn} loading={googleLoading} disabled={loading || facebookLoading} style={styles.ssoButton} />
              <SSOButton provider="facebook" onPress={handleFacebookSignIn} loading={facebookLoading} disabled={loading || googleLoading} style={styles.ssoButton} />
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Ya tienes una cuenta?{" "}
              <Text style={styles.linkText} onPress={navigateToLogin}>
                Iniciar sesión
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
  logo: {
    width: 300,
    height: 130,
    marginBottom: SPACING.md,
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.inputBorder,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  ssoContainer: {
    gap: SPACING.sm,
  },
  ssoButton: {
    marginVertical: 0,
  },
});
