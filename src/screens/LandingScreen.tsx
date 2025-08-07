import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Image, Dimensions } from "react-native";
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

  const { width } = Dimensions.get("window");

  return (
    <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.subtitle, { fontFamily: "BalooBhaijaan2-Regular" }]}>Tu billetera digital para tarjetas de lealtad</Text>
            <Text style={styles.description}>Colecta sellos, gana recompensas y nunca pierdas tus tarjetas de lealtad nuevamente. Perfecto tanto para clientes como para negocios.</Text>
          </View>
          {/* Features */}
          <View style={styles.featuresSection}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureText}>Tarjetas Digitales</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🎁</Text>
              <Text style={styles.featureText}>Recompensas Inmediatas</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Seguir Progreso</Text>
            </View>
          </View>
          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <Button title="Comenzar" onPress={navigateToRegister} size="large" style={styles.primaryButton} textStyle={styles.primaryButtonText} />
            <Button title="Ya Tengo una Cuenta" onPress={navigateToLogin} variant="outline" size="large" style={styles.secondaryButton} textStyle={styles.secondaryButtonText} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
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
  logo: {
    marginBottom: SPACING.md,
    width: "100%",
    height: 150,
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
    opacity: 0.95,
    fontWeight: "600",
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
  primaryButtonText: {
    color: COLORS.primary,
  },
  secondaryButton: {
    borderColor: COLORS.white,
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: COLORS.white,
  },
});
