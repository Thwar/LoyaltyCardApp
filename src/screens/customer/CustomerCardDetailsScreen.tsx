/**
 * Customer Card Details Modal Component
 *
 * This component displays detailed information about a customer's loyalty card in a modal format.
 * It can be used both as a screen (via CustomerCardDetailsScreen) and as a modal component directly.
 *
 * Usage as Modal:
 * ```tsx
 * import { CustomerCardDetailsModal } from './CustomerCardDetailsScreen';
 *
 * const [modalVisible, setModalVisible] = useState(false);
 *
 * <CustomerCardDetailsModal
 *   visible={modalVisible}
 *   customerCard={selectedCard}
 *   onClose={() => setModalVisible(false)}
 *   navigation={navigation} // optional
 * />
 * ```
 */

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Modal, TouchableOpacity, Dimensions } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { Button, AnimatedLoyaltyCard, LoadingState, useAlert, LoyaltyProgramListModal } from "../../components";
import { COLORS, FONT_SIZES, SHADOWS, SPACING } from "../../constants";
import { CustomerCardService, BusinessService, LoyaltyCardService } from "../../services/api";
import { CustomerCard, CustomerStackParamList, Business, LoyaltyCard } from "../../types";
import { useAuth } from "../../context/AuthContext";
import Ionicons from "@expo/vector-icons/build/Ionicons";

interface BusinessWithCards extends Business {
  loyaltyCards: LoyaltyCard[];
  customerCards: CustomerCard[];
  claimedRewardsCount: { [loyaltyCardId: string]: number };
}

interface CustomerCardDetailsModalProps {
  visible: boolean;
  customerCard: CustomerCard;
  onClose: () => void;
  navigation?: StackNavigationProp<CustomerStackParamList, any>;
}

