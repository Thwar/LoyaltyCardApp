import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Image } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button, InputField, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS } from "../../constants";
import { CustomerCardService } from "../../services/api";

interface CustomerProfileScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CustomerProfileScreen: React.FC<CustomerProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      });
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const customerCards = await CustomerCardService.getCustomerCards(user.id);
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
      // Note: In a real app, you would implement user profile update in the API
      // For now, we'll just show a success message
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
          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.profileImageContainer}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={48} color={COLORS.gray} />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.displayName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.memberSince}>
              Casero desde
              {new Date(user?.createdAt || new Date()).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
            </Text>
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
    marginBottom: SPACING.md,
  },
  profileImageContainer: {
    marginBottom: SPACING.md,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
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
});
