import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert, Dropdown, ImagePicker, MultiSelectDropdown } from "../../components";
import { COLORS, FONT_SIZES, SPACING, BUSINESS_CATEGORIES } from "../../constants";
import { BusinessService } from "../../services/api";
import { ImageUploadService } from "../../services/imageUpload";
import { Business } from "../../types";
import { testStoragePermissions } from "../../utils/firebaseTest";

interface BusinessSettingsScreenProps {
  navigation: StackNavigationProp<any>;
}

export const BusinessSettingsScreen: React.FC<BusinessSettingsScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [business, setBusiness] = useState<Business | null>(null);

  // Bolivian cities dropdown options
  const bolivianCities = [
    { label: "La Paz", value: "la_paz" },
    { label: "Santa Cruz de la Sierra", value: "santa_cruz" },
    { label: "Cochabamba", value: "cochabamba" },
    { label: "Sucre", value: "sucre" },
    { label: "Oruro", value: "oruro" },
    { label: "Potosí", value: "potosi" },
    { label: "Tarija", value: "tarija" },
    { label: "Trinidad", value: "trinidad" },
    { label: "Cobija", value: "cobija" },
  ];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    city: "",
    logoUrl: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    categories: [] as string[],
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
          city: userBusiness.city || "",
          logoUrl: userBusiness.logoUrl || "",
          instagram: userBusiness.instagram || "",
          facebook: userBusiness.facebook || "",
          tiktok: userBusiness.tiktok || "",
          categories: userBusiness.categories || [],
        });
      } else {
        // No business exists, prepare for creation
        setFormData({
          name: "",
          description: "",
          address: "",
          phone: "",
          city: "",
          logoUrl: "",
          instagram: "",
          facebook: "",
          tiktok: "",
          categories: [],
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setSaving(true);
    try {
      let logoUrl = formData.logoUrl;

      // If a new image was selected (local URI), upload it
      if (formData.logoUrl && !formData.logoUrl.startsWith("http")) {
        try {
          // Create a temporary business ID for new businesses
          const businessId = business?.id || `temp_${user.id}_${Date.now()}`;
          console.log("Uploading logo for business ID:", businessId);
          console.log("User ID:", user.id);

          logoUrl = await ImageUploadService.uploadBusinessLogo(formData.logoUrl, businessId);
        } catch (uploadError) {
          console.error("Error uploading logo:", uploadError);

          // Check if it's a CORS error
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          if (errorMessage.includes("CORS") || errorMessage.includes("Access-Control")) {
            showAlert({
              title: "Error de Configuración",
              message: "Error de CORS en Firebase Storage. Por favor consulta FIREBASE_CORS_SETUP.md para configurar CORS. Usando imagen temporal.",
            });

            // For development, allow using the data URL directly (not recommended for production)
            if (formData.logoUrl.startsWith("data:")) {
              logoUrl = formData.logoUrl;
            } else {
              logoUrl = "";
            }
          } else if (errorMessage.includes("unauthorized") || errorMessage.includes("permission")) {
            showAlert({
              title: "Error de Permisos",
              message: "No tienes permisos para subir imágenes. Por favor verifica que estés autenticado y que las reglas de Firebase Storage estén configuradas correctamente.",
            });
            logoUrl = ""; // Save without logo if upload fails
          } else {
            showAlert({
              title: "Error de Subida",
              message: "No se pudo subir el logo. El negocio se guardará sin logo.",
            });
            logoUrl = ""; // Save without logo if upload fails
          }
        }
      }

      const businessData = {
        name: formData.name,
        description: formData.description,
        ownerId: user.id,
        address: formData.address || undefined,
        phone: formData.phone || undefined,
        city: formData.city || undefined,
        logoUrl: logoUrl || undefined,
        instagram: formData.instagram || undefined,
        facebook: formData.facebook || undefined,
        tiktok: formData.tiktok || undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        isActive: true,
      };

      console.log("Saving business data:", businessData);
      console.log("Business exists:", !!business);
      console.log("Business ID:", business?.id);

      if (business) {
        // Update existing business
        await BusinessService.updateBusiness(business.id, businessData);

        // Update the form data with the uploaded logo URL
        setFormData((prev) => ({ ...prev, logoUrl: logoUrl }));

        showAlert({
          title: "Éxito",
          message: "Perfil del negocio actualizado exitosamente",
        });
      } else {
        // Create new business
        const newBusiness = await BusinessService.createBusiness(businessData);
        setBusiness(newBusiness);

        // Update the form data with the uploaded logo URL
        setFormData((prev) => ({ ...prev, logoUrl: logoUrl }));

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
      message: "¿Estás seguro de que quieres cerrar sesión?",
      buttons: [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Salir",
          style: "destructive",
          onPress: logout,
        },
      ],
    });
  };

  const updateFormData = (field: string, value: string | string[]) => {
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
            <ImagePicker
              label="Logo del Negocio"
              value={formData.logoUrl}
              onImageSelect={(uri) => updateFormData("logoUrl", uri)}
              placeholder="Selecciona el logo de tu negocio"
              error={errors.logoUrl}
              uploading={saving}
            />
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
            <MultiSelectDropdown
              label="Categorías del Negocio"
              values={formData.categories}
              options={BUSINESS_CATEGORIES}
              onSelect={(values) => updateFormData("categories", values)}
              placeholder="Selecciona hasta 2 categorías que describan tu negocio"
              maxSelections={2}
              error={errors.categories}
            />
            <Dropdown label="Ciudad" value={formData.city} options={bolivianCities} onSelect={(value) => updateFormData("city", value)} placeholder="Selecciona tu ciudad" error={errors.city} />
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

            {/* Social Media Section */}
            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Redes Sociales (Opcional)</Text>
              <InputField
                label="Instagram"
                value={formData.instagram}
                onChangeText={(value) => updateFormData("instagram", value)}
                placeholder="@tu_usuario_instagram"
                leftIcon="logo-instagram"
                error={errors.instagram}
              />
              <InputField
                label="Facebook"
                value={formData.facebook}
                onChangeText={(value) => updateFormData("facebook", value)}
                placeholder="tu.pagina.facebook"
                leftIcon="logo-facebook"
                error={errors.facebook}
              />
              <InputField
                label="TikTok"
                value={formData.tiktok}
                onChangeText={(value) => updateFormData("tiktok", value)}
                placeholder="@tu_usuario_tiktok"
                leftIcon="logo-tiktok"
                error={errors.tiktok}
              />
            </View>
            <Button title={business ? "Actualizar Perfil" : "Crear Perfil"} onPress={handleSave} loading={saving} size="large" style={styles.saveButton} />
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
  socialSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  socialTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
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
  testButton: {
    marginBottom: SPACING.md,
  },
});
