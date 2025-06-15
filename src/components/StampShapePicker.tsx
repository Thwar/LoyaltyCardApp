import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

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
    icon: "◯",
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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.shapesContainer}>
        {STAMP_SHAPES.map((shape) => (
          <TouchableOpacity key={shape.value} style={[styles.shapeItem, selectedShape === shape.value && styles.selectedShape]} onPress={() => onShapeSelect(shape.value)} activeOpacity={0.7}>
            <View style={styles.shapeIconContainer}>
              <Text style={[styles.shapeIcon, selectedShape === shape.value && styles.selectedShapeIcon, shape.value === "egg" && styles.eggIcon]}>{shape.icon}</Text>
            </View>
            <Text style={[styles.shapeName, selectedShape === shape.value && styles.selectedShapeName]}>{shape.name}</Text>
            <Text style={[styles.shapeDescription, selectedShape === shape.value && styles.selectedShapeDescription]}>{shape.description}</Text>
          </TouchableOpacity>
        ))}
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
  shapesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  shapeItem: {
    width: "30%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
    marginBottom: SPACING.sm,
  },
  selectedShape: {
    backgroundColor: COLORS.primaryLight + "15",
    borderColor: COLORS.primary,
  },
  shapeIconContainer: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  shapeIcon: {
    fontSize: 36,
    color: COLORS.gray,
  },
  selectedShapeIcon: {
    color: COLORS.primary,
  },
  eggIcon: {
    transform: [{ scaleX: 0.8 }, { scaleY: 1.2 }],
  },
  shapeName: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  selectedShapeName: {
    color: COLORS.primary,
  },
  shapeDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  selectedShapeDescription: {
    color: COLORS.primary,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});
