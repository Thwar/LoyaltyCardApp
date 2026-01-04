import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, LoadingState } from "../../components";
import { Ionicons } from "@expo/vector-icons";
import { CreateLoyaltyCardModal } from "./CreateLoyaltyCardScreen";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { BusinessService, LoyaltyCardService, CustomerCardService } from "../../services/api";
import { Business, LoyaltyCard } from "../../types";
import { refreshFlags } from "../../utils";

interface BusinessDashboardScreenProps {
  navigation: StackNavigationProp<any>;
}

interface DashboardStats {
  totalCards: number;
  activeCustomers: number;
  totalStamps: number;
  claimedRewards: number;
}

interface DashboardCache {
  business: Business | null;
  loyaltyCards: LoyaltyCard[];
  stats: DashboardStats;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard data cache with timestamp
  const [dashboardCache, setDashboardCache] = useState<DashboardCache | null>(null);

  // Ref to prevent multiple simultaneous loads
  const loadingRef = useRef(false);

  // Function to clear dashboard cache
  const clearDashboardCache = useCallback(() => {
    console.log("🗑️ Clearing dashboard cache");
    setDashboardCache(null);
  }, []);

  const loadDashboardData = useCallback(
    async (isRefresh = false, forceReload = false) => {
      if (!user) return;

      // Prevent multiple simultaneous loads
      if (loadingRef.current && !isRefresh) {
        console.log("⏳ Load already in progress, skipping");
        return;
      }

      // Check if we have valid cached data and no force reload
      const now = Date.now();
      if (!forceReload && !isRefresh && dashboardCache && now - dashboardCache.timestamp < CACHE_DURATION) {
        console.log("📦 Using cached dashboard data");
        setBusiness(dashboardCache.business);
        setLoyaltyCards(dashboardCache.loyaltyCards);
        setStats(dashboardCache.stats);
        setLoading(false);
        return;
      }

      loadingRef.current = true;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        console.log("🔄 Loading fresh dashboard data");

        // Load business info
        const businesses = await BusinessService.getBusinessesByOwner(user.id);
        const userBusiness = businesses[0];
        setBusiness(userBusiness);

        let newLoyaltyCards: LoyaltyCard[] = [];
        let newStats: DashboardStats = {
          totalCards: 0,
          activeCustomers: 0,
          totalStamps: 0,
          claimedRewards: 0,
        };

        if (userBusiness) {
          // Load loyalty cards for this business
          const businessLoyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusiness(userBusiness.id);
          newLoyaltyCards = businessLoyaltyCards;
          setLoyaltyCards(businessLoyaltyCards);

          if (businessLoyaltyCards.length > 0) {
            // Get all customer cards for all loyalty cards in parallel
            const customerCardsPromises = businessLoyaltyCards.map((card) => CustomerCardService.getAllCustomerCardsByLoyaltyCard(card.id, card.businessId));

            const allCustomerCardsArrays = await Promise.all(customerCardsPromises);
            const allCustomerCards = allCustomerCardsArrays.flat();

            // Calculate stats efficiently
            const uniqueActiveCustomers = new Set<string>();
            let totalStamps = 0;
            let claimedRewards = 0;

            allCustomerCards.forEach((customerCard) => {
              totalStamps += customerCard.currentStamps;

              if (customerCard.isRewardClaimed) {
                claimedRewards++;
              } else {
                uniqueActiveCustomers.add(customerCard.customerId);
              }
            });

            newStats = {
              totalCards: businessLoyaltyCards.length,
              activeCustomers: uniqueActiveCustomers.size,
              totalStamps,
              claimedRewards,
            };
            setStats(newStats);
          }
        } else {
          // Reset everything if no business
          setLoyaltyCards([]);
        }

        // Cache the loaded data
        setDashboardCache({
          business: userBusiness,
          loyaltyCards: newLoyaltyCards,
          stats: newStats,
          timestamp: now,
        });

        console.log("✅ Dashboard data cached successfully");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
      }
    },
    [user, dashboardCache]
  );

  useFocusEffect(
    useCallback(() => {
      const checkRefreshFlags = async () => {
        // Check if we need to refresh based on flags
        const shouldRefreshDashboard = await refreshFlags.shouldRefreshBusinessDashboard();

        if (shouldRefreshDashboard) {
          console.log("🔄 Dashboard refresh needed based on flags");

          // Clear the refresh flag
          await refreshFlags.clearBusinessDashboardRefresh();

          // Force reload the data
          loadDashboardData(false, true);
        } else {
          // Try to load from cache first
          loadDashboardData();
        }
      };

      checkRefreshFlags();
    }, [user, loadDashboardData])
  );

  const handleNavigateToAddStamp = useCallback(() => {
    // Navigate to the Sellar tab
    navigation.navigate("BusinessTabs", {
      screen: "Sellar",
    });
  }, [navigation]);

  const handleNavigateToCustomers = useCallback(() => {
    navigation.navigate("BusinessTabs", { screen: "Customers" });
  }, [navigation]);

  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate("BusinessTabs", { screen: "Settings" });
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    loadDashboardData(true, true); // Force refresh when user pulls to refresh
  }, [loadDashboardData]);

  const handleCreateModalSuccess = useCallback(() => {
    loadDashboardData(false, true); // Force reload after creating new loyalty card
  }, [loadDashboardData]);

  const handleRetry = useCallback(() => {
    loadDashboardData(false, true); // Force reload on retry
  }, [loadDashboardData]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
  }> = React.memo(({ title, value, icon }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  ));

  if (loading && !refreshing) {
    return <LoadingState loading={true} />;
  }

  if (error && !refreshing) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.profileContainer} activeOpacity={0.7} onPress={handleNavigateToSettings}>
              {business?.logoUrl ? (
                <Image source={{ uri: business.logoUrl }} style={styles.profileImage} />
              ) : (
                <View style={styles.defaultProfileIcon}>
                  <Ionicons name="business" size={24} color={COLORS.gray} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Bienvenido,</Text>
              <Text style={styles.businessName}>{business?.name || user?.displayName}</Text>
            </View>
          </View>
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
          {loyaltyCards.length === 0 && <Button title="Crear Tarjeta de Lealtad" onPress={() => setCreateModalVisible(true)} size="large" style={styles.actionButton} />}
          <Button title="Agregar Sello" onPress={handleNavigateToAddStamp} size="large" style={styles.actionButton} />
          <Button title="Ver Todos los Clientes" onPress={handleNavigateToCustomers} variant="outline" size="large" style={styles.actionButton} />
        </View>
        {/* Business Setup */}
        {!business && (
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>Completa la Configuración de Tu Negocio</Text>
            <Text style={styles.setupText}>Configura el perfil de tu negocio para comenzar a crear tarjetas de lealtad y gestionar clientes.</Text>
            <Button title="Configurar Perfil del Negocio" onPress={handleNavigateToSettings} size="large" style={styles.setupButton} />
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <CreateLoyaltyCardModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onSuccess={handleCreateModalSuccess} />
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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    marginRight: SPACING.md,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderCurve: "continuous",
    backgroundColor: COLORS.inputBorder,
  },
  defaultProfileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderCurve: "continuous",
    backgroundColor: COLORS.inputBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeContainer: {
    flex: 1,
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
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
