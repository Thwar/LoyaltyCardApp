import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, TouchableOpacity, Image, Modal, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { AnimatedLoyaltyCard, LoadingState, EmptyState } from "../../components";
import { CustomerCardDetailsModal } from "./CustomerCardDetailsScreen";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { CustomerCard, LoyaltyCard as LoyaltyCardType, CustomerTabParamList } from "../../types";
import { imageCache, refreshFlags } from "../../utils";

interface CustomerHomeScreenProps {
  navigation: StackNavigationProp<any>;
  route: RouteProp<CustomerTabParamList, "Home">;
}

export const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CustomerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CustomerCard | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [newCardCode, setNewCardCode] = useState<string>("");
  const [successModalKey, setSuccessModalKey] = useState<number>(0);
  const [pendingSuccessModal, setPendingSuccessModal] = useState<string | null>(null);
  const [isShowingSuccessModal, setIsShowingSuccessModal] = useState(false);
  const hasLoadedInitially = useRef(false);

  const loadCards = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const customerCards = await CustomerCardService.getUnclaimedRewardCustomerCards(user.id);
      setCards(customerCards);

      // Pre-load all card images in the background for smooth experience
      const imagesToPreload: string[] = [];
      customerCards.forEach((card) => {
        if (card.loyaltyCard?.backgroundImage) {
          imagesToPreload.push(card.loyaltyCard.backgroundImage);
        }
        if (card.loyaltyCard?.businessLogo) {
          imagesToPreload.push(card.loyaltyCard.businessLogo);
        }
      });

      // Pre-load images in the background (don't wait for this)
      if (imagesToPreload.length > 0) {
        imageCache.preloadImages(imagesToPreload).catch((error) => {
          console.warn("Some images failed to preload:", error);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      console.log("🏠 CustomerHomeScreen focused - refreshing cards, timestamp:", route?.params?.timestamp);

      // Check for success modal parameters from navigation
      if (route?.params?.showSuccessModal && route?.params?.cardCode) {
        console.log("🎉 Showing success modal from navigation params with code:", route.params.cardCode);
        setNewCardCode(route.params.cardCode);
        setSuccessModalKey((prev) => prev + 1);

        // Small delay to ensure the screen is fully loaded before showing modal
        setTimeout(() => {
          setSuccessModalVisible(true);
        }, 300);

        // Clear the params to prevent showing modal again when returning to this screen
        navigation.setParams({ showSuccessModal: undefined, cardCode: undefined });
      }

      // Check for refresh flags
      const checkRefreshFlags = async () => {
        const shouldRefresh = await refreshFlags.shouldRefreshCustomerHome();
        if (shouldRefresh) {
          console.log("🚩 CustomerHome refresh flag detected - forcing refresh");
          await refreshFlags.clearCustomerHomeRefresh();
          loadCards();
          hasLoadedInitially.current = true;
          return;
        }

        // Load cards if it's the first time, or if a refresh is forced via navigation params.
        if (!hasLoadedInitially.current || route.params?.timestamp) {
          loadCards();
          hasLoadedInitially.current = true;
          if (route.params?.timestamp) {
            // Clear the timestamp to prevent re-loading on subsequent focuses
            navigation.setParams({ timestamp: undefined });
          }
        }
      };

      checkRefreshFlags();
    }, [user, route?.params?.timestamp, route?.params?.showSuccessModal, route?.params?.cardCode, navigation, loadCards])
  );

  const handleCardPress = (card: CustomerCard) => {
    setSelectedCard(card);
    // Small delay to improve modal animation on Android
    setTimeout(() => setModalVisible(true), 50);
  };

  const handleModalClose = (refreshNeeded = false) => {
    setModalVisible(false);
    setSelectedCard(null);
    // Force a refresh of the cards list only when needed (e.g., after a card is deleted)
    if (refreshNeeded) {
      console.log("🔄 Refreshing cards after modal close");
      loadCards(true);
    }
  };

  const handleRetry = () => {
    loadCards();
  };

  const handleCloseSuccessModal = () => {
    console.log("🔴 handleCloseSuccessModal called - current state:", { successModalVisible, newCardCode });
    setSuccessModalVisible(false);
    setNewCardCode("");
    setIsShowingSuccessModal(false);
  };

  const handleJoinSuccess = (cardCode: string) => {
    console.log("🎉 Join success callback triggered with cardCode:", cardCode);

    // Use Alert instead of modal to avoid conflicts
    Alert.alert("¡Bienvenido al Programa!", `¡Te has unido exitosamente al programa de lealtad!\n\nTu código de identificación: ${cardCode}\n\nAhora puedes empezar a ganar sellos y recompensas.`, [
      {
        text: "¡Perfecto!",
        onPress: () => {
          console.log("✅ Alert dismissed");
        },
      },
    ]);
  };

  const navigateToBusinessDiscovery = () => {
    console.log("📱 Navigating to Business Discovery");
    setSuccessModalVisible(false);
    setNewCardCode("");
    navigation.navigate("Discovery"); // Navigate to Discovery tab instead of BusinessDiscovery stack screen
  };
  const renderCard = ({ item, index }: { item: CustomerCard; index: number }) => {
    // Cycle through different stamp shapes for visual variety
    const stampShapes: ("circle" | "square" | "egg" | "triangle" | "diamond" | "star")[] = ["circle", "square", "egg", "triangle", "diamond", "star"];
    const stampShape = stampShapes[index % stampShapes.length];

    return (
      <AnimatedLoyaltyCard card={item.loyaltyCard!} currentStamps={item.currentStamps} onPress={() => handleCardPress(item)} cardCode={item.cardCode} showAnimation={true} stampShape={stampShape} />
    );
  };

  if (loading && !refreshing) {
    return <LoadingState loading={true} />;
  }

  if (error && !refreshing) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.profileContainer} onPress={() => navigation.navigate("Profile")} activeOpacity={0.7}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultProfileIcon}>
                <Ionicons name="person" size={24} color={COLORS.gray} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Bienvenido de vuelta,</Text>
            <Text style={styles.nameText}>{user?.displayName}</Text>
          </View>
        </View>
      </View>
      {cards.length === 0 ? (
        <EmptyState
          icon="card"
          title="Aún No Tienes Tarjetas de Lealtad"
          message="Comienza a coleccionar tarjetas de lealtad de tus negocios favoritos para seguir tus recompensas y obtener beneficios."
          actionText="Buscar Negocios"
          onAction={() => {
            navigation.navigate("Discovery");
          }}
        />
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.cardsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCards(true)} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Card Details Modal */}
      {selectedCard && <CustomerCardDetailsModal visible={modalVisible} customerCard={selectedCard} onClose={handleModalClose} navigation={navigation as any} onJoinSuccess={handleJoinSuccess} />}

      {/* Success Modal for Join Loyalty Program */}
      {successModalVisible && newCardCode && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={successModalVisible}
          onRequestClose={() => {
            console.log("🚫 Modal onRequestClose called");
            handleCloseSuccessModal();
          }}
          onShow={() => console.log("🎉 Success modal is now showing with code:", newCardCode)}
          onDismiss={() => {
            console.log("🔴 Success modal dismissed - state:", { successModalVisible, newCardCode });
          }}
        >
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
              <TouchableOpacity style={styles.modalButton} onPress={handleCloseSuccessModal}>
                <Text style={styles.modalButtonText}>¡Perfecto!</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCloseButton} onPress={navigateToBusinessDiscovery}>
                <Text style={styles.modalCloseText}>Buscar Más Negocios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  nameText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  cardsList: {
    paddingVertical: SPACING.md,
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
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
});
