import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

type StampShape = "circle" | "square" | "egg";

interface StampsGridProps {
  totalSlots: number;
  currentStamps: number;
  stampShape?: StampShape;
  showAnimation?: boolean;
  size?: "small" | "medium" | "large";
  containerStyle?: any;
  stampColor?: string;
  showCheckmarks?: boolean;
}

const { width } = Dimensions.get("window");

export const StampsGrid: React.FC<StampsGridProps> = ({
  totalSlots,
  currentStamps = 0,
  stampShape = "circle",
  showAnimation = true,
  size = "medium",
  containerStyle,
  stampColor = COLORS.primary,
  showCheckmarks = true,
}) => {
  const stampAnimations = useRef(Array.from({ length: totalSlots }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (showAnimation) {
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
    } else {
      // If animation is disabled, make all stamps visible
      stampAnimations.forEach((animation) => {
        animation.setValue(1);
      });
    }
  }, [currentStamps, showAnimation, stampAnimations]);

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

  const renderStamps = () => {
    const stamps = [];
    const stampStyle = getStampStyle(stampShape);

    for (let i = 0; i < totalSlots; i++) {
      const isStamped = i < currentStamps;
      const animation = stampAnimations[i];

      stamps.push(
        <Animated.View
          key={i}
          style={[
            stampStyle,
            isStamped ? [styles.stampFilled, { borderColor: stampColor, backgroundColor: stampColor }] : styles.stampEmpty,
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
          {showCheckmarks && <Text style={[styles.stampText, isStamped ? styles.stampTextFilled : styles.stampTextEmpty]}>{isStamped ? "✓" : ""}</Text>}
        </Animated.View>
      );
    }
    return stamps;
  };

  return (
    <View style={[styles.stampsContainer, containerStyle]}>
      <View style={styles.stampsGrid}>{renderStamps()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  stampsContainer: {
    flex: 1,
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
    gap: SPACING.xs,
  },
  stampEmpty: {
    borderColor: "rgba(128, 128, 128, 0.3)",
    backgroundColor: "rgba(248, 248, 248, 0.8)",
  },
  stampFilled: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  stampText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
  },
  stampTextEmpty: {
    color: "rgba(128, 128, 128, 0.5)",
  },
  stampTextFilled: {
    color: COLORS.white,
  },
});
