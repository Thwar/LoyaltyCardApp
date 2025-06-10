import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, FlatList } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { Button, LoadingState, EmptyState } from "../../components";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { CustomerCard } from "../../types";

interface CustomerManagementScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get all customer cards for this business
      // Note: This would need to be implemented in the API service
      // For now, we'll show a placeholder
      const customerCards: CustomerCard[] = [];
      setCustomers(customerCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const CustomerCard: React.FC<{ customer: CustomerCard }> = ({ customer }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>Customer #{customer.id.slice(-6)}</Text>
        <Text style={styles.customerDetail}>
          {customer.currentStamps} / {customer.loyaltyCard?.totalSlots} stamps
        </Text>
        <Text style={styles.customerDetail}>{customer.isRewardClaimed ? "Reward Claimed" : "Active"}</Text>
      </View>
      <Button title="Agregar Sello" onPress={() => navigation.navigate("AddStamp", { customerCardId: customer.id })} size="small" style={styles.addStampButton} />
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
          onAction={() => navigation.navigate("CreateCard")}
        />
      ) : (
        <FlatList data={customers} renderItem={({ item }) => <CustomerCard customer={item} />} keyExtractor={(item) => item.id} contentContainerStyle={styles.customersList} />
      )}
      <View style={styles.actionContainer}>
        <Button title="Agregar Sello a Cliente" onPress={() => navigation.navigate("AddStamp", { customerCardId: "" })} size="large" style={styles.actionButton} />
      </View>
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
