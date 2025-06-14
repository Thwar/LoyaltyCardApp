import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

interface StampShapePickerProps {
  label: string;
  selectedShape: "circle" | "square" | "egg";
  onShapeSelect: (shape: "circle" | "square" | "egg") => void;
  error?: string;
}

const STAMP_SHAPES = [
  {
    value: "circle" as const,
    name: "Círculo",
    icon: "●",
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
];

export const StampShapePicker: React.FC<StampShapePickerProps> = ({ label, selectedShape, onShapeSelect, error }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.shapesContainer}>
        {STAMP_SHAPES.map((shape) => (
          <TouchableOpacity key={shape.value} style={[styles.shapeItem, selectedShape === shape.value && styles.selectedShape]} onPress={() => onShapeSelect(shape.value)} activeOpacity={0.7}>
            <View style={styles.shapeIconContainer}>
              <Text style={[styles.shapeIcon, selectedShape === shape.value && styles.selectedShapeIcon]}>{shape.icon}</Text>
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
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  shapeItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.inputBorder,
  },
  selectedShape: {
    backgroundColor: COLORS.primaryLight + "15",
    borderColor: COLORS.primary,
  },
  shapeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shapeIcon: {
    fontSize: 30,
    color: COLORS.gray,
  },
  selectedShapeIcon: {
    color: COLORS.primary,
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
