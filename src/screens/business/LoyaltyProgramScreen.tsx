import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, SafeAreaView, RefreshControl, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { Button, LoadingState, EmptyState, AnimatedLoyaltyCard } from "../../components";
import { CreateLoyaltyCardModal } from "./CreateLoyaltyCardScreen";
import { EditLoyaltyCardModal } from "./EditLoyaltyCardScreen";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { LoyaltyCardService, BusinessService } from "../../services/api";
import { LoyaltyCard, BusinessTabParamList } from "../../types";

interface LoyaltyProgramScreenProps {
  navigation: StackNavigationProp<any>;
}

export const LoyaltyProgramScreen: React.FC<LoyaltyProgramScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [loadingSelectedCard, setLoadingSelectedCard] = useState(false);
  const formatCreatedDate = (date: any): string => {
    try {
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date === "object" && date.seconds) {
        // Firestore Timestamp
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === "string" || typeof date === "number") {
        dateObj = new Date(date);
      } else {
        return "";
      }

      return dateObj.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      console.warn("Error formatting date:", error);
      return "";
    }
  };
  const loadLoyaltyCards = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get or use business ID for the current user
      let businessId = user.id; // Default fallback

      try {
        const businesses = await BusinessService.getBusinessesByOwner(user.id);
        if (businesses.length > 0) {
          businessId = businesses[0].id; // Use the first business found
        }
      } catch (businessError) {
        console.warn("Could not fetch business, using user ID as fallback:", businessError);
        // Continue with user.id as businessId for backward compatibility
      }

      const cards = await LoyaltyCardService.getLoyaltyCardsByBusiness(businessId);
      setLoyaltyCards(cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loyalty cards");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLoyaltyCards();
    }, [user])
  );

  const handleRetry = () => {
    loadLoyaltyCards();
  };
  const handleCreateCard = () => {
    setCreateModalVisible(true);
  };
  const handleEditCard = async (cardId: string) => {
    try {
      setLoadingSelectedCard(true);
      const card = await LoyaltyCardService.getLoyaltyCard(cardId);
      if (card) {
        setSelectedCard(card);
        setEditModalVisible(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load loyalty card details");
    } finally {
      setLoadingSelectedCard(false);
    }
  };

  const handleModalSuccess = () => {
    loadLoyaltyCards(); // Refresh the list when modal operations are successful
  };
  const LoyaltyCardItem: React.FC<{ card: LoyaltyCard }> = ({ card }) => (
    <TouchableOpacity style={styles.cardItem} onPress={() => handleEditCard(card.id)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{card.businessName}</Text>
          <Text style={styles.cardSubtitle}>Activo desde {formatCreatedDate(card.createdAt)}</Text>
        </View>
        <View style={styles.cardActions}>
          <View style={[styles.statusBadge, card.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, card.isActive ? styles.activeText : styles.inactiveText]}>{card.isActive ? "Activo" : "Inactivo"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </View>
      </View>
      {/* Preview Section */}
      <AnimatedLoyaltyCard card={card} currentStamps={1} showAnimation={false} enableTilt={false} style={styles.previewContainer} />
    </TouchableOpacity>
  );

  if (initialLoading) {
    return <LoadingState loading={true} />;
  }

  if (error && !refreshing) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {loadingSelectedCard && (
        <View style={styles.centerLoadingOverlay}>
          <LoadingState loading={true} />
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>Mi Programa de Lealtad</Text>
        <Text style={styles.subtitle}>Gestiona tus tarjetas de lealtad</Text>
      </View>
      {loyaltyCards.length === 0 ? (
        <EmptyState
          icon="card"
          title="Aún No Tienes Tarjetas de Lealtad"
          message="Crea tu primera tarjeta de lealtad para comenzar a recompensar a tus clientes fieles."
          actionText="Crear Primera Tarjeta"
          onAction={handleCreateCard}
        />
      ) : (
        <>
          <FlatList
            data={loyaltyCards}
            renderItem={({ item }) => <LoyaltyCardItem card={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cardsList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadLoyaltyCards(true)} />}
          />
          <View style={styles.actionContainer}>
            <Button title="Crear Nueva Tarjeta" onPress={handleCreateCard} size="large" style={styles.createButton} />
          </View>
        </>
      )}
      {/* Modals */}
      <CreateLoyaltyCardModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onSuccess={handleModalSuccess} />
      {editModalVisible && selectedCard && (
        <EditLoyaltyCardModal
          visible={editModalVisible}
          cardData={selectedCard}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedCard(null);
          }}
          onSuccess={handleModalSuccess}
        />
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
  cardsList: {
    padding: SPACING.md,
  },
  cardItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: `${COLORS.success}20`,
  },
  inactiveBadge: {
    backgroundColor: `${COLORS.gray}20`,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
  activeText: {
    color: COLORS.success,
  },
  inactiveText: {
    color: COLORS.gray,
  },
  cardDetails: {
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    minWidth: 80,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  createButton: {
    width: "100%",
  },
  centerLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  previewContainer: {
    marginBottom: SPACING.md,
  },
});

export default LoyaltyProgramScreen;
