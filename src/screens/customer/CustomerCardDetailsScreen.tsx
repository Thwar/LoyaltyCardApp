import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { Button, LoyaltyCard, LoadingState, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { CustomerCard } from "../../types";

interface CustomerCardDetailsScreenProps {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any, any>;
}

export const CustomerCardDetailsScreen: React.FC<CustomerCardDetailsScreenProps> = ({ navigation, route }) => {
  const { customerCard: initialCard } = route.params;
  const { showAlert } = useAlert();
  const [card, setCard] = useState<CustomerCard>(initialCard);
  const [loading, setLoading] = useState(false);

  const isCardComplete = card.currentStamps >= (card.loyaltyCard?.totalSlots || 0);
  const canClaimReward = isCardComplete && !card.isRewardClaimed;

  const handleClaimReward = () => {
    if (canClaimReward) {
      navigation.navigate("ClaimReward", { customerCard: card });
    }
  };

  const handleViewBusiness = () => {
    if (card.loyaltyCard) {
      navigation.navigate("BusinessProfile", { businessId: card.loyaltyCard.businessId });
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
        message: "Failed to refresh card details",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCard();
  }, []);

  if (!card.loyaltyCard) {
    return <LoadingState error="Card details not available" onRetry={() => navigation.goBack()} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Card Display */}
        <View style={styles.cardContainer}>
          <LoyaltyCard card={card.loyaltyCard} currentStamps={card.currentStamps} />
        </View>

        {/* Card Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Card Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Progress:</Text>
            <Text style={styles.statusValue}>
              {card.currentStamps} / {card.loyaltyCard.totalSlots} stamps
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, canClaimReward && styles.statusValueSuccess]}>{card.isRewardClaimed ? "Reward Claimed" : canClaimReward ? "Ready to Claim!" : "In Progress"}</Text>
          </View>
          {card.lastStampDate && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Stamp:</Text>
              <Text style={styles.statusValue}>{new Date(card.lastStampDate).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {/* Card Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>How It Works</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🎯 Goal:</Text>
            <Text style={styles.detailText}>Collect {card.loyaltyCard.totalSlots} stamps</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📝 How to earn:</Text>
            <Text style={styles.detailText}>{card.loyaltyCard.stampDescription}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🎁 Reward:</Text>
            <Text style={styles.detailText}>{card.loyaltyCard.rewardDescription}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {canClaimReward && <Button title="Claim Your Reward!" onPress={handleClaimReward} size="large" style={styles.claimButton} />}

          <Button title="View Business Profile" onPress={handleViewBusiness} variant="outline" size="large" style={styles.businessButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  cardContainer: {
    marginVertical: SPACING.lg,
  },
  statusContainer: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
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
    margin: SPACING.md,
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
