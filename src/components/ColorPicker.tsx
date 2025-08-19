import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

interface ColorPickerProps {
  label: string;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  error?: string;
}

// Predefined color templates for loyalty cards
const COLOR_TEMPLATES = [
  { name: "Rojo Clásico", value: "#E53935" },
  { name: "Azul Océano", value: "#2980B9" },
  { name: "Verde Esmeralda", value: "#27AE60" },
  { name: "Naranja Vibrante", value: "#E67E22" },
  { name: "Púrpura Real", value: "#8E44AD" },
  { name: "Rosa Suave", value: "#D81B60" },
  { name: "Teal Moderno", value: "#1ABC9C" },
  { name: "Índigo Profundo", value: "#3F51B5" },
  { name: "Ámbar Cálido", value: "#FB8C00" },
  { name: "Verde Lima", value: "#8BC34A" },
  { name: "Cian Brillante", value: "#26C6DA" },
  { name: "Marrón Tierra", value: "#795548" },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, selectedColor, onColorSelect, error }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Grid view for better organization */}
      <View style={styles.gridContainer}>
        {COLOR_TEMPLATES.reduce((rows: any[], color, index) => {
          if (index % 4 === 0) rows.push([]);
          rows[rows.length - 1].push(color);
          return rows;
        }, []).map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((color: any) => {
              // Avoid using `.value` inside inline style objects to prevent Reanimated warnings.
              const bg = color.value;
              const isSelected = selectedColor === bg;
              return (
                <TouchableOpacity key={bg} style={styles.gridColorItem} onPress={() => onColorSelect(bg)} activeOpacity={0.7}>
                  <View style={[styles.colorCircle, { backgroundColor: bg }, isSelected && styles.selectedColorCircle]}>{isSelected && <Text style={styles.gridCheckmark}>✓</Text>}</View>
                  <Text style={styles.colorName}>{color.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  gridContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  gridColorItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  gridCheckmark: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "bold",
    color: COLORS.white,
  },
  colorName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: SPACING.xs,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});
