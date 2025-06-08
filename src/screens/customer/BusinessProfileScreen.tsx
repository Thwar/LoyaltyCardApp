import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { Button, LoadingState } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { BusinessService } from "../../services/api";
import { Business } from "../../types";

interface BusinessProfileScreenProps {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any, any>;
}

export const BusinessProfileScreen: React.FC<BusinessProfileScreenProps> = ({ navigation, route }) => {
  const { businessId } = route.params;
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  const loadBusiness = async () => {
    try {
      setLoading(true);
      setError(null);
      const businessData = await BusinessService.getBusiness(businessId);
      setBusiness(businessData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el negocio");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadBusiness();
  };

  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (error || !business) {
    return <LoadingState error={error || "Negocio no encontrado"} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          {business.logoUrl ? (
            <Image source={{ uri: business.logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="business" size={48} color={COLORS.gray} />
            </View>
          )}
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.businessDescription}>{business.description}</Text>
        </View>
        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>

          {business.address && (
            <View style={styles.contactRow}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{business.address}</Text>
            </View>
          )}

          {business.phone && (
            <View style={styles.contactRow}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{business.phone}</Text>
            </View>
          )}

          {business.email && (
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={20} color={COLORS.primary} />
              <Text style={styles.contactText}>{business.email}</Text>
            </View>
          )}
        </View>
        {/* Business Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de Este Negocio</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{new Date(business.createdAt).getFullYear()}</Text>
              <Text style={styles.statLabel}>Se Unió</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{business.isActive ? "Activo" : "Inactivo"}</Text>
              <Text style={styles.statLabel}>Estado</Text>
            </View>
          </View>
        </View>
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Ver Todas las Tarjetas de Lealtad"
            onPress={() => {
              // TODO: Navigate to business loyalty cards
              console.log("Navigate to business loyalty cards");
            }}
            variant="outline"
            size="large"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.md,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  businessName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  businessDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  contactText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
    flex: 1,
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
  buttonContainer: {
    padding: SPACING.lg,
  },
});
