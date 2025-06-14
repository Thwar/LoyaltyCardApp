import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, LoadingState } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { BusinessService, LoyaltyCardService, CustomerCardService } from "../../services/api";
import { Business, LoyaltyCard } from "../../types";

interface BusinessDashboardScreenProps {
  navigation: StackNavigationProp<any>;
}

interface DashboardStats {
  totalCards: number;
  activeCustomers: number;
  totalStamps: number;
  claimedRewards: number;
}

export const BusinessDashboardScreen: React.FC<BusinessDashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCards: 0,
    activeCustomers: 0,
    totalStamps: 0,
    claimedRewards: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null); // Load business info
      const businesses = await BusinessService.getBusinessesByOwner(user.id);
      console.log("Found businesses:", businesses.length);
      const userBusiness = businesses[0]; // Assuming one business per owner for now
      setBusiness(userBusiness);
      console.log("User business:", userBusiness);
      if (userBusiness) {
        // Load loyalty cards for this business
        console.log("Loading loyalty cards for business:", userBusiness.id); // Use the actual business ID instead of user ID
        const loyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusiness(userBusiness.id);
        console.log("Found loyalty cards:", loyaltyCards.length, loyaltyCards);
        setLoyaltyCards(loyaltyCards); // Store loyalty cards in state

        // Calculate stats
        let totalStamps = 0;
        let activeCustomers = 0;
        let claimedRewards = 0;
        const uniqueCustomers = new Set<string>(); // Track unique customer IDs

        for (const card of loyaltyCards) {
          const customerCards = await CustomerCardService.getCustomerCardsByLoyaltyCard(card.id);
          console.log(`Customer cards for loyalty card ${card.id}:`, customerCards.length, customerCards);

          customerCards.forEach((customerCard) => {
            totalStamps += customerCard.currentStamps;
            // Count each unique customer who has joined the loyalty program
            uniqueCustomers.add(customerCard.customerId);
            if (customerCard.isRewardClaimed) claimedRewards++;
          });
        }

        // Active customers = total unique customers who have joined any loyalty program
        activeCustomers = uniqueCustomers.size;

        console.log("Final stats:", {
          totalCards: loyaltyCards.length,
          activeCustomers,
          totalStamps,
          claimedRewards,
        });

        setStats({
          totalCards: loyaltyCards.length,
          activeCustomers,
          totalStamps,
          claimedRewards,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user])
  );

  const handleRetry = () => {
    loadDashboardData();
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
  }> = ({ title, value, icon }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  if (loading && !refreshing) {
    return <LoadingState loading={true} />;
  }

  if (error && !refreshing) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboardData(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Bienvenido,</Text>
          <Text style={styles.businessName}>{business?.name || user?.displayName}</Text>
        </View>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Tarjetas de Lealtad" value={stats.totalCards} icon="📄" />
            <StatCard title="Clientes Activos" value={stats.activeCustomers} icon="👥" />
            <StatCard title="Total de Sellos" value={stats.totalStamps} icon="⭐" />
            <StatCard title="Recompensas Reclamadas" value={stats.claimedRewards} icon="🎁" />
          </View>
        </View>
        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          {loyaltyCards.length === 0 && <Button title="Crear Nueva Tarjeta de Lealtad" onPress={() => navigation.navigate("CreateCard")} size="large" style={styles.actionButton} />}
          <Button
            title="Agregar Sello a Cliente"
            onPress={() => {
              if (loyaltyCards.length > 0 && business) {
                navigation.navigate("AddStamp", {
                  loyaltyCardId: loyaltyCards[0].id,
                  businessId: business.id,
                });
              } else {
                // Show alert to create a loyalty card first
                alert("Primero debe crear una tarjeta de lealtad");
              }
            }}
            variant="outline"
            size="large"
            style={styles.actionButton}
          />
          <Button title="Ver Todos los Clientes" onPress={() => navigation.navigate("BusinessTabs", { screen: "Customers" })} variant="outline" size="large" style={styles.actionButton} />
        </View>
        {/* Business Setup */}
        {!business && (
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>Completa la Configuración de Tu Negocio</Text>
            <Text style={styles.setupText}>Configura el perfil de tu negocio para comenzar a crear tarjetas de lealtad y gestionar clientes.</Text>
            <Button title="Configurar Perfil del Negocio" onPress={() => navigation.navigate("BusinessTabs", { screen: "Settings" })} size="large" style={styles.setupButton} />
          </View>
        )}
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statsContainer: {
    padding: SPACING.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: "center",
    flex: 1,
    minWidth: "45%",
    ...SHADOWS.small,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  actionsContainer: {
    padding: SPACING.lg,
  },
  actionButton: {
    marginBottom: SPACING.md,
  },
  setupContainer: {
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: "center",
    ...SHADOWS.small,
  },
  setupTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  setupText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  setupButton: {
    width: "100%",
  },
});
