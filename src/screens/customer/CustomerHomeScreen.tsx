import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../../context/AuthContext";
import { LoyaltyCard, LoadingState, EmptyState } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { CustomerCard, LoyaltyCard as LoyaltyCardType } from "../../types";

interface CustomerHomeScreenProps {
  navigation: StackNavigationProp<any>;
}

export const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CustomerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCards = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const customerCards = await CustomerCardService.getCustomerCards(user.id);
      setCards(customerCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [user])
  );

  const handleCardPress = (card: CustomerCard) => {
    navigation.navigate("CardDetails", { customerCard: card });
  };

  const handleRetry = () => {
    loadCards();
  };

  const renderCard = ({ item }: { item: CustomerCard }) => <LoyaltyCard card={item.loyaltyCard!} currentStamps={item.currentStamps} onPress={() => handleCardPress(item)} />;

  if (loading && !refreshing) {
    return <LoadingState loading={true} />;
  }

  if (error && !refreshing) {
    return <LoadingState error={error} onRetry={handleRetry} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.displayName}</Text>
      </View>

      {cards.length === 0 ? (
        <EmptyState
          icon="card"
          title="No Loyalty Cards Yet"
          message="Start collecting loyalty cards from your favorite businesses to track your rewards and earn benefits."
          actionText="Find Businesses"
          onAction={() => {
            // TODO: Navigate to business discovery screen
            console.log("Navigate to business discovery");
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
});
