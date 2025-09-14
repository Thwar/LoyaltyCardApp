import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert, Dropdown, ImagePicker, MultiSelectDropdown } from "../../components";
import { COLORS, FONT_SIZES, SPACING, BUSINESS_CATEGORIES } from "../../constants";
import { BusinessService, UserService } from "../../services/api";
import { ImageUploadService } from "../../services/imageUpload";
import { Business } from "../../types";

interface BusinessSettingsScreenProps {
  navigation: StackNavigationProp<any>;
}

export const BusinessSettingsScreen: React.FC<BusinessSettingsScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [business, setBusiness] = useState<Business | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

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
          name: userBusiness.name || "",
          description: userBusiness.description || "",
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

    // Safe check for name field
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "El nombre del negocio es requerido";
    }

    // Safe check for description field
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = "La descripción es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // Helper function to handle logo upload errors
  const handleLogoUploadError = async (uploadError: any, logoUri: string): Promise<string> => {
    const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);

    if (errorMessage.includes("CORS") || errorMessage.includes("Access-Control")) {
      showAlert({
        title: "Error de Configuración",
        message: "Error de CORS en Firebase Storage. Por favor consulta FIREBASE_CORS_SETUP.md para configurar CORS. Usando imagen temporal.",
      });

      // For development, allow using the data URL directly (not recommended for production)
      if (logoUri.startsWith("data:")) {
        return logoUri;
      } else {
        return "";
      }
    } else if (errorMessage.includes("unauthorized") || errorMessage.includes("permission")) {
      showAlert({
        title: "Error de Permisos",
        message: "No tienes permisos para subir imágenes. Por favor verifica que estés autenticado y que las reglas de Firebase Storage estén configuradas correctamente.",
      });
      return ""; // Save without logo if upload fails
    } else {
      showAlert({
        title: "Error de Subida",
        message: "No se pudo subir el logo. El negocio se guardará sin logo.",
      });
      return ""; // Save without logo if upload fails
    }
  };

  const handleSave = async () => {
    const isFormValid = validateForm();

    if (!isFormValid) {
      // Create a more specific error message based on missing fields
      const missingFields = [];
      if (!formData.name || !formData.name.trim()) missingFields.push("Nombre del Negocio");
      if (!formData.description || !formData.description.trim()) missingFields.push("Descripción");

      // Scroll to top to show the error fields
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      showAlert({
        title: "Campos Requeridos",
        message: `Los siguientes campos son obligatorios:\n\n• ${missingFields.join("\n• ")}\n\nPor favor completa todos los campos marcados en rojo.`,
      });
      return;
    }

    if (!user) {
      showAlert({
        title: "Error de Autenticación",
        message: "Debes estar autenticado para realizar esta acción. Por favor inicia sesión nuevamente.",
      });
      return;
    }

    setSaving(true);

    try {
      let logoUrl = formData.logoUrl;
      let currentBusinessId = business?.id;

      if (business) {
        // Update existing business

        // If a new image was selected (local URI), upload it
        if (formData.logoUrl && !formData.logoUrl.startsWith("http") && currentBusinessId) {
          try {
            logoUrl = await ImageUploadService.uploadBusinessLogo(formData.logoUrl, currentBusinessId);
          } catch (uploadError) {
            console.error("Error uploading logo:", uploadError);
            logoUrl = await handleLogoUploadError(uploadError, formData.logoUrl);
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

        await BusinessService.updateBusiness(business.id, businessData);

        // Update the form data with the uploaded logo URL
        setFormData((prev) => ({ ...prev, logoUrl: logoUrl }));

        showAlert({
          title: "Éxito",
          message: "Perfil del negocio actualizado exitosamente",
        });
      } else {
        // Create new business - first create without logo, then upload logo
        const businessDataWithoutLogo = {
          name: formData.name,
          description: formData.description,
          ownerId: user.id,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          city: formData.city || undefined,
          logoUrl: undefined, // Create without logo first
          instagram: formData.instagram || undefined,
          facebook: formData.facebook || undefined,
          tiktok: formData.tiktok || undefined,
          categories: formData.categories.length > 0 ? formData.categories : undefined,
          isActive: true,
        };

        const newBusiness = await BusinessService.createBusiness(businessDataWithoutLogo);
        setBusiness(newBusiness);
        currentBusinessId = newBusiness.id;

        // Now upload the logo with the real business ID
        if (formData.logoUrl && !formData.logoUrl.startsWith("http")) {
          try {
            logoUrl = await ImageUploadService.uploadBusinessLogo(formData.logoUrl, currentBusinessId);

            // Update the business with the logo URL
            await BusinessService.updateBusiness(currentBusinessId, { logoUrl });

            // Update local business object
            setBusiness({ ...newBusiness, logoUrl });
          } catch (uploadError) {
            console.error("Error uploading logo for new business:", uploadError);
            logoUrl = await handleLogoUploadError(uploadError, formData.logoUrl);

            // If we got a valid logo URL, update the business
            if (logoUrl) {
              await BusinessService.updateBusiness(currentBusinessId, { logoUrl });
              setBusiness({ ...newBusiness, logoUrl });
            }
          }
        }

        // Update the form data with the uploaded logo URL
        setFormData((prev) => ({ ...prev, logoUrl: logoUrl }));

        showAlert({
          title: "Éxito",
          message: "Perfil del negocio creado exitosamente",
        });
      }
    } catch (error) {
      console.error("Error saving business:", error);

      const errorMessage = error instanceof Error ? error.message : "Error al guardar el perfil del negocio";

      showAlert({
        title: "Error al Guardar",
        message: `No se pudo guardar el perfil del negocio.\n\nDetalle: ${errorMessage}\n\nPor favor revisa tu conexión a internet e intenta nuevamente.`,
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

  const handleLogoutAllDevices = () => {
    showAlert({
      title: "Cerrar sesión en todos los dispositivos",
      message:
        "Esto cerrará la sesión en todos los demás dispositivos donde esté iniciada con esta cuenta. Úsalo cuando un empleado deja de trabajar o se pierde un dispositivo. ¿Deseas continuar?",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar en otros",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOutAll(true);
            try {
              await UserService.logoutAllDevicesExceptCurrent();
              showAlert({
                title: "Listo",
                message: "Se pidió cerrar sesión en los otros dispositivos. Puede tardar unos segundos.",
              });
            } catch (e: any) {
              showAlert({
                title: "Error",
                message: e?.message || "No se pudo cerrar sesión en los otros dispositivos.",
              });
            } finally {
              setIsLoggingOutAll(false);
            }
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: "⚠️ ELIMINAR CUENTA",
      message:
        "Esta acción eliminará PERMANENTEMENTE tu cuenta y TODOS los datos asociados, incluyendo:\n\n• Tu perfil de negocio\n• Todas las tarjetas de lealtad\n• Todos los clientes y sellos\n• Todas las imágenes y archivos\n\nEsta acción NO se puede deshacer.\n\n¿Estás completamente seguro?",
      buttons: [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "ELIMINAR",
          style: "destructive",
          onPress: confirmDeleteAccount,
        },
      ],
    });
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await UserService.deleteAccount();

      // If we reach here, the account was deleted successfully
      // No need to show success message as user will be signed out
    } catch (error) {
      console.error("Error deleting account:", error);

      // Handle the requires-recent-login error specifically
      if (error instanceof Error && error.message.includes("autenticarte")) {
        showAlert({
          title: "Autenticación Requerida",
          message: "Por seguridad, necesitas volver a iniciar sesión antes de eliminar tu cuenta. ¿Quieres cerrar sesión ahora para volver a autenticarte?",
          buttons: [
            {
              text: "Cancelar",
              style: "cancel",
            },
            {
              text: "Cerrar Sesión",
              style: "destructive",
              onPress: () => {
                logout();
                showAlert({
                  title: "Información",
                  message: "Después de iniciar sesión nuevamente, podrás eliminar tu cuenta desde la sección de configuración.",
                });
              },
            },
          ],
        });
      } else {
        showAlert({
          title: "Error al Eliminar Cuenta",
          message: error instanceof Error ? error.message : "Ocurrió un error inesperado al eliminar la cuenta. Por favor contacta al soporte técnico.",
        });
      }
    } finally {
      setIsDeleting(false);
    }
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
        <ScrollView ref={scrollViewRef} style={styles.scrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Datos sobre tu Negocio</Text>
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

            <Button title={saving ? "Guardando..." : business ? "Actualizar Perfil" : "Crear Perfil"} onPress={handleSave} loading={saving} disabled={saving} size="large" style={styles.saveButton} />
          </View>

          {/* Account Section */}
          <View style={styles.accountSection}>
            <Text style={styles.accountTitle}>Cuenta</Text>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Sesión iniciada como:</Text>
              <Text style={styles.accountValue}>{user?.email}</Text>
            </View>
            <Button title="Cerrar Sesión" onPress={handleLogout} variant="outline" size="large" style={styles.logoutButton} />

            <Button
              title={isLoggingOutAll ? "Cerrando en otros..." : "Cerrar sesión de todos los dispositivos"}
              onPress={handleLogoutAllDevices}
              variant="outline"
              size="large"
              style={styles.logoutAllButton}
              loading={isLoggingOutAll}
              disabled={isLoggingOutAll}
            />

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Button
                title={isDeleting ? "Eliminando..." : "Eliminar Cuenta"}
                onPress={handleDeleteAccount}
                variant="outline"
                size="large"
                style={styles.deleteAccountButton}
                loading={isDeleting}
                disabled={isDeleting}
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
  logoutAllButton: {
    marginTop: SPACING.md,
    borderColor: COLORS.warning,
  },
  dangerZone: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: SPACING.xl,
  },
  dangerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  dangerDescription: {
    fontSize: FONT_SIZES.sm,
    color: "#7F1D1D",
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  deleteAccountButton: {
    borderColor: COLORS.error,
    backgroundColor: "transparent",
  },
  testButton: {
    marginBottom: SPACING.md,
  },
});
