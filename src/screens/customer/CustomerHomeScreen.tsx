import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView, TouchableOpacity, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { AnimatedLoyaltyCard, LoadingState, EmptyState } from "../../components";
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(
    useCallback(() => {
      // Only load cards on initial focus or if we haven't loaded initially
      if (!hasLoadedInitially.current) {
        loadCards();
        hasLoadedInitially.current = true;
      }
    }, [user])
  );

  const handleCardPress = (card: CustomerCard) => {
    navigation.navigate("CardDetails", { customerCard: card });
  };

  const handleRetry = () => {
    loadCards();
  };
  const renderCard = ({ item, index }: { item: CustomerCard; index: number }) => {
    // Cycle through different stamp shapes for visual variety
    const stampShapes: ("circle" | "square" | "egg" | "triangle" | "diamond" | "star")[] = ["circle", "square", "egg", "triangle", "diamond", "star"];
    const stampShape = stampShapes[index % stampShapes.length];

    return (
      <AnimatedLoyaltyCard
        card={item.loyaltyCard!}
        currentStamps={item.currentStamps}
        onPress={() => handleCardPress(item)}
        cardCode={item.cardCode}
        showAnimation={true}
        stampShape={stampShape}
        customerCard={item}
      />
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
            navigation.navigate("BusinessDiscovery");
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
    backgroundColor: COLORS.inputBorder,
  },
  defaultProfileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
});
