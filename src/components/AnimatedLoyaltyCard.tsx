import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { LoyaltyCard as LoyaltyCardType } from "../types";
import { StampsGrid } from "./StampsGrid";

type StampShape = "circle" | "square" | "egg" | "triangle" | "diamond" | "star";

interface AnimatedLoyaltyCardProps {
  card: LoyaltyCardType;
  currentStamps?: number;
  onPress?: () => void;
  style?: any;
  showAnimation?: boolean;
  cardCode?: string;
  stampShape?: StampShape;
  customerCard?: { createdAt: Date };
}

const { width } = Dimensions.get("window");

export const AnimatedLoyaltyCard: React.FC<AnimatedLoyaltyCardProps> = ({ card, currentStamps = 0, onPress, style, showAnimation = true, cardCode, stampShape = "circle", customerCard }) => {
  const progress = Math.min(currentStamps / card.totalSlots, 1);
  const isCompleted = currentStamps >= card.totalSlots;

  // Use stampShape from card first, then prop, then default to circle
  const selectedStampShape = card.stampShape || stampShape || "circle";

  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shinePosition = useRef(new Animated.Value(-width)).current;
  useEffect(() => {
    if (showAnimation && isCompleted) {
      // Pulse animation for completed cards
      const pulseAnimation = Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);
      Animated.loop(pulseAnimation).start();

      // Shine effect for completed cards only
      const shineAnimation = Animated.timing(shinePosition, {
        toValue: width,
        duration: 2000,
        useNativeDriver: false,
      });
      Animated.loop(shineAnimation, { iterations: -1 }).start();
    }
  }, [currentStamps, isCompleted, showAnimation]);
  const handlePress = () => {
    if (onPress) {
      // Scale animation on press
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onPress();
    }
  };

  const CardContent = () => (
    <View style={styles.container}>
      {/* Shine Effect Overlay */}
      {showAnimation && isCompleted && (
        <Animated.View
          style={[
            styles.shineOverlay,
            {
              transform: [{ translateX: shinePosition }],
            },
          ]}
        />
      )}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.businessInfo}>
          <View style={styles.businessNameContainer}>
            {card.businessLogo && <Image source={{ uri: card.businessLogo }} style={styles.businessLogo} resizeMode="contain" />}
            <Text style={styles.businessName} numberOfLines={1}>
              {card.businessName}
            </Text>
          </View>
          {customerCard && (
            <Text style={styles.createdDate} numberOfLines={1}>
              Acumulando desde:{" "}
              {new Date(customerCard.createdAt).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          )}
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progress}>#{cardCode}</Text>
          {isCompleted && <Ionicons name="gift" size={24} color={COLORS.white} style={styles.giftIcon} />}
        </View>
      </View>
      {/* Stamps Grid */}
      <StampsGrid
        totalSlots={card.totalSlots}
        currentStamps={currentStamps}
        stampShape={selectedStampShape}
        showAnimation={showAnimation}
        size={card.totalSlots >= 7 ? "medium" : "large"}
        stampColor={card.cardColor || COLORS.primary}
      />
      {/* Stamp Counter */}
      <View style={styles.stampCounterContainer}>
        <Text style={styles.stampCounter}>
          {currentStamps}/{card.totalSlots} sellos
        </Text>
      </View>
      {/* Reward Description */}
      <View style={styles.rewardContainer}>
        {/* <Text style={styles.rewardLabel}>🎁</Text> */}
        <Text style={styles.rewardDescription} numberOfLines={2}>
          🎁 {card.rewardDescription}
        </Text>
      </View>
    </View>
  );
  const cardStyle = [
    styles.cardWrapper,
    style,
    showAnimation &&
      isCompleted && {
        transform: [{ scale: pulseValue }],
      },
  ];

  if (onPress) {
    return (
      <Animated.View style={cardStyle}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <LinearGradient colors={[card.cardColor || COLORS.primary, card.cardColor ? `${card.cardColor}CC` : COLORS.primaryDark]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <CardContent />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={cardStyle}>
      <LinearGradient colors={[card.cardColor || COLORS.primary, card.cardColor ? `${card.cardColor}CC` : COLORS.primaryDark]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <CardContent />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 20,
    ...SHADOWS.large,
    elevation: 8,
  },
  gradient: {
    borderRadius: 20,
    // padding: SPACING.lg,
    overflow: "hidden",
    position: "relative",
  },
  container: {
    minHeight: 200,
    flex: 1,
  },
  shineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    transform: [{ skewX: "-20deg" }],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  businessInfo: {
    flex: 1,
  },
  businessNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  businessLogo: {
    width: 48,
    height: 48,
    marginRight: SPACING.sm,
    borderRadius: 12,
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    flex: 1,
  },
  createdDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.8,
    fontStyle: "italic",
    marginTop: 2,
  },
  cardCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  cardCode: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    marginLeft: 4,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  progressContainer: {
    alignItems: "center",
  },
  progress: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 15,
    textAlign: "center",
    minWidth: 50,
  },
  giftIcon: {
    marginTop: 4,
  },

  stampCounterContainer: {
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  stampCounter: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    textAlign: "center",
    minWidth: 60,
  },

  rewardContainer: {
    marginBottom: SPACING.md,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: SPACING.sm,
    borderRadius: 12,
  },
  rewardLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.95,
    lineHeight: 18,
  },
  progressBarContainer: {
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 5,
    shadowColor: COLORS.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  completedText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: SPACING.sm,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
