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

import { Button, AnimatedLoyaltyCard, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { CustomerCard, CustomerStackParamList } from "../../types";

interface CustomerCardDetailsModalProps {
  visible: boolean;
  customerCard: CustomerCard;
  onClose: () => void;
  navigation?: StackNavigationProp<CustomerStackParamList, any>;
}

const CustomerCardDetailsModal: React.FC<CustomerCardDetailsModalProps> = ({ visible, customerCard: initialCard, onClose, navigation }) => {
  const { showAlert } = useAlert();
  const [card, setCard] = useState<CustomerCard>(initialCard);
  const [loading, setLoading] = useState(false);

  const isCardComplete = card.currentStamps >= (card.loyaltyCard?.totalSlots || 0);
  const canClaimReward = isCardComplete && !card.isRewardClaimed;

  const handleViewBusiness = () => {
    if (card.loyaltyCard && navigation) {
      navigation.navigate("BusinessProfile", {
        businessId: card.loyaltyCard.businessId,
      });
      onClose();
    }
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

  useEffect(() => {
    if (visible) {
      refreshCard();
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header with close button */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Detalles de Tarjeta</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
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
          </View>
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button title="Ver Perfil del Negocio" onPress={handleViewBusiness} variant="outline" size="large" style={styles.businessButton} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
    backgroundColor: COLORS.white,
    margin: SPACING.sm,
    padding: SPACING.lg,
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
    backgroundColor: COLORS.white,
    margin: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: 12,
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
  navigation: StackNavigationProp<CustomerStackParamList, "CardDetails">;
  route: RouteProp<CustomerStackParamList, "CardDetails">;
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
