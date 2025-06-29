import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, Modal, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { LoadingState, BusinessDiscoveryCard, LoyaltyProgramListModal } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { BusinessService, LoyaltyCardService, CustomerCardService } from "../../services/api";
import { Business, LoyaltyCard, CustomerCard } from "../../types";

interface BusinessDiscoveryScreenProps {
  navigation: StackNavigationProp<any>;
  route?: RouteProp<any>;
}

interface BusinessWithCards extends Business {
  loyaltyCards: LoyaltyCard[];
  customerCards: CustomerCard[]; // Only unclaimed cards
  claimedRewardsCount: { [loyaltyCardId: string]: number }; // Count of claimed rewards per loyalty card
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BUSINESSES_PER_PAGE = 10;
const MAX_CODE_GENERATION_ATTEMPTS = 1000;

// Helper function for generating card codes
const generateRandomCode = (): string => Math.floor(100 + Math.random() * 900).toString();

export const BusinessDiscoveryScreen: React.FC<BusinessDiscoveryScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithCards | null>(null);
  const [joiningCard, setJoiningCard] = useState<string | null>(null);
  const [newCardCode, setNewCardCode] = useState<string>("");

  // Memoized customer cards to avoid redundant calculations
  const [customerCardsCache, setCustomerCardsCache] = useState<{
    allCards: CustomerCard[];
    unclaimedCards: CustomerCard[];
    timestamp: number;
  } | null>(null);

  // Function to clear customer cards cache
  const clearCustomerCardsCache = useCallback(() => {
    console.log("🗑️ Clearing customer cards cache");
    setCustomerCardsCache(null);
  }, []);

  useEffect(() => {
    console.log("🔄 useEffect triggered - user:", user?.id || "No user");
    loadInitialData();
  }, [user]);

  // Clear cache when screen comes into focus to ensure fresh data after stamps/rewards
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 BusinessDiscoveryScreen focused - clearing cache for fresh data");

      // Check if we have route params indicating a refresh is needed
      const shouldRefresh = route?.params?.refresh || route?.params?.timestamp;
      if (shouldRefresh) {
        console.log("📱 BusinessDiscoveryScreen refresh requested via navigation params");
      }

