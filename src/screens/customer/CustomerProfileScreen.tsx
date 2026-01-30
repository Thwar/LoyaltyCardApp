import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS } from "../../constants";
import { CustomerCardService, UserService } from "../../services/api";
import { ImageUploadService } from "../../services/imageUpload";
import { auth } from "../../services/firebase";
import * as ImagePickerExpo from "expo-image-picker";

interface CustomerProfileScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CustomerProfileScreen: React.FC<CustomerProfileScreenProps> = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    profileImage: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalCards: 0,
    totalStamps: 0,
    totalRewards: 0,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        email: user.email || "",
        profileImage: user.profileImage || "",
      });
      loadStats();
    }
  }, [user]);
  const loadStats = async () => {
    if (!user) return;

    try {
      const customerCards = await CustomerCardService.getAllCustomerCards(user.id);
      const totalCards = customerCards.length;
      const totalStamps = customerCards.reduce((sum, card) => sum + card.currentStamps, 0);
      const totalRewards = customerCards.filter((card) => card.isRewardClaimed).length;

      setStats({
        totalCards,
        totalStamps,
        totalRewards,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) {
      newErrors.displayName = "El nombre es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Por favor ingrese un email válido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setSaving(true);
    try {
      let profileImageUrl = formData.profileImage; // If a new image was selected (local URI), upload it
      if (formData.profileImage && !formData.profileImage.startsWith("http")) {
        try {
          console.log("Uploading profile image for user ID:", user.id);
          console.log("Auth user:", auth.currentUser?.uid);
          console.log("Auth user email:", auth.currentUser?.email);

          // Ensure we have a fresh auth token before upload
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken(true);
            console.log("Got fresh auth token:", token ? "✓" : "✗");
          }

          profileImageUrl = await ImageUploadService.uploadUserProfileImage(formData.profileImage, user.id);
        } catch (uploadError) {
          console.error("Error uploading profile image:", uploadError);

          // Check if it's a CORS error
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          if (errorMessage.includes("CORS") || errorMessage.includes("Access-Control")) {
            showAlert({
              title: "Error de Configuración",
              message: "Error de CORS en Firebase Storage. Por favor consulta FIREBASE_CORS_SETUP.md para configurar CORS. Usando imagen temporal.",
            });

            // For development, allow using the data URL directly (not recommended for production)
            if (formData.profileImage.startsWith("data:")) {
              profileImageUrl = formData.profileImage;
            } else {
              profileImageUrl = "";
            }
          } else if (errorMessage.includes("unauthorized") || errorMessage.includes("permission")) {
            showAlert({
              title: "Error de Permisos",
              message: "No se pudo subir la imagen debido a problemas de autenticación. Por favor, cierra sesión y vuelve a iniciar sesión, luego intenta de nuevo.",
              buttons: [
                {
                  text: "Cancelar",
                  style: "cancel",
                },
                {
                  text: "Cerrar Sesión",
                  style: "destructive",
                  onPress: () => logout(),
                },
              ],
            });
            profileImageUrl = ""; // Save without image if upload fails
          } else {
            showAlert({
              title: "Error de Subida",
              message: "No se pudo subir la imagen de perfil. El perfil se guardará sin imagen.",
            });
            profileImageUrl = ""; // Save without image if upload fails
          }
        }
      }

      // Update user profile
      const updateData: { displayName: string; profileImage?: string } = {
        displayName: formData.displayName,
      };

      if (profileImageUrl) {
        updateData.profileImage = profileImageUrl;
      }

      await UserService.updateUser(user.id, updateData); // Update the form data with the uploaded image URL
      setFormData((prev) => ({ ...prev, profileImage: profileImageUrl }));

      // Refresh user data in context
      await refreshUser();

      showAlert({
        title: "Éxito",
        message: "Perfil actualizado exitosamente",
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Error al actualizar el perfil",
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
          text: "Salir",
          style: "destructive",
          onPress: logout,
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: "⚠️ ELIMINAR CUENTA",
      message:
        "Esta acción eliminará PERMANENTEMENTE tu cuenta y TODOS los datos asociados, incluyendo:\n\n• Tu perfil personal\n• Todas tus tarjetas de lealtad\n• Todos tus sellos y progreso\n• Tu historial de recompensas\n\nEsta acción NO se puede deshacer.\n\n¿Estás completamente seguro?",
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
      if (error instanceof Error && (error.message === "AUTH_REQUIRES_RECENT_LOGIN" || (error as any).code === "AUTH_REQUIRES_RECENT_LOGIN")) {
        showAlert({
          title: "Autenticación Requerida",
          message: "Por seguridad, para eliminar tu cuenta es necesario que hayas iniciado sesión recientemente. ¿Deseas cerrar sesión ahora para volver a ingresar?",
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
  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Permisos requeridos",
          message: "Necesitamos permisos para acceder a tu galería de fotos.",
        });
        return false;
      }
    }
    return true;
  };

  const convertToDataUrl = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error converting to data URL:", error);
        throw error;
      }
    }
    return uri; // For mobile, return original URI
  };

  const pickProfileImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      let result;

      if (Platform.OS === "web") {
        result = await ImagePickerExpo.launchImageLibraryAsync({
          mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square aspect ratio for profile
          quality: 0.8,
          base64: false,
        });
      } else {
        result = await ImagePickerExpo.launchImageLibraryAsync({
          mediaTypes: ImagePickerExpo.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1], // Square aspect ratio for profile
          quality: 0.8,
          base64: false,
        });
      }

      if (!result.canceled && result.assets[0]) {
        let imageUri = result.assets[0].uri;

        // Convert to data URL for web compatibility
        if (Platform.OS === "web") {
          imageUri = await convertToDataUrl(imageUri);
        }

        updateFormData("profileImage", imageUri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert({
        title: "Error",
        message: "No se pudo seleccionar la imagen",
      });
    }
  };

  if (loading) {
    return <LoadingState loading={true} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Profile Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={pickProfileImage}
              disabled={saving}
              activeOpacity={0.7}
              accessibilityLabel="Cambiar foto de perfil"
              accessibilityHint="Toca para seleccionar una nueva foto de perfil"
            >
              {formData.profileImage ? (
                <Image source={{ uri: formData.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={48} color={COLORS.gray} />
                </View>
              )}
              <View style={[styles.uploadIconContainer, saving && styles.uploadIconDisabled]}>
                <Ionicons name="camera" size={16} color={COLORS.white} style={styles.uploadIcon} />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user?.displayName}</Text>
            <Text style={styles.memberSince}>Casero desde {new Date(user?.createdAt || new Date()).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</Text>
          </View>
          {/* Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis Estadísticas</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalCards}</Text>
                <Text style={styles.statLabel}>Tarjetas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalStamps}</Text>
                <Text style={styles.statLabel}>Sellos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalRewards}</Text>
                <Text style={styles.statLabel}>Recompensas</Text>
              </View>
            </View>
          </View>
          {/* Profile Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            <InputField
              label="Nombre Completo"
              value={formData.displayName}
              onChangeText={(value) => updateFormData("displayName", value)}
              placeholder="Ingresa tu nombre completo"
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
            <Button title="Actualizar Perfil" onPress={handleSave} loading={saving} size="large" style={styles.saveButton} />
          </View>
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuenta</Text>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Tipo de cuenta:</Text>
              <Text style={styles.accountValue}>Cliente</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Estado:</Text>
              <Text style={styles.accountValue}>Activo</Text>
            </View>
            <Button title="Cerrar Sesión" onPress={handleLogout} variant="outline" size="large" style={styles.logoutButton} />

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
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  profileImageContainer: {
    marginBottom: SPACING.md,
    position: "relative",
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 100,
  },
  profileImagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  uploadIconDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  uploadIcon: {
    // Additional styles if needed
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  memberSince: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  section: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
  accountInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  accountLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  accountValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  logoutButton: {
    marginTop: SPACING.md,
  },
  dangerZone: {
    backgroundColor: "#FEF2F2",
    marginTop: SPACING.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
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
  dangerNote: {
    fontSize: FONT_SIZES.xs,
    color: "#92400E",
    marginBottom: SPACING.md,
    fontStyle: "italic",
    lineHeight: 16,
  },
  deleteAccountButton: {
    borderColor: COLORS.error,
    backgroundColor: "transparent",
  },
});
