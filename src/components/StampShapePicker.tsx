import React, { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

const { width: screenWidth } = Dimensions.get("window");
const ITEM_WIDTH = screenWidth * 0.52;
const ITEM_HEIGHT = 140;

interface StampShapePickerProps {
  label: string;
  selectedShape: "circle" | "square" | "egg" | "triangle" | "diamond" | "star";
  onShapeSelect: (shape: "circle" | "square" | "egg" | "triangle" | "diamond" | "star") => void;
  error?: string;
}

const STAMP_SHAPES = [
  {
    value: "circle" as const,
    name: "Círculo",
    icon: "◯",
    description: "Clásico y elegante",
  },
  {
    value: "square" as const,
    name: "Cuadrado",
    icon: "■",
    description: "Moderno y limpio",
  },
  {
    value: "egg" as const,
    name: "Óvalo",
    icon: "●",
    description: "Suave y único",
  },
  {
    value: "triangle" as const,
    name: "Triángulo",
    icon: "▲",
    description: "Dinámico y llamativo",
  },
  {
    value: "diamond" as const,
    name: "Diamante",
    icon: "♦",
    description: "Elegante y premium",
  },
  {
    value: "star" as const,
    name: "Estrella",
    icon: "★",
    description: "Especial y festivo",
  },
];

export const StampShapePicker: React.FC<StampShapePickerProps> = ({ label, selectedShape, onShapeSelect, error }) => {
  const carouselRef = useRef<any>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  // Find the index of the selected shape
  const selectedIndex = STAMP_SHAPES.findIndex((shape) => shape.value === selectedShape);

  // Cleanup function for timeouts
  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
  };

  // Auto-scroll to selected shape when component mounts or selectedShape changes (only if user isn't manually scrolling)
  useEffect(() => {
    if (carouselRef.current && selectedIndex !== -1 && !isUserScrolling) {
      const timeout = setTimeout(() => {
        carouselRef.current?.scrollTo({ index: selectedIndex, animated: true });
      }, 100); // Small delay to ensure carousel is ready
      timeoutRefs.current.push(timeout);
    }
  }, [selectedShape, selectedIndex, isUserScrolling]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return clearAllTimeouts;
  }, []);

  // Handle when user manually scrolls the carousel
  const handleSnapToItem = (index: number) => {
    const shape = STAMP_SHAPES[index];
    if (shape && shape.value !== selectedShape) {
      onShapeSelect(shape.value);
    }
    // Reset the scrolling flag after a short delay
    const timeout = setTimeout(() => setIsUserScrolling(false), 300);
    timeoutRefs.current.push(timeout);
  };

  // Handle shape selection by touch
  const handleShapeSelect = (shapeValue: typeof selectedShape) => {
    const shapeIndex = STAMP_SHAPES.findIndex((shape) => shape.value === shapeValue);

    // Set scrolling flag to prevent useEffect interference
    setIsUserScrolling(true);

    // Update selection immediately
    onShapeSelect(shapeValue);

    // Scroll to the selected shape
    if (carouselRef.current && shapeIndex !== -1) {
      const timeout1 = setTimeout(() => {
        carouselRef.current?.scrollTo({ index: shapeIndex, animated: true });
        // Reset scrolling flag after animation
        const timeout2 = setTimeout(() => setIsUserScrolling(false), 400);
        timeoutRefs.current.push(timeout2);
      }, 50);
      timeoutRefs.current.push(timeout1);
    }
  };
  const renderShapeItem = ({ item }: { item: (typeof STAMP_SHAPES)[0] }) => (
    <View style={styles.shapeItemWrapper}>
      <TouchableOpacity style={[styles.shapeItem, selectedShape === item.value && styles.selectedShape]} onPress={() => handleShapeSelect(item.value)} activeOpacity={0.7}>
        <View style={styles.shapeIconContainer}>
          <Text style={[styles.shapeIcon, selectedShape === item.value && styles.selectedShapeIcon, item.value === "egg" && styles.eggIcon]}>{item.icon}</Text>
        </View>
        <Text style={[styles.shapeName, selectedShape === item.value && styles.selectedShapeName]}>{item.name}</Text>
        <Text style={[styles.shapeDescription, selectedShape === item.value && styles.selectedShapeDescription]}>{item.description}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.carouselContainer}>
        <Carousel
          ref={carouselRef}
          width={ITEM_WIDTH}
          height={ITEM_HEIGHT}
          data={STAMP_SHAPES}
          renderItem={renderShapeItem}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.85,
            parallaxScrollingOffset: 60,
          }}
          pagingEnabled
          autoPlay={false}
          scrollAnimationDuration={300}
          style={styles.carousel}
          onSnapToItem={handleSnapToItem}
          defaultIndex={selectedIndex}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  carouselContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  carousel: {
    width: screenWidth,
  },
  shapeItemWrapper: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  shapeItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    marginHorizontal: SPACING.xs,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: ITEM_WIDTH - SPACING.md * 2,
    height: ITEM_HEIGHT,
    justifyContent: "space-between",
  },
  selectedShape: {
    backgroundColor: COLORS.primaryLight + "15",
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
  },
  shapeIconContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  shapeIcon: {
    fontSize: 48,
    color: COLORS.gray,
  },
  selectedShapeIcon: {
    color: COLORS.primary,
  },
  eggIcon: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.9 }],
  },
  shapeName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  selectedShapeName: {
    color: COLORS.primary,
  },
  shapeDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  selectedShapeDescription: {
    color: COLORS.primary,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
});
