import React from "react";
import { View, Text, StyleSheet, ImageBackground, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";

import { Button } from "../components";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { AuthStackParamList } from "../types";

type LandingScreenNavigationProp = StackNavigationProp<AuthStackParamList, "Landing">;

interface LandingScreenProps {
  navigation: LandingScreenNavigationProp;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const navigateToLogin = () => {
    navigation.navigate("Login");
  };

  const navigateToRegister = () => {
    navigation.navigate("Register");
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradient}>
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>LoyaltyCard</Text>
            <Text style={styles.subtitle}>Your digital wallet for loyalty cards</Text>
            <Text style={styles.description}>Collect stamps, earn rewards, and never lose your loyalty cards again. Perfect for customers and businesses alike.</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresSection}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureText}>Digital Cards</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎁</Text>
              <Text style={styles.featureText}>Instant Rewards</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Track Progress</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <Button title="Get Started" onPress={navigateToRegister} size="large" style={styles.primaryButton} />
            <Button title="I Already Have an Account" onPress={navigateToLogin} variant="outline" size="large" style={styles.secondaryButton} />
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: "space-between",
    paddingVertical: SPACING.xl,
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.white,
    textAlign: "center",
    marginBottom: SPACING.lg,
    opacity: 0.9,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
    paddingHorizontal: SPACING.md,
  },
  featuresSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: SPACING.xl,
  },
  feature: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonSection: {
    gap: SPACING.md,
  },
  primaryButton: {
    backgroundColor: COLORS.white,
  },
  secondaryButton: {
    borderColor: COLORS.white,
  },
});
