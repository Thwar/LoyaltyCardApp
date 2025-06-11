import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { LoadingState } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { BusinessService, LoyaltyCardService, CustomerCardService } from "../../services/api";
import { Business, LoyaltyCard, CustomerCard } from "../../types";

interface BusinessDiscoveryScreenProps {
  navigation: StackNavigationProp<any>;
}

interface BusinessWithCard extends Business {
  loyaltyCard?: LoyaltyCard | null;
  hasCard?: boolean;
  customerCard?: CustomerCard;
}

export const BusinessDiscoveryScreen: React.FC<BusinessDiscoveryScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessWithCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCard, setCreatingCard] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithCard | null>(null);
  const [newCardCode, setNewCardCode] = useState<string>("");
  useEffect(() => {
    console.log("🔄 useEffect triggered - user:", user?.id || "No user");
    loadBusinessesWithCards();
  }, [user]);

  const generateUniqueCardCode = async (businessId: string, customerId: string): Promise<string> => {
    // Generate a random 3-digit code
    let code = "";
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop

    do {
      code = Math.floor(100 + Math.random() * 900).toString();
      attempts++;
        // Check if this code already exists for this business-customer combination
      const existingCards = await CustomerCardService.getCustomerCards(customerId);
      const hasExistingCode = existingCards.some(
        card => card.loyaltyCard?.businessId === businessId && card.cardCode === code
      );
      
      if (!hasExistingCode) {
        break;
      }
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Unable to generate unique card code. Please try again.");
    }

    return code;
  };
  const loadBusinessesWithCards = async () => {
    if (!user) {
      console.log("🚫 loadBusinessesWithCards: No user found");
      return;
    }

    try {
      setLoading(true);
      console.log("📱 loadBusinessesWithCards: Starting to load businesses for user:", user.id);
      
      // Get all businesses with active loyalty cards
      const allBusinesses = await BusinessService.getAllBusinesses();
      console.log("🏢 loadBusinessesWithCards: Found", allBusinesses.length, "total businesses");
      console.log("🏢 loadBusinessesWithCards: All businesses:", allBusinesses);
      
      const customerCards = await CustomerCardService.getCustomerCards(user.id);
      console.log("🎫 loadBusinessesWithCards: Found", customerCards.length, "customer cards for user");
      console.log("🎫 loadBusinessesWithCards: Customer cards:", customerCards);      
      const businessesWithCards = await Promise.all(
        allBusinesses.map(async (business) => {
          try {
            console.log("🔍 Processing business:", business.name, "(ID:", business.id, ")");
            const loyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusinessId(business.id);
            console.log("💳 Found", loyaltyCards.length, "loyalty cards for business:", business.name);
            console.log("💳 Loyalty cards:", loyaltyCards);
            
            const loyaltyCard = loyaltyCards.length > 0 ? loyaltyCards[0] : null;
            const customerCard = customerCards.find(card => card.loyaltyCard?.businessId === business.id);
            
            if (loyaltyCard) {
              console.log("✅ Business", business.name, "has loyalty card. Active:", loyaltyCard.isActive);
            } else {
              console.log("❌ Business", business.name, "has no loyalty card");
            }
            
            const result = {
              ...business,
              loyaltyCard,
              hasCard: !!customerCard,
              customerCard,
            };
            
            console.log("📋 Final business object for", business.name, ":", result);
            return result;
          } catch (error) {
            console.error("❌ Error processing business", business.name, ":", error);
            return {
              ...business,
              loyaltyCard: null,
              hasCard: false,
            };
          }        })
      );
      
      console.log("🔗 All businesses with cards processed:", businessesWithCards.length);
      console.log("🔗 Businesses with cards details:", businessesWithCards);
      
      // Filter to only show businesses that have active loyalty cards
      const activeBusinesses = businessesWithCards.filter(
        business => business.loyaltyCard && business.loyaltyCard.isActive
      ) as BusinessWithCard[];

      console.log("🟢 Active businesses after filtering:", activeBusinesses.length);
      console.log("🟢 Active businesses list:", activeBusinesses);
      
      // Log each business and why it was included or excluded
      businessesWithCards.forEach(business => {
        const hasLoyaltyCard = !!business.loyaltyCard;
        const isActive = business.loyaltyCard?.isActive;
        console.log(`📊 Business: ${business.name}`);
        console.log(`   - Has loyalty card: ${hasLoyaltyCard}`);
        console.log(`   - Is active: ${isActive}`);
        console.log(`   - Included in final list: ${hasLoyaltyCard && isActive}`);
      });

      setBusinesses(activeBusinesses);
      console.log("✅ Final businesses set in state:", activeBusinesses.length);    } catch (error) {
      console.error("💥 Error loading businesses:", error);
      Alert.alert("Error", "Failed to load businesses. Please try again.");
    } finally {
      setLoading(false);
      console.log("🏁 loadBusinessesWithCards completed");
    }
  };

  const handleCreateCard = async (business: BusinessWithCard) => {
    if (!user || !business.loyaltyCard) return;

    setSelectedBusiness(business);
    setCreatingCard(business.id);

    try {
      // Generate unique 3-digit code
      const cardCode = await generateUniqueCardCode(business.id, user.id);
      
      // Create the customer card
      const newCard = await CustomerCardService.joinLoyaltyProgram(
        user.id,
        business.loyaltyCard.id,
        cardCode
      );

      setNewCardCode(cardCode);
      setModalVisible(true);
      
      // Reload the businesses to update the UI
      await loadBusinessesWithCards();
    } catch (error) {
      console.error("Error creating card:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to create loyalty card");
    } finally {
      setCreatingCard(null);
    }
  };

  const handleViewCard = (business: BusinessWithCard) => {
    if (business.customerCard) {
      navigation.navigate("CardDetails", { customerCard: business.customerCard });
    }
  };
  const renderBusinessItem = ({ item }: { item: BusinessWithCard }) => (
    <TouchableOpacity 
      style={styles.businessCard}
      onPress={() => item.hasCard ? handleViewCard(item) : handleCreateCard(item)}
      disabled={creatingCard === item.id}
    >
      <View style={styles.businessHeader}>
        <View style={styles.businessInfo}>
          <View style={styles.logoContainer}>
            {item.logoUrl ? (
              <Image source={{ uri: item.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="business" size={24} color={COLORS.gray} />
              </View>
            )}          </View>
          <View style={styles.businessDetails}>
            <Text style={styles.businessName}>{item.name}</Text>
            <Text style={styles.businessDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>        </View>
        <View style={styles.businessActions}>
          {item.hasCard && (
            <View style={[styles.statusBadge, styles.activeBadge]}>
              <Text style={[styles.statusText, styles.activeText]}>Miembro</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </View>
      </View>

      {item.loyaltyCard && (
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🎯 Recompensa:</Text>
            <Text style={styles.detailText} numberOfLines={2}>
              {item.loyaltyCard.rewardDescription}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📝 Cómo ganar:</Text>
            <Text style={styles.detailText} numberOfLines={2}>
              {item.loyaltyCard.stampDescription}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🎫 Sellos necesarios:</Text>
            <Text style={styles.detailText}>
              {item.loyaltyCard.totalSlots} sellos para completar
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.actionContainer}>
        {item.hasCard ? (
          <View style={[styles.actionButton, styles.viewButton]}>
            <Ionicons name="card" size={16} color={COLORS.white} />
            <Text style={styles.viewButtonText}>Ver Mi Tarjeta</Text>
          </View>
        ) : (
          <View style={[styles.actionButton, styles.createButton]}>
            {creatingCard === item.id ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="add" size={16} color={COLORS.white} />
                <Text style={styles.createButtonText}>Unirse al Programa</Text>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingState loading={true} />;
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.content}>        <Text style={styles.subtitle}>
          Descubre negocios increíbles y únete a sus programas de lealtad para ganar recompensas exclusivas
        </Text>

        {businesses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color={COLORS.gray} />            <Text style={styles.emptyTitle}>No hay programas disponibles</Text>
            <Text style={styles.emptyMessage}>
              En este momento no hay negocios con programas de lealtad activos. ¡Vuelve pronto para descubrir nuevas oportunidades de recompensas!
            </Text>
          </View>
        ) : (
          <FlatList
            data={businesses}
            renderItem={renderBusinessItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.businessList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            </View>
              <Text style={styles.modalTitle}>¡Bienvenido al Programa!</Text>
            <Text style={styles.modalMessage}>
              ¡Te has unido exitosamente al programa de lealtad de {selectedBusiness?.name}! Ahora puedes empezar a ganar sellos y recompensas.
            </Text>
        <View style={styles.cardCodeContainer}>
              <Text style={styles.cardCodeLabel}>Tu código de identificación:</Text>
              <Text style={styles.cardCode}>{newCardCode}</Text>
            </View>
              <Text style={styles.cardCodeDescription}>
              Presenta este código al negocio cuando hagas una compra para recibir sellos en tu tarjeta de lealtad.
            </Text>
        <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                if (selectedBusiness?.customerCard) {
                  navigation.navigate("CardDetails", { customerCard: selectedBusiness.customerCard });
                }
              }}
            >
              <Text style={styles.modalButtonText}>Ver Mi Tarjeta</Text>
            </TouchableOpacity>
        <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
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
  businessCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  businessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  businessInfo: {
    flexDirection: "row",
    flex: 1,
  },
  logoContainer: {
    marginRight: SPACING.md,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  businessDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  businessActions: {
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
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
  activeText: {
    color: COLORS.success,
  },
  cardDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
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
    minWidth: 120,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },  actionContainer: {
    alignItems: "stretch",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  viewButton: {
    backgroundColor: COLORS.success,
  },  createButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: 6,
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    marginLeft: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    minWidth: 300,
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
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
});
