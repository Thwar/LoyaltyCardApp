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

import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Modal, TouchableOpacity, Dimensions, Platform, Alert } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { Button, AnimatedLoyaltyCard, LoadingState, useAlert, LoyaltyProgramListModal } from "../../components";
import { COLORS, FONT_SIZES, SHADOWS, SPACING } from "../../constants";
import { CustomerCardService, BusinessService, LoyaltyCardService } from "../../services/api";
import { CustomerCard, CustomerStackParamList, Business, LoyaltyCard } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { refreshFlags } from "../../utils";
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
  onJoinSuccess?: (cardCode: string) => void; // Callback for successful join
}

const CustomerCardDetailsModal: React.FC<CustomerCardDetailsModalProps> = ({ visible, customerCard: initialCard, onClose, navigation, onJoinSuccess }) => {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [card, setCard] = useState<CustomerCard>(initialCard);
  const [loading, setLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithCards | null>(null);
  const [joiningCard, setJoiningCard] = useState<string | null>(null);
  const [redemptionCount, setRedemptionCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track last refresh time to prevent unnecessary re-renders
  const lastRefreshTime = useRef(0);

  // Simple cache for business data to avoid repeated fetches
  const [businessCache, setBusinessCache] = useState<Record<string, BusinessWithCards>>({});

  const isCardComplete = card.currentStamps >= (card.loyaltyCard?.totalSlots || 0);
  const canClaimReward = isCardComplete && !card.isRewardClaimed;

  // Memoize card props to prevent unnecessary re-renders of AnimatedLoyaltyCard
  const cardProps = useMemo(
    () =>
      card.loyaltyCard
        ? {
            card: card.loyaltyCard,
            currentStamps: card.currentStamps,
            cardCode: card.cardCode,
            showAnimation: true,
            stampShape: card.loyaltyCard.stampShape,
          }
        : null,
    [card.loyaltyCard, card.currentStamps, card.cardCode]
  );

  const handleDestroyCard = () => {
    console.log("handleDestroyCard called");

    // For web, use native confirm as fallback
    if (Platform.OS === "web") {
      const confirmed = window.confirm("¿Destruir Tarjeta?\n\nEsta acción eliminará permanentemente tu tarjeta de lealtad y todo tu progreso. No se puede deshacer. ¿Estás seguro?");
      if (confirmed) {
        executeDestroy();
      }
      return;
    }

    // For mobile (iOS/Android), use React Native's native Alert
    console.log("Showing native alert for mobile");
    Alert.alert("¿Destruir Tarjeta?", "Esta acción eliminará permanentemente tu tarjeta de lealtad y todo tu progreso. No se puede deshacer. ¿Estás seguro?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Destruir",
        style: "destructive",
        onPress: executeDestroy,
      },
    ]);
  };

  const executeDestroy = async () => {
    console.log("executeDestroy called");
    try {
      setIsDeleting(true);
      await CustomerCardService.deleteCustomerCard(card.id);

      // Set refresh flags to trigger fresh data fetch in both screens
      await refreshFlags.setRefreshForBothScreens();

      if (Platform.OS === "web") {
        window.alert("¡Tarjeta Eliminada!\n\nTu tarjeta de lealtad ha sido eliminada exitosamente.");
        onClose();
      } else {
        // For mobile, use React Native's native Alert
        console.log("Showing native success alert for mobile");
        Alert.alert("¡Tarjeta Eliminada!", "Tu tarjeta de lealtad ha sido eliminada exitosamente.", [
          {
            text: "OK",
            onPress: () => {
              console.log("OK button pressed, closing modal and refreshing");
              onClose(); // This will trigger navigation back to home in the screen wrapper
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error deleting card:", error);
      if (Platform.OS === "web") {
        window.alert(`Error\n\n${error.message || "Error al eliminar la tarjeta"}`);
      } else {
        // For mobile, use React Native's native Alert
        Alert.alert("Error", error.message || "Error al eliminar la tarjeta");
      }
    } finally {
      setIsDeleting(false);
    }
  };

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
      // Create the customer card (card code generation is handled internally)
      const newCustomerCard = await CustomerCardService.joinLoyaltyProgram(user.id, loyaltyCard.id);
      console.log("✅ Successfully joined loyalty program with card ID:", newCustomerCard.id);
      console.log("✅ Generated card code:", newCustomerCard.cardCode);

      // Clear joining state
      setJoiningCard(null);

      // Use callback if available (preferred for modal usage), otherwise try navigation
      if (onJoinSuccess) {
        console.log("📞 Calling onJoinSuccess callback with cardCode:", newCustomerCard.cardCode);
        onClose(); // Close this modal first
        
        // Wait for modal to close before showing success modal
        setTimeout(() => {
          onJoinSuccess(newCustomerCard.cardCode);
        }, 300); // 300ms delay to ensure card details modal is fully closed
      } else if (navigation) {
        console.log("🚀 Navigating to Home with success modal params, cardCode:", newCustomerCard.cardCode);
        onClose(); // Close this modal first
        
        // Navigate directly to Home within current navigator with success modal params
        (navigation as any).navigate("Home", {
          refresh: true, 
          timestamp: Date.now(),
          showSuccessModal: true,
          cardCode: newCustomerCard.cardCode
        });
      } else {
        // Fallback if neither callback nor navigation available
        showAlert({
          title: "¡Éxito!",
          message: `Te has unido al programa de lealtad "${loyaltyCard.rewardDescription}". Tu código es: ${newCustomerCard.cardCode}`,
        });
        onClose();
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
      // Only refresh card if it's been more than 5 seconds since last refresh
      // This prevents unnecessary re-renders that interrupt animations
      const now = Date.now();

      if (now - lastRefreshTime.current > 5000) {
        refreshCard();
        lastRefreshTime.current = now;
      }

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
          <View style={styles.cardContainer}>{cardProps ? <AnimatedLoyaltyCard {...cardProps} /> : <LoadingState error="Tarjeta no disponible" onRetry={onClose} />}</View>
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

          {/* Destroy Card Button - At the bottom */}
          <View style={styles.destroyButtonContainer}>
            <Button title="Destruir Tarjeta" onPress={handleDestroyCard} variant="outline" size="large" loading={isDeleting} style={styles.destroyButton} textStyle={styles.destroyButtonText} />
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
  destroyButtonContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  destroyButton: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  destroyButtonText: {
    color: COLORS.error,
  },
});

// Screen wrapper component for backward compatibility
interface CustomerCardDetailsScreenProps {
  navigation: StackNavigationProp<CustomerStackParamList, "CustomerCardDetails">;
  route: RouteProp<CustomerStackParamList, "CustomerCardDetails">;
}

export const CustomerCardDetailsScreen: React.FC<CustomerCardDetailsScreenProps> = ({ navigation, route }) => {
  const { customerCard } = route.params;
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    // Navigate back to the home screen with timestamp to trigger refresh
    navigation.goBack();
    // Use reset to ensure we're on the home tab and pass the timestamp
    navigation.getParent()?.navigate("Home", {
      timestamp: Date.now(), // This will trigger useFocusEffect to refresh the data
    });
  };

  return <CustomerCardDetailsModal visible={modalVisible} customerCard={customerCard} onClose={handleClose} navigation={navigation} />;
};

// Export both components
export { CustomerCardDetailsModal };
