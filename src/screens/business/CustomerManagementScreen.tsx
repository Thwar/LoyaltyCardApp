import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, FlatList } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, LoadingState, EmptyState } from "../../components";
import { CreateLoyaltyCardModal } from "./CreateLoyaltyCardScreen";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { CustomerCardService, BusinessService, LoyaltyCardService } from "../../services/api";
import { CustomerCard, LoyaltyCard } from "../../types";

interface CustomerManagementScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);
  const loadCustomers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log("Loading customers for business owner:", user.id);

      // Get the business for the current user
      const businesses = await BusinessService.getBusinessesByOwner(user.id);
      console.log("Found businesses:", businesses.length);

      if (businesses.length === 0) {
        console.log("No businesses found for user");
        setCustomers([]);
        return;
      }
      const business = businesses[0]; // Use the first business
      console.log("Using business:", business.name, business.id);
      setBusinessId(business.id); // Store business ID// Get all loyalty cards for this business
      const loyaltyCards = await LoyaltyCardService.getLoyaltyCardsByBusiness(business.id);
      console.log("Found loyalty cards:", loyaltyCards.length);
      setLoyaltyCards(loyaltyCards); // Store loyalty cards in state

      // Get all customer cards for all loyalty cards of this business
      const allCustomerCards: CustomerCard[] = [];

      for (const loyaltyCard of loyaltyCards) {
        console.log("Getting customer cards for loyalty card:", loyaltyCard.id);
        const customerCards = await CustomerCardService.getActiveCustomerCardsWithUnclaimedRewards(loyaltyCard.id);
        console.log("Found customer cards:", customerCards.length);
        allCustomerCards.push(...customerCards);
      }

      console.log("Total customer cards found:", allCustomerCards.length);
      setCustomers(allCustomerCards);
    } catch (err) {
      console.error("Error loading customers:", err);
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };
  const CustomerCard: React.FC<{ customer: CustomerCard }> = ({ customer }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.customerName || `Cliente #${customer.cardCode || customer.id.slice(-6)}`}</Text>
        {customer.cardCode && <Text style={styles.customerDetail}>Código: {customer.cardCode}</Text>}
        <Text style={styles.customerDetail}>
          {customer.currentStamps} / {customer.loyaltyCard?.totalSlots || 0}
          sellos
        </Text>
        <Text style={[styles.customerDetail, customer.isRewardClaimed ? styles.rewardClaimed : styles.active]}>{customer.isRewardClaimed ? "🎁 Recompensa reclamada" : "✅ Activo"}</Text>
      </View>
      <Button
        title="Gestionar"
        onPress={() =>
          navigation.navigate("AddStamp", {
            loyaltyCardId: customer.loyaltyCardId,
            businessId: businessId || "",
          })
        }
        size="small"
        style={styles.addStampButton}
      />
    </View>
  );

  const handleRetry = () => {
    loadCustomers();
  };

  if (loading) {
    return <LoadingState loading={true} />;
  }

  if (error) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Clientes</Text>
        <Text style={styles.subtitle}>Gestiona los clientes de tu programa de lealtad</Text>
      </View>
      {customers.length === 0 ? (
        <EmptyState
          icon="people"
          title="Aún No Hay Clientes"
          message="Los clientes aparecerán aquí una vez que comiencen a usar tus tarjetas de lealtad. ¡Comparte tu negocio con los clientes para comenzar!"
          actionText="Crear Tarjeta de Lealtad"
          onAction={() => setCreateModalVisible(true)}
        />
      ) : (
        <FlatList data={customers} renderItem={({ item }) => <CustomerCard customer={item} />} keyExtractor={(item) => item.id} contentContainerStyle={styles.customersList} />
      )}
      <View style={styles.actionContainer}>
        <Button
          title="Gestionar Tarjetas de Clientes"
          onPress={() => {
            if (loyaltyCards.length > 0 && businessId) {
              navigation.navigate("AddStamp", {
                loyaltyCardId: loyaltyCards[0].id,
                businessId: businessId,
              });
            } else {
              alert("Primero debe crear una tarjeta de lealtad");
            }
          }}
          size="large"
          style={styles.actionButton}
        />
      </View>

      {/* Modal */}
      <CreateLoyaltyCardModal visible={createModalVisible} onClose={() => setCreateModalVisible(false)} onSuccess={() => loadCustomers()} />
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
  customersList: {
    padding: SPACING.md,
  },
  customerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...SHADOWS.small,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  active: {
    color: COLORS.success,
    fontWeight: "500",
  },
  rewardClaimed: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  addStampButton: {
    minWidth: 100,
  },
  actionContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBorder,
  },
  actionButton: {
    width: "100%",
  },
});