      // Always clear cache on focus to ensure fresh data
      clearCustomerCardsCache();
    }, [clearCustomerCardsCache, route?.params])
  );

  // Memoized customer cards data to avoid redundant API calls
  const getCustomerCardsData = useCallback(
    async (forceRefresh = false) => {
      if (!user) return { allCards: [], unclaimedCards: [] };

      const now = Date.now();

      // Use cached data if available and not expired (unless force refresh)
      if (!forceRefresh && customerCardsCache && now - customerCardsCache.timestamp < CACHE_DURATION) {
        console.log("🚀 Using cached customer cards data");
        return {
          allCards: customerCardsCache.allCards,
          unclaimedCards: customerCardsCache.unclaimedCards,
        };
      }

      console.log("📱 Fetching fresh customer cards data");

      // Fetch both in parallel for better performance
      const [allCards, unclaimedCards] = await Promise.all([CustomerCardService.getAllCustomerCards(user.id), CustomerCardService.getUnclaimedRewardCustomerCards(user.id)]);

      // Cache the results
      setCustomerCardsCache({
        allCards,
        unclaimedCards,
        timestamp: now,
      });

      return { allCards, unclaimedCards };
    },
    [user, customerCardsCache]
  );

  const loadInitialData = useCallback(async () => {
    if (!user) {
      console.log("🚫 loadInitialData: No user found");
      return;
    }

    try {
      setLoading(true);
      await loadBusinessesWithCards(true);
    } catch (error) {
      console.error("💥 Error loading initial data:", error);
      Alert.alert("Error", "Failed to load businesses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadBusinessesWithCards = useCallback(
    async (isInitialLoad = false, currentPage = 0) => {
      if (!user) {
        console.log("🚫 loadBusinessesWithCards: No user found");
        return;
      }

      try {
        if (!isInitialLoad) {
          setLoadingMore(true);
        }

        console.log("📱 loadBusinessesWithCards: Starting to load businesses for user:", user.id, "page:", currentPage);

        // Get customer cards data (cached if available)
        const { allCards: allCustomerCards, unclaimedCards: unclaimedCustomerCards } = await getCustomerCardsData();

        console.log("🎫 Found", allCustomerCards.length, "total customer cards and", unclaimedCustomerCards.length, "unclaimed cards");

        // Get businesses with pagination
        const allBusinesses = await BusinessService.getPaginatedBusinesses(currentPage, BUSINESSES_PER_PAGE);
        console.log("🏢 Found", allBusinesses.length, "businesses on page", currentPage);

        if (allBusinesses.length < BUSINESSES_PER_PAGE) {
          setHasMoreData(false);
        }

        // Process businesses in batches for better performance
        const businessesWithCards = await procesBusinessesBatch(allBusinesses, allCustomerCards, unclaimedCustomerCards);

        // Filter to only show businesses that have active loyalty cards
        const activeBusinesses = businessesWithCards.filter((business) => business.loyaltyCards.length > 0);

        console.log("🟢 Active businesses after filtering:", activeBusinesses.length);
        if (isInitialLoad) {
          setBusinesses(activeBusinesses);
        } else {
          setBusinesses((prev) => [...prev, ...activeBusinesses]);
        }

        console.log("✅ Businesses loaded successfully");
      } catch (error) {
        console.error("💥 Error loading businesses:", error);
        Alert.alert("Error", "Failed to load businesses. Please try again.");
      } finally {
        if (!isInitialLoad) {
          setLoadingMore(false);
        }
      }
    },
    [user, getCustomerCardsData]
  );

  // Unified function to process business data with loyalty cards and customer cards
  const processBusinessWithCards = useCallback((business: Business, loyaltyCards: LoyaltyCard[], allCustomerCards: CustomerCard[], unclaimedCustomerCards: CustomerCard[]): BusinessWithCards => {
    try {
      console.log("🔍 Processing business:", business.name, "(ID:", business.id, ")");

      // Filter only active loyalty cards
      const activeLoyaltyCards = loyaltyCards.filter((card) => card.isActive);
      console.log("💳 Found", activeLoyaltyCards.length, "active loyalty cards for business:", business.name);

      // Get unclaimed customer cards for this business
      const businessUnclaimedCards = unclaimedCustomerCards.filter((card) => card.loyaltyCard?.businessId === business.id);

      // Calculate claimed rewards count per loyalty card for this business
      const claimedRewardsCount: { [loyaltyCardId: string]: number } = {};
      allCustomerCards
        .filter((card) => card.loyaltyCard?.businessId === business.id && card.isRewardClaimed)
        .forEach((card) => {
          claimedRewardsCount[card.loyaltyCardId] = (claimedRewardsCount[card.loyaltyCardId] || 0) + 1;
        });

      const result = {
        ...business,
        loyaltyCards: activeLoyaltyCards,
        customerCards: businessUnclaimedCards,
        claimedRewardsCount,
      };

      console.log("📋 Final business object for", business.name, ":", result);
      return result;
    } catch (error) {
      console.error("❌ Error processing business", business.name, ":", error);
      return {
        ...business,
        loyaltyCards: [],
        customerCards: [],
        claimedRewardsCount: {},
      };
    }
  }, []);

  // Process businesses in batches to improve performance
  const procesBusinessesBatch = useCallback(
    async (businessesToProcess: Business[], allCustomerCards: CustomerCard[], unclaimedCustomerCards: CustomerCard[]): Promise<BusinessWithCards[]> => {
      // Get all loyalty cards for all businesses in a single batch query
      const businessIds = businessesToProcess.map((b) => b.id);
      const allLoyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusinessIds(businessIds);

      // Group loyalty cards by business ID
      const loyaltyCardsByBusiness = allLoyaltyCards.reduce((acc, card) => {
        if (!acc[card.businessId]) {
          acc[card.businessId] = [];
        }
        acc[card.businessId].push(card);
        return acc;
      }, {} as { [businessId: string]: LoyaltyCard[] });

      return businessesToProcess.map((business) => {
        const loyaltyCards = loyaltyCardsByBusiness[business.id] || [];
        return processBusinessWithCards(business, loyaltyCards, allCustomerCards, unclaimedCustomerCards);
      });
    },
    [processBusinessWithCards]
  );

  const generateUniqueCardCode = async (businessId: string, customerId: string): Promise<string> => {
    let attempts = 0;

    do {
      const code = generateRandomCode();
      attempts++;

      // Check if this code already exists for this business where reward is not claimed
      const existingCard = await CustomerCardService.getUnclaimedCustomerCardByCodeAndBusiness(code, businessId);

      if (!existingCard) {
        return code;
      }
    } while (attempts < MAX_CODE_GENERATION_ATTEMPTS);

    throw new Error("Unable to generate unique card code. Please try again.");
  };

  const updateBusinessAfterJoining = useCallback(
    (loyaltyCard: LoyaltyCard, cardCode: string) => {
      if (!user) return;

      setBusinesses((prevBusinesses) =>
        prevBusinesses.map((business) => {
          if (business.id === loyaltyCard.businessId) {
            return {
              ...business,
              customerCards: [
                ...business.customerCards,
                {
                  id: `temp-${Date.now()}`, // Temporary ID until next full refresh
                  customerId: user.id,
                  loyaltyCardId: loyaltyCard.id,
                  businessId: loyaltyCard.businessId,
                  currentStamps: 0,
                  isRewardClaimed: false,
                  createdAt: new Date(),
                  cardCode: cardCode,
                  loyaltyCard: loyaltyCard,
                },
              ],
              claimedRewardsCount: business.claimedRewardsCount, // Preserve existing claimed rewards count
            };
          }
          return business;
        })
      );
    },
    [user]
  );

  const handleJoinLoyaltyProgram = async (loyaltyCard: LoyaltyCard) => {
    if (!user) return;

    try {
      // Generate unique 3-digit code
      const cardCode = await generateUniqueCardCode(loyaltyCard.businessId, user.id);

      // Create the customer card
      await CustomerCardService.joinLoyaltyProgram(user.id, loyaltyCard.id, cardCode);

      setNewCardCode(cardCode);
      setModalVisible(true);

      // Update the business state optimistically
      updateBusinessAfterJoining(loyaltyCard, cardCode);
    } catch (error) {
      console.error("Error joining loyalty program:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to join loyalty program");
    } finally {
      setJoiningCard(null);
    }
  };
  const handleViewCard = (customerCard: CustomerCard) => {
    navigation.navigate("CustomerCardDetails", {
      customerCard: customerCard,
    });
  };

  const handleBusinessPress = async (business: BusinessWithCards) => {
    setSelectedBusiness(business);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCustomerCardsCache(null); // Clear customer cards cache
    setHasMoreData(true);
    try {
      await loadBusinessesWithCards(true, 0);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  }, [loadBusinessesWithCards]);

  const loadMoreBusinesses = useCallback(async () => {
    if (loadingMore || !hasMoreData) return;

    const currentPage = Math.floor(businesses.length / BUSINESSES_PER_PAGE);
    await loadBusinessesWithCards(false, currentPage);
  }, [businesses.length, loadingMore, hasMoreData, loadBusinessesWithCards]);

  const renderBusinessItem = ({ item }: { item: BusinessWithCards }) => <BusinessDiscoveryCard business={item} onPress={handleBusinessPress} />;

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingFooterText}>Cargando más negocios...</Text>
      </View>
    );
  };
  const handleJoinLoyaltyProgramFromModal = useCallback(
    (loyaltyCard: LoyaltyCard) => {
      setJoiningCard(loyaltyCard.id);
      setSelectedBusiness(null);
      handleJoinLoyaltyProgram(loyaltyCard);
    },
    [handleJoinLoyaltyProgram]
  );

  const handleViewCardFromModal = useCallback((customerCard: CustomerCard) => {
    setSelectedBusiness(null);
    handleViewCard(customerCard);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedBusiness(null);
  }, []);

  const navigateToCustomerHome = useCallback(() => {
    setModalVisible(false);
    console.log("📱 Navigating to CustomerTabs with refresh parameter");
    navigation.navigate("CustomerTabs", {
      screen: "Home",
      params: { refresh: true, timestamp: Date.now() },
    });
  }, [navigation]);

  const handleCloseSuccessModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  if (loading) {
    return <LoadingState loading={true} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subtitle}>Descubre negocios increíbles y únete a sus programas de lealtad para ganar recompensas exclusivas</Text>
        {businesses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No hay programas disponibles</Text>
            <Text style={styles.emptyMessage}>En este momento no hay negocios con programas de lealtad activos. ¡Vuelve pronto para descubrir nuevas oportunidades de recompensas!</Text>
          </View>
        ) : (
          <FlatList
            data={businesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.businessList}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            onEndReached={loadMoreBusinesses}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
      <LoyaltyProgramListModal
        selectedBusiness={selectedBusiness}
        joiningCard={joiningCard}
        onClose={handleCloseModal}
        onJoinProgram={handleJoinLoyaltyProgramFromModal}
        onViewCard={handleViewCardFromModal}
        key={selectedBusiness ? `${selectedBusiness.id}-${selectedBusiness.customerCards.length}` : "no-business"}
      />
      {joiningCard && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={!!joiningCard}
          onRequestClose={() => {
            // Prevent closing while loading
            Alert.alert("Procesando", "Por favor espera mientras procesamos tu solicitud...");
          }}
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.fullScreenLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.fullScreenLoadingText}>Cargando...</Text>
              <Text style={styles.loadingSubtext}>Uniéndose al programa de lealtad...</Text>
            </View>
          </View>
        </Modal>
      )}
      {/* Success Modal */}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={handleCloseSuccessModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.successModalTitle}>¡Bienvenido al Programa!</Text>
            <Text style={styles.modalMessage}>¡Te has unido exitosamente al programa de lealtad! Ahora puedes empezar a ganar sellos y recompensas.</Text>
            <View style={styles.cardCodeContainer}>
              <Text style={styles.cardCodeLabel}>Tu código de identificación:</Text>
              <Text style={styles.cardCode}>{newCardCode}</Text>
            </View>
            <Text style={styles.cardCodeDescription}>Presenta este código al negocio cuando hagas una compra para recibir sellos en tu tarjeta de lealtad.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={navigateToCustomerHome}>
              <Text style={styles.modalButtonText}>Ver Mis Tarjetas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseSuccessModal}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginVertical: SPACING.lg,
    textAlign: "center",
  },
  businessList: {
    paddingBottom: SPACING.xl,
  },
  logoPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  businessNameLarge: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  businessDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  businessDescriptionLarge: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  // Success modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    minWidth: 300,
    maxWidth: "90%",
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  successModalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  cardCodeContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.md,
    minWidth: 200,
  },
  cardCodeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  cardCode: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: "monospace",
  },
  cardCodeDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: SPACING.md,
    minWidth: 150,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    textAlign: "center",
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  // Loading overlay styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenLoadingContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: "center",
    minWidth: 200,
  },
  fullScreenLoadingText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    marginTop: SPACING.md,
  },
  loadingSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  // Pagination loading styles
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  loadingFooterText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginLeft: SPACING.sm,
  },
});
