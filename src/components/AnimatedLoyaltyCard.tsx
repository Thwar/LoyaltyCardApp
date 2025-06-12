import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING, SHADOWS } from "../constants";
import { LoyaltyCard as LoyaltyCardType } from "../types";

type StampShape = "circle" | "square" | "egg";

interface AnimatedLoyaltyCardProps {
  card: LoyaltyCardType;
  currentStamps?: number;
  onPress?: () => void;
  style?: any;
  showAnimation?: boolean;
  cardCode?: string;
  stampShape?: StampShape;
}

const { width } = Dimensions.get("window");

export const AnimatedLoyaltyCard: React.FC<AnimatedLoyaltyCardProps> = ({
  card,
  currentStamps = 0,
  onPress,
  style,
  showAnimation = true,
  cardCode,
  stampShape = "circle",
}) => {
  const progress = Math.min(currentStamps / card.totalSlots, 1);
  const isCompleted = currentStamps >= card.totalSlots;

  // Use stampShape from card first, then prop, then default to circle
  const selectedStampShape = card.stampShape || stampShape || "circle";

  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const stampAnimations = useRef(
    Array.from({ length: card.totalSlots }, () => new Animated.Value(0))
  ).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shinePosition = useRef(new Animated.Value(-width)).current;
  useEffect(() => {
    if (showAnimation) {
      // Animate progress bar
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // Animate stamps one by one
      stampAnimations.forEach((animation, index) => {
        if (index < currentStamps) {
          // Filled stamps get the full animation
          Animated.timing(animation, {
            toValue: 1,
            duration: 300,
            delay: index * 150,
            useNativeDriver: false,
          }).start();
        } else {
          // Empty stamps should be visible but not animated
          animation.setValue(1);
        }
      });

      // Pulse animation for completed cards
      if (isCompleted) {
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
      }

      // Shine effect
      const shineAnimation = Animated.timing(shinePosition, {
        toValue: width,
        duration: 2000,
        useNativeDriver: false,
      });
      Animated.loop(shineAnimation, { iterations: -1 }).start();
    } else {
      // If animation is disabled, make all stamps visible
      stampAnimations.forEach((animation) => {
        animation.setValue(1);
      });
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
  const getStampStyle = (shape: StampShape) => {
    // Calculate stamp size based on card width and number of columns
    const columns = getGridColumns(card.totalSlots);
    const availableWidth = width - SPACING.md * 4 - SPACING.xs * (columns - 1); // Account for padding and gaps
    const stampSize = Math.min(40, availableWidth / columns); // Max 40px, but scale down if needed

    const baseStyle = {
      width: stampSize,
      height: stampSize,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      margin: 2, // Small margin for better spacing
    };

    switch (shape) {
      case "square":
        return {
          ...baseStyle,
          borderRadius: 6,
        };
      case "egg":
        return {
          ...baseStyle,
          borderRadius: stampSize * 0.6,
          height: stampSize * 1.2,
        };
      case "circle":
      default:
        return {
          ...baseStyle,
          borderRadius: stampSize / 2,
        };
    }
  };

  const getGridColumns = (totalSlots: number) => {
    if (totalSlots <= 6) return 3;
    if (totalSlots <= 12) return 4;
    if (totalSlots <= 16) return 4;
    return 5;
  };
  const renderStamps = () => {
    const stamps = [];
    const stampStyle = getStampStyle(selectedStampShape);

    for (let i = 0; i < card.totalSlots; i++) {
      const isStamped = i < currentStamps;
      const animation = stampAnimations[i];

      stamps.push(
        <Animated.View
          key={i}
          style={[
            stampStyle,
            isStamped ? styles.stampFilled : styles.stampEmpty,
            {
              transform: [
                {
                  scale: animation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1.2, 1],
                  }),
                },
              ],
              opacity: animation,
            },
          ]}
        >
          <Text
            style={[
              styles.stampText,
              isStamped ? styles.stampTextFilled : styles.stampTextEmpty,
            ]}
          >
            {isStamped ? "✓" : ""}
          </Text>
        </Animated.View>
      );
    }
    return stamps;
  };

  const CardContent = () => (
    <View style={styles.container}>
      {/* Shine Effect Overlay */}
      {showAnimation && (
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
          <Text style={styles.businessName} numberOfLines={1}>
            {card.businessName}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progress}>#{cardCode}</Text>
          {isCompleted && (
            <Ionicons
              name="gift"
              size={16}
              color={COLORS.white}
              style={styles.giftIcon}
            />
          )}
        </View>
      </View>
      {/* Stamps Grid */}
      <View style={styles.stampsContainer}>
        <View style={styles.stampsGrid}>{renderStamps()}</View>
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
    showAnimation && {
      transform: [{ scale: scaleValue }],
    },
  ];

  if (onPress) {
    return (
      <Animated.View style={cardStyle}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <LinearGradient
            colors={[
              card.cardColor || COLORS.primary,
              card.cardColor ? `${card.cardColor}CC` : COLORS.primaryDark,
            ]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <CardContent />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={cardStyle}>
      <LinearGradient
        colors={[
          card.cardColor || COLORS.primary,
          card.cardColor ? `${card.cardColor}CC` : COLORS.primaryDark,
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
    padding: SPACING.lg,
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
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
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
  stampsContainer: {
    flex: 1,
    marginBottom: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
  },
  stampsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  stampsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  stampEmpty: {
    borderColor: "rgba(128, 128, 128, 0.3)",
    backgroundColor: "rgba(248, 248, 248, 0.8)",
  },
  stampFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  stampText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "bold",
  },
  stampTextEmpty: {
    color: "rgba(128, 128, 128, 0.5)",
  },
  stampTextFilled: {
    color: COLORS.white,
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
