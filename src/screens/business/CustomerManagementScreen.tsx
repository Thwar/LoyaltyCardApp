import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, RefreshControl } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, LoadingState, EmptyState } from "../../components";
import { CreateLoyaltyCardModal } from "./CreateLoyaltyCardScreen";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { CustomerCardService, BusinessService, LoyaltyCardService, UserService } from "../../services/api";
import { CustomerCard, LoyaltyCard } from "../../types";

interface CustomerManagementScreenProps {
  navigation: StackNavigationProp<any>;
}

// Memoized CustomerCard component for better performance
const CustomerCardComponent = memo<{ customer: CustomerCard; loyaltyCards: LoyaltyCard[] }>(
  ({ customer, loyaltyCards }) => {
    // Get the loyalty card info either from the customer or from the loyaltyCards state
    const loyaltyCardInfo = customer.loyaltyCard || loyaltyCards.find((lc) => lc.id === customer.loyaltyCardId);
    const totalSlots = loyaltyCardInfo?.totalSlots || 10; // Fallback to 10 if not found

    // Memoize computed values
    const { startDate, lastStampDate, profilePic } = useMemo(() => {
      // Format the start date
      const startDate = new Date(customer.createdAt).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Format the last stamp date
      let lastStampDate = customer.lastStampDate
        ? new Date(customer.lastStampDate).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }) +
          " " +
          new Date(customer.lastStampDate).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null;

      // Use customer.customerPhotoURL or fallback to a placeholder
      const profilePic = customer.customerPhotoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(customer.customerName || "Cliente");

      return { startDate, lastStampDate, profilePic };
    }, [customer.createdAt, customer.lastStampDate, customer.customerPhotoURL, customer.customerName]);

    return (
      <View style={styles.customerCard}>
        <View style={styles.customerRow}>
          <Image source={{ uri: profilePic }} style={styles.avatar} />
          <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
            {customer.customerName || `Cliente #${customer.cardCode || customer.id.slice(-6)}`}
          </Text>
          {customer.cardCode && (
            <View style={styles.cardCodeBadge}>
              <Text style={styles.cardCodeBadgeText}>{customer.cardCode}</Text>
            </View>
          )}
          <View style={styles.rightInfo}>
            <Text style={styles.stampCount}>
              {customer.currentStamps} / {totalSlots} 🏷️
            </Text>
          </View>
        </View>
        <View style={styles.customerRow}>
          <Text style={styles.customerDetail}>Casero desde: {startDate}</Text>
        </View>
        {lastStampDate && (
          <View style={styles.customerRow}>
            <Text style={styles.lastStampDate}>Último sello: {lastStampDate}</Text>
          </View>
        )}
        {customer.isRewardClaimed && <Text style={[styles.customerDetail, styles.rewardClaimed]}>🎁 Recompensa reclamada</Text>}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
      prevProps.customer.id === nextProps.customer.id &&
      prevProps.customer.currentStamps === nextProps.customer.currentStamps &&
      prevProps.customer.lastStampDate === nextProps.customer.lastStampDate &&
      prevProps.customer.isRewardClaimed === nextProps.customer.isRewardClaimed &&
      prevProps.customer.customerPhotoURL === nextProps.customer.customerPhotoURL &&
      prevProps.loyaltyCards.length === nextProps.loyaltyCards.length
    );
  }
);

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Optimized function to refresh only customer data with intelligent caching
  const loadCustomerData = useCallback(
    async (cards?: LoyaltyCard[]) => {
      const currentLoyaltyCards = cards || loyaltyCards;

      if (currentLoyaltyCards.length === 0) {
        setCustomers([]);
        return;
      }

      try {
        // Get all customer cards for all loyalty cards of this business
        let allCustomerCards: CustomerCard[] = [];

        // Process loyalty cards in parallel for better performance
        const customerCardPromises = currentLoyaltyCards.map(async (loyaltyCard) => {
          const customerCards = await CustomerCardService.getActiveCustomerCardsWithUnclaimedRewards(loyaltyCard.id, loyaltyCard.businessId);

          // Fetch user profile data for each customer in parallel
          const customerCardsWithUserData = await Promise.all(
            customerCards.map(async (card) => {
              try {
                const userData = await UserService.getUser(card.customerId);
                return {
                  ...card,
                  loyaltyCard: loyaltyCard,
                  customerPhotoURL: userData?.profileImage || undefined,
                };
              } catch (error) {
                console.warn("Failed to fetch user data for customer:", card.customerId, error);
                return {
                  ...card,
                  loyaltyCard: loyaltyCard,
                  customerPhotoURL: undefined,
                };
              }
            })
          );

          return customerCardsWithUserData;
        });

        // Wait for all loyalty card data to be processed
        const customerCardArrays = await Promise.all(customerCardPromises);
        allCustomerCards = customerCardArrays.flat();

        // Sort by last stamp date (or createdAt if not available), descending
        allCustomerCards.sort((a, b) => {
          const aDate = a.lastStampDate ? new Date(a.lastStampDate) : new Date(a.createdAt);
          const bDate = b.lastStampDate ? new Date(b.lastStampDate) : new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        });

        setCustomers(allCustomerCards);
        setLastRefreshTime(new Date());
      } catch (err) {
        console.error("Error loading customer data:", err);
        throw err;
      }
    },
    [loyaltyCards]
  );

  // Initial full load function
  const loadInitialData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get the business for the current user (only needed once)
      const businesses = await BusinessService.getBusinessesByOwner(user.id);

      if (businesses.length === 0) {
        setCustomers([]);
        return;
      }
      const business = businesses[0]; // Use the first business
      setBusinessId(business.id); // Store business ID

      // Get all loyalty cards for this business (only needed once)
      const loyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusiness(business.id);
      setLoyaltyCards(loyaltyCards); // Store loyalty cards in state

      // Load customer data directly (avoid dependency cycle)
      await loadCustomerDataDirect(loyaltyCards);
    } catch (err) {
      console.error("Error loading initial data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Direct customer data loading function (used in initial load to avoid dependency cycles)
  const loadCustomerDataDirect = useCallback(async (cards: LoyaltyCard[]) => {
    if (cards.length === 0) {
      setCustomers([]);
      return;
    }

    try {
      // Process loyalty cards in parallel for better performance
      const customerCardPromises = cards.map(async (loyaltyCard) => {
        const customerCards = await CustomerCardService.getActiveCustomerCardsWithUnclaimedRewards(loyaltyCard.id, loyaltyCard.businessId);

        // Fetch user profile data for each customer in parallel
        const customerCardsWithUserData = await Promise.all(
          customerCards.map(async (card) => {
            try {
              const userData = await UserService.getUser(card.customerId);
              return {
                ...card,
                loyaltyCard: loyaltyCard,
                customerPhotoURL: userData?.profileImage || undefined,
              };
            } catch (error) {
              console.warn("Failed to fetch user data for customer:", card.customerId, error);
              return {
                ...card,
                loyaltyCard: loyaltyCard,
                customerPhotoURL: undefined,
              };
            }
          })
        );

        return customerCardsWithUserData;
      });

      // Wait for all loyalty card data to be processed
      const customerCardArrays = await Promise.all(customerCardPromises);
      const allCustomerCards = customerCardArrays.flat();

      // Sort by last stamp date (or createdAt if not available), descending
      allCustomerCards.sort((a, b) => {
        const aDate = a.lastStampDate ? new Date(a.lastStampDate) : new Date(a.createdAt);
        const bDate = b.lastStampDate ? new Date(b.lastStampDate) : new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });

      setCustomers(allCustomerCards);
      setLastRefreshTime(new Date());
    } catch (err) {
      console.error("Error loading customer data:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    // Only run on mount or when user changes - prevents infinite loops
    loadInitialData();
  }, [loadInitialData]);

  // Memoized callback functions for better performance
  const handleRetry = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Only refresh customer data, not the full page (much faster!)
      await loadCustomerData();
    } catch (err) {
      // If customer data refresh fails, fall back to full reload
      console.warn("Customer data refresh failed, doing full reload:", err);
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  }, [loadCustomerData, loadInitialData]);

  const handleShowAll = useCallback(() => {
    setShowAll(true);
  }, []);

  const handleCreateModalClose = useCallback(() => {
    setCreateModalVisible(false);
  }, []);

  const handleCreateModalOpen = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  const handleCreateModalSuccess = useCallback(() => {
    // When a new loyalty card is created, do a full reload to get the new card
    loadInitialData();
  }, [loadInitialData]);

  // Optimized renderItem function with useCallback
  const renderCustomerCard = useCallback(({ item }: { item: CustomerCard }) => <CustomerCardComponent customer={item} loyaltyCards={loyaltyCards} />, [loyaltyCards]);

  // Optimized keyExtractor
  const keyExtractor = useCallback((item: CustomerCard) => item.id, []);

  // Fixed item layout for performance (estimate based on your current card height)
  const getItemLayout = useCallback(
    (data: ArrayLike<CustomerCard> | null | undefined, index: number) => ({
      length: 120, // Estimated height of each customer card
      offset: 120 * index,
      index,
    }),
    []
  );

  // Memoized displayed customers to prevent unnecessary re-calculations
  const displayedCustomers = useMemo(() => {
    return showAll ? customers : customers.slice(0, 20);
  }, [customers, showAll]);

  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (error) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes Activos</Text>
        <Text style={styles.subtitle}>Vista informativa de los últimos 20 clientes activos</Text>
      </View>
      {customers.length === 0 ? (
        <EmptyState
          icon="people"
          title="Aún No Hay Clientes"
          message="Los clientes aparecerán aquí una vez que comiencen a usar tus tarjetas de lealtad. ¡Comparte tu negocio con los clientes para comenzar!"
          actionText="Crear Tarjeta de Lealtad"
          onAction={handleCreateModalOpen}
        />
      ) : (
        <>
          <FlatList
            data={displayedCustomers}
            renderItem={renderCustomerCard}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            contentContainerStyle={styles.customersList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            // Optimize for better performance
            disableVirtualization={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 100,
            }}
          />
          {customers.length > 20 && !showAll && <Button title={`Mostrar todos (${customers.length})`} onPress={handleShowAll} style={styles.showAllButton} />}
        </>
      )}

      {/* Modal */}
      <CreateLoyaltyCardModal visible={createModalVisible} onClose={handleCreateModalClose} onSuccess={handleCreateModalSuccess} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: COLORS.inputBorder,
  },
  cardCodeBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  cardCodeBadgeText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: FONT_SIZES.sm,
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  customersList: {
    padding: SPACING.md,
  },
  customerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  customerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  rightInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerCode: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: 8,
    minWidth: 60,
    textAlign: "right",
  },
  stampCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: 8,
    minWidth: 70,
    textAlign: "right",
  },
  customerDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  lastStampDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "right",
    minWidth: 120,
  },
  rewardClaimed: {
    color: COLORS.primary,
    fontWeight: "500",
    marginTop: 2,
  },
  showAllButton: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
});
