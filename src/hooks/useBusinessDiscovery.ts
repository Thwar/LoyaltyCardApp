import { useState, useCallback, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { BusinessService, LoyaltyCardService, CustomerCardService } from "../services/api";
import { Business, LoyaltyCard, CustomerCard } from "../types";
import { refreshFlags } from "../utils";

export interface BusinessWithCards extends Business {
  loyaltyCards: LoyaltyCard[];
  customerCards: CustomerCard[]; // Only unclaimed cards
  claimedRewardsCount: { [loyaltyCardId: string]: number };
}

interface UseBusinessDiscoveryReturn {
  businesses: BusinessWithCards[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMoreData: boolean;
  loadBusinessesWithCards: (isInitialLoad?: boolean, currentPage?: number) => Promise<void>;
  updateBusinessAfterJoining: (loyaltyCard: LoyaltyCard, newCustomerCard: CustomerCard) => void;
  onRefresh: () => Promise<void>;
  loadMoreBusinesses: () => Promise<void>;
  setBusinesses: React.Dispatch<React.SetStateAction<BusinessWithCards[]>>;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BUSINESSES_PER_PAGE = 10;

export const useBusinessDiscovery = (): UseBusinessDiscoveryReturn => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessWithCards[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Memoized customer cards to avoid redundant calculations
  const [customerCardsCache, setCustomerCardsCache] = useState<{
    allCards: CustomerCard[];
    unclaimedCards: CustomerCard[];
    timestamp: number;
  } | null>(null);

  // Memoized customer cards data to avoid redundant API calls
  const getCustomerCardsData = useCallback(
    async (forceRefresh = false) => {
      if (!user) return { allCards: [], unclaimedCards: [] };

      const now = Date.now();

      // Use cached data if available and not expired (unless force refresh)
      if (
        !forceRefresh &&
        customerCardsCache &&
        now - customerCardsCache.timestamp < CACHE_DURATION
      ) {
        console.log("🚀 Using cached customer cards data");
        return {
          allCards: customerCardsCache.allCards,
          unclaimedCards: customerCardsCache.unclaimedCards,
        };
      }

      console.log("📱 Fetching fresh customer cards data");

      // Fetch both in parallel for better performance
      const [allCards, unclaimedCards] = await Promise.all([
        CustomerCardService.getAllCustomerCards(user.id),
        CustomerCardService.getUnclaimedRewardCustomerCards(user.id),
      ]);

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

  // Unified function to process business data with loyalty cards and customer cards
  const processBusinessWithCards = useCallback(
    (
      business: Business,
      loyaltyCards: LoyaltyCard[],
      allCustomerCards: CustomerCard[],
      unclaimedCustomerCards: CustomerCard[]
    ): BusinessWithCards => {
      try {
        // Filter only active loyalty cards
        const activeLoyaltyCards = loyaltyCards.filter((card) => card.isActive);

        // Get unclaimed customer cards for this business
        const businessUnclaimedCards = unclaimedCustomerCards.filter(
          (card) => card.loyaltyCard?.businessId === business.id
        );

        // Calculate claimed rewards count per loyalty card for this business
        const claimedRewardsCount: { [loyaltyCardId: string]: number } = {};
        allCustomerCards
          .filter(
            (card) =>
              card.loyaltyCard?.businessId === business.id &&
              card.isRewardClaimed
          )
          .forEach((card) => {
            claimedRewardsCount[card.loyaltyCardId] =
              (claimedRewardsCount[card.loyaltyCardId] || 0) + 1;
          });

        return {
          ...business,
          loyaltyCards: activeLoyaltyCards,
          customerCards: businessUnclaimedCards,
          claimedRewardsCount,
        };
      } catch (error) {
        console.error(
          "❌ Error processing business",
          business.name,
          ":",
          error
        );
        return {
          ...business,
          loyaltyCards: [],
          customerCards: [],
          claimedRewardsCount: {},
        };
      }
    },
    []
  );

  // Process businesses in batches to improve performance
  const procesBusinessesBatch = useCallback(
    async (
      businessesToProcess: Business[],
      allCustomerCards: CustomerCard[],
      unclaimedCustomerCards: CustomerCard[]
    ): Promise<BusinessWithCards[]> => {
      // Get all loyalty cards for all businesses in a single batch query
      const businessIds = businessesToProcess.map((b) => b.id);
      const allLoyaltyCards =
        await LoyaltyCardService.getLoyaltyCardsByBusinessIds(businessIds);

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
        return processBusinessWithCards(
          business,
          loyaltyCards,
          allCustomerCards,
          unclaimedCustomerCards
        );
      });
    },
    [processBusinessWithCards]
  );

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

        console.log(
          "📱 loadBusinessesWithCards: Starting to load businesses for user:",
          user.id,
          "page:",
          currentPage
        );

        // Get customer cards data (cached if available)
        const {
          allCards: allCustomerCards,
          unclaimedCards: unclaimedCustomerCards,
        } = await getCustomerCardsData(isInitialLoad); // force refresh on initial load/pull to refresh

        // Get businesses with pagination
        const allBusinesses = await BusinessService.getPaginatedBusinesses(
          currentPage,
          BUSINESSES_PER_PAGE
        );
        console.log(
          "🏢 Found",
          allBusinesses.length,
          "businesses on page",
          currentPage
        );

        if (allBusinesses.length < BUSINESSES_PER_PAGE) {
          setHasMoreData(false);
        }

        // Process businesses in batches for better performance
        const businessesWithCards = await procesBusinessesBatch(
          allBusinesses,
          allCustomerCards,
          unclaimedCustomerCards
        );

        // Filter to only show businesses that have active loyalty cards
        const activeBusinesses = businessesWithCards.filter(
          (business) => business.loyaltyCards.length > 0
        );

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
        setLoading(false);
        if (!isInitialLoad) {
          setLoadingMore(false);
        }
      }
    },
    [user, getCustomerCardsData, procesBusinessesBatch]
  );

  const updateBusinessAfterJoining = useCallback(
    (loyaltyCard: LoyaltyCard, newCustomerCard: CustomerCard) => {
      if (!user) return;

      setBusinesses((prevBusinesses) =>
        prevBusinesses.map((business) => {
          if (business.id === loyaltyCard.businessId) {
            return {
              ...business,
              customerCards: [
                ...business.customerCards,
                {
                  ...newCustomerCard,
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
    if (loadingMore || !hasMoreData || loading) {
      return;
    }

    const currentPage = Math.floor(businesses.length / BUSINESSES_PER_PAGE);
    await loadBusinessesWithCards(false, currentPage);
  }, [
    businesses.length,
    loadingMore,
    hasMoreData,
    loading,
    loadBusinessesWithCards,
  ]);

  return {
    businesses,
    loading,
    refreshing,
    loadingMore,
    hasMoreData,
    loadBusinessesWithCards,
    updateBusinessAfterJoining,
    onRefresh,
    loadMoreBusinesses,
    setBusinesses,
  };
};
