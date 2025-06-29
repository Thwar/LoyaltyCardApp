import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, ImageBackground, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { LoyaltyCard as LoyaltyCardType } from "../types";
import { StampsGrid } from "./StampsGrid";
import { imageCache, createShadowStyle, createTextShadowStyle } from "../utils";

type StampShape = "circle" | "square" | "egg" | "triangle" | "diamond" | "star";

interface AnimatedLoyaltyCardProps {
  card: LoyaltyCardType;
  currentStamps?: number;
  onPress?: () => void;
  style?: ViewStyle;
  showAnimation?: boolean;
  cardCode?: string;
  stampShape?: StampShape;
  enableTilt?: boolean;
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
  scaleOnHover = 1.03,
}) => {
  const isCompleted = currentStamps >= card.totalSlots;

  // Use stampShape from card first, then prop, then default to circle
  const selectedStampShape = card.stampShape || stampShape;

  // Memoize image sources to prevent unnecessary re-renders
  const backgroundImageSource = useMemo(() => {
    return card.backgroundImage ? { uri: card.backgroundImage } : null;
  }, [card.backgroundImage]);

  const businessLogoSource = useMemo(() => {
    return card.businessLogo ? { uri: card.businessLogo } : null;
  }, [card.businessLogo]);

  // Memoize texture dots to prevent re-creation on every render
  const textureDots = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.textureDot,
            {
              top: 30 + (i % 4) * 40,
              left: 30 + Math.floor(i / 4) * 60,
              opacity: 0.5 + (i % 3) * 0.2,
            },
          ]}
        />
      )),
    []
  );

  // Pre-load images when component mounts or URLs change
  useEffect(() => {
    const imagesToPreload: string[] = [];
    if (card.backgroundImage) imagesToPreload.push(card.backgroundImage);
    if (card.businessLogo) imagesToPreload.push(card.businessLogo);

    if (imagesToPreload.length > 0) {
      imageCache.preloadImages(imagesToPreload);
    }
  }, [card.backgroundImage, card.businessLogo]);

  // Animation values - only create what we need
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shinePosition = useRef(new Animated.Value(-width)).current;
  const tiltScale = useRef(new Animated.Value(1)).current;
  const borderGlow = useRef(new Animated.Value(0.5)).current;

  // Animation cleanup ref
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    // Clear previous animations
    animationsRef.current.forEach((anim) => anim.stop());
    animationsRef.current = [];

    if (showAnimation && isCompleted) {
      // Reset shine position to start position
      shinePosition.setValue(-width);

      // Pulse animation for completed cards
      const pulseAnimation = Animated.loop(
        Animated.sequence([
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
        ])
      );

      // Shine effect for completed cards only
      const shineAnimation = Animated.loop(
        Animated.timing(shinePosition, {
          toValue: width,
          duration: 2000,
          useNativeDriver: false,
        }),
        { iterations: -1 }
      );

      animationsRef.current.push(pulseAnimation, shineAnimation);
      pulseAnimation.start();
      shineAnimation.start();
    } else {
      // Reset shine position when animation is disabled or card is not completed
      shinePosition.setValue(-width);
    }

    // Subtle glass border glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
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
      ])
    );

    animationsRef.current.push(glowAnimation);
    glowAnimation.start();

    // Cleanup function
    return () => {
      animationsRef.current.forEach((anim) => anim.stop());
    };
  }, [isCompleted, showAnimation, width]);

  // Touch handlers for scale effect only (no tilt)
  const handleTouchStart = () => {
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

      {/* Subtle Texture Overlay - Only when no background image */}
      {!card.backgroundImage && (
        <View style={styles.textureOverlay}>
          <View style={styles.texturePattern} />
          <View style={[styles.texturePattern, styles.texturePattern2]} />
          <View style={[styles.texturePattern, styles.texturePattern3]} />
          {/* Add multiple small dots for texture */}
          {textureDots}
        </View>
      )}

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
      <View style={[styles.header, !card.backgroundImage && styles.headerNoBackground]}>
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
        <Text style={styles.rewardDescription} numberOfLines={2}>
          🎁 {card.rewardDescription}
        </Text>
      </View>
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
              { rotateX: "2deg" }, // Simplified tilt effect
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
    ...createShadowStyle({
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 8.0,
      elevation: 12,
    }),
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  container: {
    minHeight: 200,
    flex: 1,
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 19,
  },
  textureOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 19,
    opacity: 0.6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  texturePattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "rgba(255, 255, 255, 0.15)",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 2,
  },
  texturePattern2: {
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    transform: [{ rotate: "45deg" }],
  },
  texturePattern3: {
    top: 40,
    left: 40,
    right: 40,
    bottom: 40,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    transform: [{ rotate: "-45deg" }],
  },
  textureDot: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "rgba(255, 255, 255, 0.15)",
    shadowOffset: { width: 0.5, height: 0.5 },
    shadowOpacity: 1,
    shadowRadius: 1.5,
    elevation: 1,
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
    opacity: 0.8,
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
    backgroundColor: "rgba(0, 0, 0, 0.05)",
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
    marginHorizontal: SPACING.xs,
    marginTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  headerNoBackground: {
    marginBottom: 0,
  },
  businessInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    flex: 1,
    ...createTextShadowStyle({
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 1, height: 2 },
      textShadowRadius: 4,
    }),
  },
  businessLogo: {
    width: 72,
    height: 72,
    marginRight: SPACING.sm,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 4,
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    ...createTextShadowStyle({
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  giftIcon: {
    marginTop: 4,
    elevation: 3,
  },

  rewardContainer: {
    marginBottom: SPACING.sm,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: SPACING.sm,
    marginHorizontal: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
  },
  rewardDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.95,
    lineHeight: 18,
    ...createTextShadowStyle({
      textShadowColor: "rgba(0, 0, 0, 0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  gradientWithBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  backgroundImage: {
    borderRadius: 20,
    overflow: "hidden",
  },
});