const CustomerCardDetailsModal: React.FC<CustomerCardDetailsModalProps> = ({ visible, customerCard: initialCard, onClose }) => {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [card, setCard] = useState<CustomerCard>(initialCard);
  const [loading, setLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithCards | null>(null);
  const [joiningCard, setJoiningCard] = useState<string | null>(null);
  const [redemptionCount, setRedemptionCount] = useState<number>(0);

  // Simple cache for business data to avoid repeated fetches
  const [businessCache, setBusinessCache] = useState<Record<string, BusinessWithCards>>({});

  const isCardComplete = card.currentStamps >= (card.loyaltyCard?.totalSlots || 0);
  const canClaimReward = isCardComplete && !card.isRewardClaimed;
  const handleViewBusiness = async () => {
    if (!card.loyaltyCard?.businessId || !user) return;

    const businessId = card.loyaltyCard.businessId;

    // Check if we have cached data for this business
    if (businessCache[businessId]) {
      console.log("Using cached business data for:", businessId);
      setSelectedBusiness(businessCache[businessId]);
      return;
    }

    try {
      setBusinessLoading(true);
      console.log("Fetching fresh business data for:", businessId);
      const startTime = performance.now(); // Execute all fetches in parallel for maximum efficiency
      console.log("Starting parallel fetch...");
      const [business, loyaltyCards, allCustomerCards] = await Promise.all([
        BusinessService.getBusiness(businessId),
        LoyaltyCardService.getLoyaltyCardsByBusinessId(businessId),
        CustomerCardService.getCustomerCardsByBusiness(user.id, businessId),
      ]);

      const totalTime = performance.now();
      console.log(`All data fetched in parallel in ${totalTime - startTime}ms`);
      console.log(`Found ${loyaltyCards.length} loyalty cards and ${allCustomerCards.length} customer cards`);

      if (!business) {
        showAlert({
          title: "Error",
          message: "No se pudo cargar la información del negocio",
        });
        return;
      }

      // Filter unclaimed customer cards for display
      const unclaimedCustomerCards = allCustomerCards.filter((card) => !card.isRewardClaimed);

      // Calculate claimed rewards count per loyalty card
      const claimedRewardsCount: { [loyaltyCardId: string]: number } = {};
      allCustomerCards
        .filter((card) => card.isRewardClaimed)
        .forEach((card) => {
          claimedRewardsCount[card.loyaltyCardId] = (claimedRewardsCount[card.loyaltyCardId] || 0) + 1;
        });

      const businessWithCards: BusinessWithCards = {
        ...business,
        loyaltyCards,
        customerCards: unclaimedCustomerCards,
        claimedRewardsCount,
      };

      // Cache the result
      setBusinessCache((prev) => ({
        ...prev,
        [businessId]: businessWithCards,
      }));

      setSelectedBusiness(businessWithCards);

      console.log(`Total operation completed in ${totalTime - startTime}ms`);
    } catch (error) {
      console.error("Error fetching business data:", error);
      showAlert({
        title: "Error",
        message: "Error al cargar la información del negocio",
      });
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleCloseBusinessModal = () => {
    setSelectedBusiness(null);
  };
  const handleJoinProgram = async (loyaltyCard: LoyaltyCard) => {
    if (!user) return;

    setJoiningCard(loyaltyCard.id);
    try {
      await CustomerCardService.joinLoyaltyProgram(user.id, loyaltyCard.id);

      showAlert({
        title: "¡Éxito!",
        message: `Te has unido al programa de lealtad "${loyaltyCard.rewardDescription}"`,
      });

      // Invalidate cache for this business since customer cards changed
      if (selectedBusiness) {
        setBusinessCache((prev) => {
          const updated = { ...prev };
          delete updated[selectedBusiness.id];
          return updated;
        });

        // Refresh the business data to show the new customer card
        const allCustomerCards = await CustomerCardService.getUnclaimedRewardCustomerCards(user.id);
        const customerCards = allCustomerCards.filter((customerCard) => customerCard.loyaltyCard?.businessId === selectedBusiness.id);

        const updatedBusiness = {
          ...selectedBusiness,
          customerCards,
        };

        // Update both the selected business and cache
        setSelectedBusiness(updatedBusiness);
        setBusinessCache((prev) => ({
          ...prev,
          [selectedBusiness.id]: updatedBusiness,
        }));
      }
    } catch (error: any) {
      showAlert({
        title: "Error",
        message: error.message || "Error al unirse al programa de lealtad",
      });
    } finally {
      setJoiningCard(null);
    }
  };
  const handleViewCard = (customerCard: CustomerCard) => {
    // Close business modal and show the selected card details
    setSelectedBusiness(null);

    // If it's a different card than the current one, update the current card
    if (customerCard.id !== card.id) {
      setCard(customerCard);
    }

    // Since we're already in a card details modal, we just update the current card being displayed
    // No navigation needed - the modal will update with the new card data
  };

  const refreshCard = async () => {
    setLoading(true);
    try {
      const updatedCard = await CustomerCardService.getCustomerCard(card.id);
      if (updatedCard) {
        setCard(updatedCard);
      }
    } catch (error) {
      showAlert({
        title: "Error",
        message: "Error al actualizar los detalles de la tarjeta",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRedemptionCount = async () => {
    if (!user || !card.loyaltyCard) return;

    try {
      const count = await CustomerCardService.getRedemptionCount(user.id, card.loyaltyCard.id);
      setRedemptionCount(count);
    } catch (error) {
      console.error("Error fetching redemption count:", error);
      // Don't show error to user as this is supplementary information
    }
  };

  useEffect(() => {
    if (visible) {
      refreshCard();
      fetchRedemptionCount();
    }
  }, [visible]);

  if (!card.loyaltyCard) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <LoadingState error="Detalles de la tarjeta no disponibles" onRetry={onClose} />
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header with close button */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Detalles de Tarjeta</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.scrollView}>
          {/* Card Display */}
          <View style={styles.cardContainer}>
            <AnimatedLoyaltyCard
              card={card.loyaltyCard}
              currentStamps={card.currentStamps}
              cardCode={card.cardCode}
              showAnimation={true}
              stampShape={card.loyaltyCard?.stampShape}
              customerCard={card}
            />
          </View>
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button title="Ver Perfil del Negocio" onPress={handleViewBusiness} variant="outline" size="large" loading={businessLoading} style={styles.businessButton} />
          </View>
          {/* Card Status */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Estado de la Tarjeta</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Progreso:</Text>
              <Text style={styles.statusValue}>
                {card.currentStamps} / {card.loyaltyCard.totalSlots} sellos
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado:</Text>
              <Text style={[styles.statusValue, canClaimReward && styles.statusValueSuccess]}>
                {card.isRewardClaimed ? "Recompensa Reclamada" : canClaimReward ? "¡Listo para Reclamar!" : "En Progreso"}
              </Text>
            </View>
            {card.lastStampDate && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Último Sello:</Text>
                <Text style={styles.statusValue}>{new Date(card.lastStampDate).toLocaleDateString()}</Text>
              </View>
            )}
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Recompensas Canjeadas:</Text>
              <Text style={styles.statusValue}>{redemptionCount} veces</Text>
            </View>
            {card.createdAt && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Acumulando puntos desde:</Text>
                <Text style={styles.statusValue}>{new Date(card.createdAt).toLocaleDateString()}</Text>
              </View>
            )}
          </View>
          {/* Card Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Cómo Funciona</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🎯 Meta:</Text>
              <Text style={styles.detailText}>Coleccionar {card.loyaltyCard.totalSlots} sellos</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🎁 Recompensa:</Text>
              <Text style={styles.detailText}>{card.loyaltyCard.rewardDescription}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📱 Para obtener un sello:</Text>
              <Text style={styles.detailText}>
                Presenta tu número de cliente <Text style={[styles.detailText, { fontWeight: "bold" }]}>#{card.cardCode}</Text> al negocio para recibir un sello
              </Text>
            </View>
          </View>
        </ScrollView>
        {/* Loyalty Program List Modal */}
        <LoyaltyProgramListModal selectedBusiness={selectedBusiness} joiningCard={joiningCard} onClose={handleCloseBusinessModal} onJoinProgram={handleJoinProgram} onViewCard={handleViewCard} />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerSpacer: {
    width: 40, // Match the approximate width of the back button
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  cardContainer: {
    marginTop: SPACING.lg,
  },
  statusContainer: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
    borderRadius: 12,
  },
  statusTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  statusValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  statusValueSuccess: {
    color: COLORS.success,
  },
  detailsContainer: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  detailsTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xs,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  claimButton: {
    backgroundColor: COLORS.success,
  },
  businessButton: {
    marginTop: SPACING.sm,
  },
});

// Screen wrapper component for backward compatibility
interface CustomerCardDetailsScreenProps {
  navigation: StackNavigationProp<CustomerStackParamList, "ClaimReward">;
  route: RouteProp<CustomerStackParamList, "ClaimReward">;
}

export const CustomerCardDetailsScreen: React.FC<CustomerCardDetailsScreenProps> = ({ navigation, route }) => {
  const { customerCard } = route.params;
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    navigation.goBack();
  };

  return <CustomerCardDetailsModal visible={modalVisible} customerCard={customerCard} onClose={handleClose} navigation={navigation} />;
};

// Export both components
export { CustomerCardDetailsModal };
