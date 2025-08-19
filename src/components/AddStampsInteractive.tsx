import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image, ImageBackground, ViewStyle, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../constants";
import { LoyaltyCard as LoyaltyCardType } from "../types";
import { imageCache, createShadowStyle, createTextShadowStyle } from "../utils";
import * as Haptics from "expo-haptics";

// Interactive animated loyalty card used specifically for adding stamps
// Mirrors AnimatedLoyaltyCard visuals but provides a tappable next-slot grid.

export type StampShape = "circle" | "square" | "egg" | "triangle" | "diamond" | "star";

interface AddStampsInteractiveProps {
  card: LoyaltyCardType;
  currentStamps: number;
  cardCode?: string;
  style?: ViewStyle;
  // Always-on per requirements
  showAnimation?: boolean; // kept for API symmetry but defaults to true
  enableTilt?: boolean; // kept for API symmetry but defaults to true
  scaleOnHover?: number;
  onPendingChange?: (pending: number) => void;
}

const { width } = Dimensions.get("window");

export const AddStampsInteractive: React.FC<AddStampsInteractiveProps> = ({ card, currentStamps, style, cardCode, showAnimation = true, enableTilt = true, scaleOnHover = 1.03, onPendingChange }) => {
  const [pending, setPending] = useState(0);

  const totalSlots = card.totalSlots;
  const effectiveStamps = Math.min(totalSlots, currentStamps + pending);
  const isCompleted = effectiveStamps >= totalSlots;
  const selectedStampShape: StampShape = card.stampShape || "circle";

  // Images
  const backgroundImageSource = useMemo(() => (card.backgroundImage ? { uri: card.backgroundImage } : null), [card.backgroundImage]);
  const businessLogoSource = useMemo(() => (card.businessLogo ? { uri: card.businessLogo } : null), [card.businessLogo]);

  useEffect(() => {
    const urls: string[] = [];
    if (card.backgroundImage) urls.push(card.backgroundImage);
    if (card.businessLogo) urls.push(card.businessLogo);
    if (urls.length) imageCache.preloadImages(urls);
  }, [card.backgroundImage, card.businessLogo]);

  // Anim vals
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shinePosition = useRef(new Animated.Value(-width)).current;
  const tiltScale = useRef(new Animated.Value(1)).current;
  const borderGlow = useRef(new Animated.Value(0.5)).current;
  const nextPulseAnim = useRef(new Animated.Value(0)).current; // 0..1 for scale/opacity

  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const glowAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  const cleanupAnimations = useRef(() => {
    animationsRef.current.forEach((a) => {
      try {
        a.stop();
      } catch {}
    });
    animationsRef.current = [];
    if (glowAnimationRef.current) {
      try {
        glowAnimationRef.current.stop();
      } catch {}
      glowAnimationRef.current = null;
    }
    try {
      pulseValue.setValue(1);
      shinePosition.setValue(-width);
      tiltScale.setValue(1);
      borderGlow.setValue(0.5);
    } catch {}
  }).current;

  // Pulse/shine only when complete
  useEffect(() => {
    cleanupAnimations();
    if (showAnimation && isCompleted) {
      shinePosition.setValue(-width);
      const pulseAnimation = Animated.loop(
        Animated.sequence([Animated.timing(pulseValue, { toValue: 1.05, duration: 800, useNativeDriver: true }), Animated.timing(pulseValue, { toValue: 1, duration: 800, useNativeDriver: true })])
      );
      const shineAnimation = Animated.loop(Animated.timing(shinePosition, { toValue: width, duration: 2000, useNativeDriver: false }), { iterations: -1 });
      animationsRef.current.push(pulseAnimation, shineAnimation);
      pulseAnimation.start();
      shineAnimation.start();
    } else {
      shinePosition.setValue(-width);
    }
    return cleanupAnimations;
  }, [isCompleted, showAnimation]);

  // Stronger pulse for next tappable slot
  useEffect(() => {
    if (!showAnimation) return;
    const hasNext = effectiveStamps < totalSlots;
    if (!hasNext) {
      try {
        nextPulseAnim.stopAnimation();
        nextPulseAnim.setValue(0);
      } catch {}
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([Animated.timing(nextPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(nextPulseAnim, { toValue: 0, duration: 800, useNativeDriver: true })])
    );
    anim.start();
    return () => {
      try {
        anim.stop();
        nextPulseAnim.setValue(0);
      } catch {}
    };
  }, [effectiveStamps, totalSlots, showAnimation]);

  // Subtle glass border glow
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([Animated.timing(borderGlow, { toValue: 0.8, duration: 2000, useNativeDriver: false }), Animated.timing(borderGlow, { toValue: 0.5, duration: 2000, useNativeDriver: false })])
    );
    glowAnimationRef.current = glow;
    glow.start();
    return () => {
      try {
        glow.stop();
      } catch {}
      glowAnimationRef.current = null;
    };
  }, []);

  // Touch tilt
  const handleTouchStart = () => {
    Animated.spring(tiltScale, { toValue: scaleOnHover, useNativeDriver: true, tension: 300, friction: 10 }).start();
  };
  const handleTouchEnd = () => {
    Animated.spring(tiltScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  };

  // Pending management
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);

  const nextTappableIndex = Math.min(totalSlots - 1, currentStamps + pending);

  const handleTapSlot = (index: number) => {
    // Already stamped (historical) -> ignore
    if (index < currentStamps) return;

    // Tap on last pending -> undo
    if (pending > 0 && index === currentStamps + pending - 1) {
      setPending((p) => Math.max(0, p - 1));
      // light selection haptic
      try {
        Haptics.selectionAsync();
      } catch {}
      return;
    }

    // Only allow tapping the immediate next slot
    if (index === currentStamps + pending) {
      const maxAdd = totalSlots - (currentStamps + pending);
      if (maxAdd <= 0) return;
      setPending((p) => p + 1);
      // stronger impact haptic
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      return;
    }

    // Tapping any other future empty slot is ignored
  };

  // Texture dots (only when no bg image)
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

  // Grid rendering (inline to keep StampsGrid unchanged)
  const renderGrid = () => {
    const stamps: React.ReactNode[] = [];
    const sizePx = getStampSize(totalSlots);

    for (let i = 0; i < totalSlots; i++) {
      const isStamped = i < effectiveStamps;
      const isNext = i === currentStamps + pending && effectiveStamps < totalSlots; // next tappable slot
      const isHistorical = i < currentStamps;

      const content = renderStampShape(selectedStampShape, i, isStamped, sizePx, card.cardColor || COLORS.primary);

      const cell = (
        <Pressable key={i} onPress={() => handleTapSlot(i)} disabled={isHistorical} style={({ pressed }) => [styles.pressWrap, pressed && styles.pressed]}>
          <View style={[styles.cellWrap]}>
            {content}
            {isNext && (
              <Animated.View
                style={[
                  styles.nextPulse,
                  {
                    width: sizePx + 16,
                    height: sizePx + 16,
                    borderRadius: selectedStampShape === "circle" ? (sizePx + 16) / 2 : 12,
                    transform: [
                      {
                        scale: nextPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }),
                      },
                    ],
                    opacity: nextPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.1] }),
                  },
                ]}
              />
            )}
          </View>
        </Pressable>
      );
      stamps.push(cell);
    }

    return <View style={[styles.stampsGrid, { gap: selectedStampShape === "diamond" ? SPACING.md : SPACING.sm }]}>{stamps}</View>;
  };

  const CardContent = () => (
    <View style={styles.container}>
      {backgroundImageSource && <Image source={backgroundImageSource} style={styles.backgroundLogo} resizeMode="cover" />}
      <Animated.View style={[styles.glassBorder, { opacity: borderGlow }]} />
      <View style={styles.backgroundOverlay} />
      {!card.backgroundImage && (
        <View style={styles.textureOverlay}>
          <View style={styles.texturePattern} />
          <View style={[styles.texturePattern, styles.texturePattern2]} />
          <View style={[styles.texturePattern, styles.texturePattern3]} />
          {textureDots}
        </View>
      )}
      {showAnimation && isCompleted && <Animated.View style={[styles.shineOverlay, { transform: [{ translateX: shinePosition }] }]} />}

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

      <View style={styles.gridContainer}>{renderGrid()}</View>

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
      transform: [{ scale: showAnimation && isCompleted ? pulseValue : 1 }, ...(enableTilt ? [{ scale: tiltScale }, { rotateX: "2deg" }] : [{ rotateX: "2deg" }])],
    },
  ];

  const TiltContainer = ({ children }: { children: React.ReactNode }) => {
    if (!enableTilt) return <>{children}</>;
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

// Helpers adapted from StampsGrid but kept local to avoid changing that component
const getStampSize = (totalSlots: number) => {
  if (totalSlots >= 16) return 32; // compact
  if (totalSlots >= 12) return 36;
  if (totalSlots >= 7) return 40;
  return 48;
};

const renderStampShape = (shape: StampShape, index: number, isStamped: boolean, stampSize: number, stampColor: string) => {
  const baseEmpty = {
    borderColor: "rgba(128, 128, 128, 0.3)",
    backgroundColor: "rgba(248, 248, 248, 0.8)",
  } as const;
  const filled = {
    borderColor: COLORS.white,
    borderWidth: 3,
    backgroundColor: stampColor,
    ...createShadowStyle({
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 2,
    }),
  } as const;

  const baseStyle = {
    width: stampSize,
    height: stampSize,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    margin: 2,
  };

  if (shape === "triangle") {
    return (
      <View style={{ width: stampSize, height: stampSize, alignItems: "center", justifyContent: "center", margin: 2 }}>
        {isStamped ? (
          <Ionicons name="triangle" size={stampSize} color={"white"} />
        ) : (
          <View style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Ionicons name="triangle-outline" size={stampSize} color={"rgba(255,255,255,0.7)"} />
            <Text style={[styles.stampNumber, { fontSize: stampSize * 0.3, position: "absolute", bottom: 8, color: "rgba(128,128,128,0.9)" }]}>{index + 1}</Text>
          </View>
        )}
      </View>
    );
  }

  if (shape === "star") {
    return (
      <View style={{ width: stampSize, height: stampSize, alignItems: "center", justifyContent: "center", margin: 2 }}>
        {isStamped ? (
          <Ionicons name="star" size={stampSize} color={"white"} />
        ) : (
          <View style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Ionicons name="star-outline" size={stampSize} color={"rgba(255,255,255,0.7)"} />
            <Text style={[styles.stampNumber, { fontSize: stampSize * 0.3, position: "absolute", bottom: stampSize === 48 ? 14 : 10, color: "rgba(128,128,128,0.9)" }]}>{index + 1}</Text>
          </View>
        )}
      </View>
    );
  }

  let viewStyle: any = baseStyle;
  let contentWrapStyle: any = undefined;
  let transforms: any[] = [];
  if (shape === "square") {
    viewStyle = { ...viewStyle, borderRadius: 4, borderCurve: "continuous" };
  } else if (shape === "egg") {
    viewStyle = { ...viewStyle, borderRadius: stampSize * 0.5, borderCurve: "continuous", height: stampSize * 1.3, width: stampSize * 0.8 };
  } else if (shape === "diamond") {
    viewStyle = { ...viewStyle, borderRadius: 4, borderCurve: "continuous", width: stampSize * 0.8, height: stampSize * 0.8 };
    transforms = [{ rotate: "45deg" }];
    contentWrapStyle = { transform: [{ rotate: "-45deg" }] };
  } else {
    // circle default
    viewStyle = { ...viewStyle, borderRadius: stampSize / 2, borderCurve: "continuous" };
  }

  return (
    <View style={[viewStyle, isStamped ? filled : baseEmpty, { transform: transforms }]}>
      <View style={contentWrapStyle}>
        {isStamped ? <Ionicons name="checkmark" size={stampSize * 0.5} color={COLORS.white} /> : <Text style={[styles.stampNumber, { fontSize: stampSize * 0.4 }]}>{index + 1}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: 20,
    borderCurve: "continuous",
    ...createShadowStyle({ shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 8.0, elevation: 12 }),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tiltContainer: { flex: 1 },
  gradient: {
    borderRadius: 20,
    borderCurve: "continuous",
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
    borderCurve: "continuous",
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
  backgroundLogo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", borderRadius: 19, opacity: 0.8 },
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
  headerNoBackground: { marginBottom: 0 },
  businessInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  businessName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    flex: 1,
    ...createTextShadowStyle({ textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4 }),
  },
  businessLogo: {
    width: 72,
    height: 72,
    marginRight: SPACING.sm,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "rgba(0, 0, 0, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 4,
  },
  progressContainer: { alignItems: "center" },
  progress: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.white,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 15,
    borderCurve: "continuous",
    textAlign: "center",
    minWidth: 50,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    ...createTextShadowStyle({ textShadowColor: "rgba(0, 0, 0, 0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }),
  },
  giftIcon: { marginTop: 4, elevation: 3 },
  gridContainer: { paddingHorizontal: SPACING.sm, marginBottom: SPACING.md, alignItems: "center" },
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
    ...createTextShadowStyle({ textShadowColor: "rgba(0, 0, 0, 0.4)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }),
  },
  gradientWithBackground: { backgroundColor: "rgba(0, 0, 0, 0.2)" },
  backgroundImage: { borderRadius: 20, overflow: "hidden" },
  stampsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", width: "100%" },
  stampNumber: { color: "rgba(128, 128, 128, 0.8)", fontWeight: "600", textAlign: "center" },
  nextPulse: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    opacity: 0.7,
  },
  pressWrap: { borderRadius: 12 },
  pressed: { opacity: 0.9 },
  cellWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
});

export default AddStampsInteractive;
