import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { createShadowStyle } from "../utils";

type StampShape = "circle" | "square" | "egg" | "triangle" | "diamond" | "star";

interface StampsGridProps {
  totalSlots: number;
  currentStamps: number;
  stampShape?: StampShape;
  showAnimation?: boolean;
  size?: "small" | "medium" | "large";
  containerStyle?: any;
  stampColor?: string;
  showCheckmarks?: boolean;
  specialStampColor?: string;
  specialStampColorOutline?: string;
}

export const StampsGrid: React.FC<StampsGridProps> = ({
  totalSlots,
  currentStamps = 0,
  stampShape = "circle",
  showAnimation = true,
  size = "medium",
  containerStyle,
  stampColor = COLORS.primary,
  showCheckmarks = true,
  specialStampColor = "white",
  specialStampColorOutline = "rgba(255, 255, 255, 0.7)",
}) => {
  const stampAnimations = useRef<Animated.Value[]>([]).current;
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // Centralized cleanup function
  const cleanupAnimations = useRef(() => {
    // Stop all active animations
    activeAnimations.current.forEach((animation) => {
      try {
        animation.stop();
      } catch (error) {
        // Ignore errors when stopping already stopped animations
      }
    });
    activeAnimations.current = [];
  }).current;

  // Initialize animations array when totalSlots changes
  useEffect(() => {
    // Stop any running animations first
    cleanupAnimations();

    // Adjust animations array size
    while (stampAnimations.length < totalSlots) {
      stampAnimations.push(new Animated.Value(0));
    }
    if (stampAnimations.length > totalSlots) {
      // Clean up extra animations properly
      const removedAnimations = stampAnimations.splice(totalSlots);
      removedAnimations.forEach((animation) => {
        // Reset value and clear listeners to prevent memory leaks
        try {
          animation.setValue(0);
          animation.removeAllListeners();
        } catch (error) {
          // Ignore errors during cleanup
        }
      });
    }

    // Return cleanup function for this effect
    return cleanupAnimations;
  }, [totalSlots, cleanupAnimations]);

  useEffect(() => {
    // Stop previous animations
    cleanupAnimations();

    if (showAnimation) {
      // Animate stamps one by one
      stampAnimations.forEach((animation, index) => {
        if (index < currentStamps) {
          // Filled stamps get the full animation
          const animationInstance = Animated.timing(animation, {
            toValue: 1,
            duration: 300,
            delay: index * 150,
            useNativeDriver: false,
          });
          activeAnimations.current.push(animationInstance);
          animationInstance.start();
        } else {
          // Empty stamps should be visible but not animated
          animation.setValue(1);
        }
      });
    } else {
      // If animation is disabled, make all stamps visible
      stampAnimations.forEach((animation) => {
        animation.setValue(1);
      });
    }

    // Return cleanup function for this effect
    return cleanupAnimations;
  }, [currentStamps, showAnimation, cleanupAnimations]);

  // Cleanup animations on unmount - simplified and more reliable
  useEffect(() => {
    return () => {
      cleanupAnimations();
      // Reset all animation values and remove listeners
      stampAnimations.forEach((animation) => {
        try {
          animation.setValue(0);
          animation.removeAllListeners();
        } catch (error) {
          // Ignore errors during unmount cleanup
        }
      });
    };
  }, [cleanupAnimations]);

  const getStampSize = () => {
    switch (size) {
      case "small":
        return 24;
      case "large":
        return 48;
      case "medium":
      default:
        return 36;
    }
  };

  const getGridColumns = (slots: number) => {
    if (slots <= 6) return 3;
    if (slots <= 12) return 4;
    if (slots <= 16) return 4;
    return 5;
  };
  const getStampStyle = (shape: StampShape) => {
    const stampSize = getStampSize();
    const baseStyle = {
      width: stampSize,
      height: stampSize,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      margin: 2,
    };

    switch (shape) {
      case "square":
        return {
          ...baseStyle,
          borderRadius: 4,
          borderCurve: "continuous",
        };
      case "egg":
        return {
          ...baseStyle,
          borderRadius: stampSize * 0.5,
          borderCurve: "continuous",
          height: stampSize * 1.3,
          width: stampSize * 0.8,
        };
      case "triangle":
        return {
          width: stampSize,
          height: stampSize,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          margin: 2,
        };
      case "diamond":
        return {
          ...baseStyle,
          borderRadius: 4,
          borderCurve: "continuous",
          width: stampSize * 0.8,
          height: stampSize * 0.8,
        };
      case "star":
        return {
          ...baseStyle,
          borderRadius: stampSize * 0.2,
          borderCurve: "continuous",
        };
      case "circle":
      default:
        return {
          ...baseStyle,
          borderRadius: stampSize / 2,
          borderCurve: "continuous",
        };
    }
  };
  const renderStamps = () => {
    const stamps = [];
    const stampSize = getStampSize();

    for (let i = 0; i < totalSlots; i++) {
      const isStamped = i < currentStamps;
      const animation = stampAnimations[i] || new Animated.Value(1);

      const scaleTransform = showAnimation
        ? {
            scale: animation.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.3, 1.2, 1],
            }),
          }
        : { scale: 1 };
      if (stampShape === "triangle") {
        stamps.push(
          <Animated.View
            key={i}
            style={[
              {
                width: stampSize,
                height: stampSize,
                alignItems: "center",
                justifyContent: "center",
                margin: 2,
                transform: [scaleTransform],
                opacity: showAnimation ? animation : 1,
              },
            ]}
          >
            {isStamped ? (
              <Ionicons name="triangle" size={stampSize} color={specialStampColor} />
            ) : (
              <View style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Ionicons name="triangle-outline" size={stampSize} color={specialStampColorOutline} />
                <Text style={[styles.stampNumber, { fontSize: stampSize * 0.3, position: "absolute", bottom: 8, color: specialStampColorOutline }]}>{i + 1}</Text>
              </View>
            )}
          </Animated.View>
        );
      } // Star shape - use star icon always
      else if (stampShape === "star") {
        stamps.push(
          <Animated.View
            key={i}
            style={[
              {
                width: stampSize,
                height: stampSize,
                alignItems: "center",
                justifyContent: "center",
                margin: 2,
                transform: [scaleTransform],
                opacity: showAnimation ? animation : 1,
              },
            ]}
          >
            {isStamped ? (
              <Ionicons name="star" size={stampSize} color={specialStampColor} />
            ) : (
              <View style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
                <Ionicons name="star-outline" size={stampSize} color={specialStampColorOutline} />
                <Text style={[styles.stampNumber, { fontSize: stampSize * 0.3, position: "absolute", bottom: stampSize == 48 ? 14 : 10, color: specialStampColorOutline }]}>{i + 1}</Text>
              </View>
            )}
          </Animated.View>
        );
      }
      // All other shapes
      else {
        const stampStyle = getStampStyle(stampShape);
        const baseTransform = stampShape === "diamond" ? [{ rotate: "45deg" }] : [];

        stamps.push(
          <Animated.View
            key={i}
            style={[
              stampStyle,
              isStamped ? [styles.stampFilled, { backgroundColor: stampColor }] : styles.stampEmpty,
              {
                transform: [...baseTransform, scaleTransform],
                opacity: showAnimation ? animation : 1,
              },
            ]}
          >
            <View style={{ transform: stampShape === "diamond" ? [{ rotate: "-45deg" }] : [] }}>
              {isStamped ? (
                showCheckmarks && <Ionicons name="checkmark" size={stampSize * 0.5} color={COLORS.white} />
              ) : (
                <Text style={[styles.stampNumber, { fontSize: stampSize * 0.4 }]}>{i + 1}</Text>
              )}
            </View>
          </Animated.View>
        );
      }
    }
    return stamps;
  };
  return (
    <View style={[styles.stampsContainer, containerStyle]}>
      <View style={[styles.stampsGrid, { gap: stampShape === "diamond" ? SPACING.md : SPACING.sm }]}>{renderStamps()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  stampsContainer: {
    marginBottom: SPACING.md,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  stampsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  stampEmpty: {
    borderColor: "rgba(128, 128, 128, 0.3)",
    backgroundColor: "rgba(248, 248, 248, 0.8)",
  },
  stampFilled: {
    borderColor: COLORS.white,
    borderWidth: 3,
    ...createShadowStyle({
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  stampNumber: {
    color: "rgba(128, 128, 128, 0.8)",
    fontWeight: "600",
    textAlign: "center",
  },
});
