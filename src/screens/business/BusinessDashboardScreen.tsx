import React, { useState, useEffect, useCallback } from "react";
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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // Load business info
        const businesses = await BusinessService.getBusinessesByOwner(user.id);
        const userBusiness = businesses[0];
        setBusiness(userBusiness);

        if (userBusiness) {
          // Load loyalty cards for this business
          const businessLoyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusiness(userBusiness.id);
          setLoyaltyCards(businessLoyaltyCards);

          if (businessLoyaltyCards.length > 0) {
            // Get all customer cards for all loyalty cards in parallel
            const customerCardsPromises = businessLoyaltyCards.map((card) => CustomerCardService.getAllCustomerCardsByLoyaltyCard(card.id));

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

            setStats({
              totalCards: businessLoyaltyCards.length,
              activeCustomers: uniqueActiveCustomers.size,
              totalStamps,
              claimedRewards,
            });
          } else {
            // Reset stats if no loyalty cards
            setStats({
              totalCards: 0,
              activeCustomers: 0,
              totalStamps: 0,
              claimedRewards: 0,
            });
          }
        } else {
          // Reset everything if no business
          setLoyaltyCards([]);
          setStats({
            totalCards: 0,
            activeCustomers: 0,
            totalStamps: 0,
            claimedRewards: 0,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [user])
  );

  const handleNavigateToAddStamp = useCallback(() => {
    if (loyaltyCards.length > 0 && business) {
      navigation.navigate("AddStamp", {
        loyaltyCardId: loyaltyCards[0].id,
        businessId: business.id,
      });
    } else {
      alert("Primero debe crear una tarjeta de lealtad");
    }
  }, [loyaltyCards, business, navigation]);

  const handleNavigateToCustomers = useCallback(() => {
    navigation.navigate("BusinessTabs", { screen: "Customers" });
  }, [navigation]);

  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate("BusinessTabs", { screen: "Settings" });
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  const handleCreateModalSuccess = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRetry = useCallback(() => {
    loadDashboardData();
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
          {loyaltyCards.length === 0 && <Button title="Crear Nueva Tarjeta de Lealtad" onPress={() => setCreateModalVisible(true)} size="large" style={styles.actionButton} />}
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
