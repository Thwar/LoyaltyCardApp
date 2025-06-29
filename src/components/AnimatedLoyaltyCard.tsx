import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Gyroscope } from "expo-sensors";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { LoyaltyCard as LoyaltyCardType } from "../types";
import { StampsGrid } from "./StampsGrid";
import { imageCache } from "../utils";

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
  // Gyroscope tilt animation props
  enableTilt?: boolean;
  tiltAmplitude?: number;
  scaleOnHover?: number;
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
  enableTilt = true,
  tiltAmplitude = 12,
  scaleOnHover = 1.03,
}) => {
  const progress = Math.min(currentStamps / card.totalSlots, 1);
  const isCompleted = currentStamps >= card.totalSlots;

  // Use stampShape from card first, then prop, then default to circle
  const selectedStampShape = card.stampShape || stampShape || "circle";

  // Memoize image sources to prevent unnecessary re-renders
  const backgroundImageSource = useMemo(() => {
    if (!card.backgroundImage) return null;
    return { uri: card.backgroundImage };
  }, [card.backgroundImage]);

  const businessLogoSource = useMemo(() => {
    if (!card.businessLogo) return null;
    return { uri: card.businessLogo };
  }, [card.businessLogo]);

  // Pre-load images when component mounts or URLs change
  useEffect(() => {
    const imagesToPreload: string[] = [];
    if (card.backgroundImage) imagesToPreload.push(card.backgroundImage);
    if (card.businessLogo) imagesToPreload.push(card.businessLogo);

    if (imagesToPreload.length > 0) {
      imageCache.preloadImages(imagesToPreload);
    }
  }, [card.backgroundImage, card.businessLogo]);

  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shinePosition = useRef(new Animated.Value(-width)).current;

  // Tilt animation values
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const tiltScale = useRef(new Animated.Value(1)).current;

  // Glass border effect animation value
  const borderGlow = useRef(new Animated.Value(0.5)).current;

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

    // Subtle glass border glow animation
    const glowAnimation = Animated.sequence([
      Animated.timing(borderGlow, {
        toValue: 0.8,
        duration: 2000,
        useNativeDriver: false,
      }),
      Animated.timing(borderGlow, {
        toValue: 0.5,
        duration: 2000,
        useNativeDriver: false,
      }),
    ]);
    Animated.loop(glowAnimation).start();
  }, [currentStamps, isCompleted, showAnimation]);

  // Gyroscope tilt effect
  useEffect(() => {
    if (!enableTilt) return;

    let subscription: any;

    const startGyroscope = async () => {
      try {
        // Set gyroscope update interval (in milliseconds)
        Gyroscope.setUpdateInterval(16); // ~60fps

        subscription = Gyroscope.addListener(({ x, y, z }) => {
          // Convert gyroscope data to rotation values
          // Gyroscope gives angular velocity, so we need to accumulate it
          // We'll use a dampening factor to make the effect subtle
          const dampening = 0.5;
          const maxRotation = tiltAmplitude;

          // Clamp the rotation values
          const rotationX = Math.max(-maxRotation, Math.min(maxRotation, -y * dampening * 100));
          const rotationY = Math.max(-maxRotation, Math.min(maxRotation, x * dampening * 100));

          // Apply smooth animation to the rotation values
          Animated.parallel([
            Animated.spring(rotateX, {
              toValue: rotationX,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.spring(rotateY, {
              toValue: rotationY,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
          ]).start();
        });
      } catch (error) {
        console.log("Gyroscope not available:", error);
      }
    };

    startGyroscope();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enableTilt, tiltAmplitude, rotateX, rotateY]);

  // Touch handlers for scale effect only (no tilt)
  const handleTouchStart = (event: any) => {
    Animated.spring(tiltScale, {
      toValue: scaleOnHover,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handleTouchEnd = () => {
    Animated.spring(tiltScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

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
      {/* Business Logo Background - Only show if no custom background image */}
      {backgroundImageSource && <Image source={backgroundImageSource} style={styles.backgroundLogo} resizeMode="cover" />}

      {/* Glass Border Effect */}
      <Animated.View
        style={[
          styles.glassBorder,
          {
            opacity: borderGlow,
          },
        ]}
      />

      {/* 3D Background Overlay */}
      <View style={styles.backgroundOverlay} />

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

      {/* Header - Business Name and Progress */}
      <View style={styles.header}>
        <View style={styles.businessInfo}>
          {businessLogoSource && !card.backgroundImage && <Image source={businessLogoSource} style={styles.businessLogo} resizeMode="contain" />}

          <Text style={styles.businessName} numberOfLines={1}>
            {card.businessName}
          </Text>
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
      {/* Reward Description */}
      <View style={styles.rewardContainer}>
        {/* <Text style={styles.rewardLabel}>🎁</Text> */}
        <Text style={styles.rewardDescription} numberOfLines={2}>
          🎁 {card.rewardDescription}
        </Text>
      </View>
      {/* Customer Card Date */}
      {/* {customerCard && (
        <View style={styles.customerCardContainer}>
          <Text style={styles.createdDate} numberOfLines={1}>
            Acumulando desde:{" "}
            {new Date(customerCard.createdAt).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      )} */}
    </View>
  );
  const cardStyle = [
    styles.cardWrapper,
    style,
    {
      transform: [
        { scale: showAnimation && isCompleted ? pulseValue : scaleValue },
        ...(enableTilt
          ? [
              { scale: tiltScale },
              {
                rotateX: rotateX.interpolate({
                  inputRange: [-tiltAmplitude, tiltAmplitude],
                  outputRange: [`${-tiltAmplitude + 2}deg`, `${tiltAmplitude + 2}deg`], // Add base 2deg tilt
                  extrapolate: "clamp",
                }),
              },
              {
                rotateY: rotateY.interpolate({
                  inputRange: [-tiltAmplitude, tiltAmplitude],
                  outputRange: [`-${tiltAmplitude}deg`, `${tiltAmplitude}deg`],
                  extrapolate: "clamp",
                }),
              },
            ]
          : [
              { rotateX: "2deg" }, // Default subtle 3D tilt when tilt is disabled
            ]),
      ],
    },
  ];

  const TiltContainer = ({ children }: { children: React.ReactNode }) => {
    if (!enableTilt) {
      return <>{children}</>;
    }

    return (
      <View onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} style={styles.tiltContainer}>
        {children}
      </View>
    );
  };

  const cardContent = (
    <LinearGradient
      colors={[card.cardColor || COLORS.primary, card.cardColor ? `${card.cardColor}CC` : COLORS.primaryDark]}
      style={[styles.gradient, card.backgroundImage && styles.gradientWithBackground]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <CardContent />
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Animated.View style={cardStyle}>
        <TiltContainer>
          <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
            {cardContent}
          </TouchableOpacity>
        </TiltContainer>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={cardStyle}>
      <TiltContainer>
        {backgroundImageSource ? (
          <ImageBackground source={backgroundImageSource} style={styles.backgroundImage} imageStyle={{ borderRadius: 20, resizeMode: "cover" }}>
            {cardContent}
          </ImageBackground>
        ) : (
          cardContent
        )}
      </TiltContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 20,
    // Reduced 3D shadows
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8.0,
    elevation: 12,
    // Add subtle border for depth
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tiltContainer: {
    flex: 1,
  },
  gradient: {
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    // Add inner shadow effect
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  container: {
    minHeight: 200,
    flex: 1,
    position: "relative",
    // Add subtle inner glow for depth
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 19, // Slightly smaller than outer radius for layered effect
  },
  backgroundLogo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    borderRadius: 19,
    opacity: 0.8, // Make logo subtle so content is readable
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Dark overlay for better text readability
    borderRadius: 19,
  },
  glassBorder: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "rgba(255, 255, 255, 0.6)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 19,
    // Create subtle gradient overlay for depth
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    // Reduced inner shadow effect
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 1,
  },

  shineOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ skewX: "-20deg" }],
    // Add shadow to shine effect
    shadowColor: "rgba(255, 255, 255, 0.5)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    // Lighter header background since we have logo background
    //backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginHorizontal: SPACING.xs,
    marginTop: SPACING.xs,
    // borderRadius: 16,
    paddingBottom: SPACING.sm,
    // // Reduced header shadow for layered effect
    // shadowColor: "rgba(0, 0, 0, 0.25)",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 1,
    // shadowRadius: 4,
    // Add border for definition
    // borderWidth: 1,
    // borderColor: "rgba(255, 255, 255, 0.3)",
  },
  businessInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  customerCardContainer: {
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    // backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    //  borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    flex: 1,
    // Add text shadow for 3D effect
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  businessLogo: {
    width: 72,
    height: 72,
    marginRight: SPACING.sm,
    borderRadius: 18,
    // Reduced 3D logo effects
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 4,
  },
  createdDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    opacity: 0.8,
    fontStyle: "italic",
    marginTop: 2,
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
    // Reduced 3D badge effect
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    // Text shadow
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  giftIcon: {
    marginTop: 4,
    // Reduced 3D gift icon effect
    shadowColor: "rgba(0, 0, 0, 0.25)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 3,
  },

  stampCounterContainer: {
    alignItems: "center",
    marginVertical: SPACING.sm,
  },
  stampCounter: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.white,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    textAlign: "center",
    minWidth: 60,
    // Reduced 3D counter effect
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 3,
    // Text shadow
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  rewardContainer: {
    marginBottom: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: SPACING.sm,
    marginHorizontal: SPACING.sm,
    borderRadius: 12,
    // Reduced 3D reward container effects
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    // Add subtle inner glow
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
  },
  rewardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.95,
    lineHeight: 18,
    // Add text shadow for better readability
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gradientWithBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Reduced overlay opacity to make background image more visible
  },
  backgroundImage: {
    borderRadius: 20,
    overflow: "hidden",
  },
});
