import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { Button, LoyaltyCard, useAlert } from "../../components";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";
import { CustomerCardService } from "../../services/api";
import { CustomerCard } from "../../types";

interface ClaimRewardScreenProps {
  navigation: StackNavigationProp<any>;
  route: RouteProp<any, any>;
}

export const ClaimRewardScreen: React.FC<ClaimRewardScreenProps> = ({ navigation, route }) => {
  const { customerCard } = route.params;
  const { showAlert } = useAlert();
  const [claiming, setClaiming] = useState(false);

  const handleClaimReward = async () => {
    setClaiming(true);
    try {
      await CustomerCardService.claimReward(customerCard.id);

      showAlert({
        title: "Reward Claimed!",
        message: "Congratulations! Your reward has been claimed successfully. Show this screen to the business to redeem your reward.",
        buttons: [
          {
            text: "Done",
            onPress: () => {
              // Navigate back to home and refresh
              navigation.navigate("CustomerTabs", {
                screen: "Home",
                params: { refresh: true },
              });
            },
          },
        ],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to claim reward",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!customerCard.loyaltyCard) {
    return null;
  }

  const isEligible = customerCard.currentStamps >= customerCard.loyaltyCard.totalSlots;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Congratulations Header */}
        <View style={styles.header}>
          <Text style={styles.congratsText}>🎉 Congratulations! 🎉</Text>
          <Text style={styles.subText}>You've completed your loyalty card and earned a reward!</Text>
        </View>

        {/* Card Display */}
        <View style={styles.cardContainer}>
          <LoyaltyCard card={customerCard.loyaltyCard} currentStamps={customerCard.currentStamps} />
        </View>

        {/* Reward Details */}
        <View style={styles.rewardContainer}>
          <Text style={styles.rewardTitle}>Your Reward</Text>
          <Text style={styles.rewardDescription}>{customerCard.loyaltyCard.rewardDescription}</Text>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>How to Redeem:</Text>
            <Text style={styles.instructionsText}>
              1. Tap "Claim Reward" below{"\n"}
              2. Show this screen to the business{"\n"}
              3. Enjoy your reward!
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {!customerCard.isRewardClaimed && isEligible ? (
            <Button title="Claim My Reward" onPress={handleClaimReward} loading={claiming} size="large" style={styles.claimButton} />
          ) : (
            <View style={styles.alreadyClaimedContainer}>
              <Text style={styles.alreadyClaimedText}>✅ Reward Already Claimed</Text>
              <Text style={styles.alreadyClaimedSubText}>Thank you for using our loyalty program!</Text>
            </View>
          )}

          <Button title="Back to My Cards" onPress={() => navigation.navigate("CustomerTabs", { screen: "Home" })} variant="outline" size="large" style={styles.backButton} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  congratsText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  cardContainer: {
    marginBottom: SPACING.xl,
  },
  rewardContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  rewardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  rewardDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  instructionsContainer: {
    backgroundColor: COLORS.lightGray,
    padding: SPACING.md,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: SPACING.md,
  },
  claimButton: {
    backgroundColor: COLORS.success,
  },
  backButton: {
    marginTop: SPACING.sm,
  },
  alreadyClaimedContainer: {
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  alreadyClaimedText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  alreadyClaimedSubText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
