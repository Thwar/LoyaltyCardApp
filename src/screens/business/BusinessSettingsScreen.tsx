import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { BusinessService } from "../../services/api";
import { Business } from "../../types";

interface BusinessSettingsScreenProps {
  navigation: StackNavigationProp<any>;
}

export const BusinessSettingsScreen: React.FC<BusinessSettingsScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [business, setBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBusiness();
  }, []);
  const loadBusiness = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const businesses = await BusinessService.getBusinessesByOwner(user.id);
      const userBusiness = businesses[0];

      if (userBusiness) {
        setBusiness(userBusiness);
        setFormData({
          name: userBusiness.name,
          description: userBusiness.description,
          address: userBusiness.address || "",
          phone: userBusiness.phone || "",
          email: userBusiness.email || "",
        });
      } else {
        // No business exists, prepare for creation
        setFormData({
          name: "",
          description: "",
          address: "",
          phone: "",
          email: user.email,
        });
      }
    } catch (error) {
      console.error("Failed to load business:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "El nombre del negocio es requerido";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La descripción es requerida";
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Por favor ingrese un email válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setSaving(true);
    try {
      const businessData = {
        name: formData.name,
        description: formData.description,
        ownerId: user.id,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        isActive: true,
      };

      console.log("Saving business data:", businessData);
      console.log("Business exists:", !!business);
      console.log("Business ID:", business?.id);
      if (business) {
        // Update existing business
        await BusinessService.updateBusiness(business.id, businessData);
        showAlert({
          title: "Éxito",
          message: "Perfil del negocio actualizado exitosamente",
        });
      } else {
        // Create new business
        const newBusiness = await BusinessService.createBusiness(businessData);
        setBusiness(newBusiness);
        showAlert({
          title: "Éxito",
          message: "Perfil del negocio creado exitosamente",
        });
      }
    } catch (error) {
      console.error("Error saving business:", error);
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al guardar el perfil del negocio",
      });
    } finally {
      setSaving(false);
    }
  };
  const handleLogout = () => {
    showAlert({
      title: "Cerrar Sesión",
      message: "¿Estás seguro que quieres cerrar sesión?",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: logout,
        },
      ],
    });
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (loading) {
    return <LoadingState loading={true} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Configuraciones del Negocio</Text>
            <Text style={styles.subtitle}>{business ? "Actualiza la información de tu negocio" : "Configura el perfil de tu negocio"}</Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Nombre del Negocio"
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
              placeholder="Ingresa el nombre de tu negocio"
              leftIcon="business"
              error={errors.name}
            />
            <InputField
              label="Descripción"
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              placeholder="Describe tu negocio"
              leftIcon="document-text"
              error={errors.description}
              multiline
            />
            <InputField
              label="Dirección (Opcional)"
              value={formData.address}
              onChangeText={(value) => updateFormData("address", value)}
              placeholder="Ingresa la dirección de tu negocio"
              leftIcon="location"
              error={errors.address}
              multiline
            />
            <InputField
              label="Teléfono (Opcional)"
              value={formData.phone}
              onChangeText={(value) => updateFormData("phone", value)}
              placeholder="Ingresa tu número de teléfono"
              keyboardType="phone-pad"
              leftIcon="call"
              error={errors.phone}
            />
            <InputField
              label="Email (Opcional)"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              placeholder="Ingresa el email de tu negocio"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
            />
            <Button title={business ? "Actualizar Perfil" : "Crear Perfil"} onPress={handleSave} loading={saving || reloading} size="large" style={styles.saveButton} />
          </View>

          {/* Account Section */}
          <View style={styles.accountSection}>
            <Text style={styles.accountTitle}>Cuenta</Text>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Sesión iniciada como:</Text>
              <Text style={styles.accountValue}>{user?.email}</Text>
            </View>
            <Button title="Cerrar Sesión" onPress={handleLogout} variant="outline" size="large" style={styles.logoutButton} />
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
  saveButton: {
    marginTop: SPACING.lg,
  },
  accountSection: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  accountTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  accountInfo: {
    marginBottom: SPACING.lg,
  },
  accountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  accountValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  logoutButton: {
    borderColor: COLORS.error,
  },
});
