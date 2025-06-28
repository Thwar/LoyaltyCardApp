import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONT_SIZES, SPACING } from "../constants";

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  label: string;
  values: string[];
  options: MultiSelectOption[];
  onSelect: (values: string[]) => void;
  error?: string;
  placeholder?: string;
  maxSelections?: number;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, values, options, onSelect, error, placeholder = "Seleccionar...", maxSelections = 2 }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getDisplayText = () => {
    if (values.length === 0) return placeholder;
    const selectedLabels = options.filter((option) => values.includes(option.value)).map((option) => option.label);
    return selectedLabels.join(", ");
  };

  const handleSelect = (selectedValue: string) => {
    let newValues = [...values];

    if (newValues.includes(selectedValue)) {
      // Remove if already selected
      newValues = newValues.filter((v) => v !== selectedValue);
    } else {
      // Add if not selected and under limit
      if (newValues.length < maxSelections) {
        newValues.push(selectedValue);
      } else {
        // Replace the first one if at limit
        newValues = [newValues[1], selectedValue];
      }
    }

    onSelect(newValues);
  };

  const renderOption = ({ item }: { item: MultiSelectOption }) => {
    const isSelected = values.includes(item.value);
    const isDisabled = !isSelected && values.length >= maxSelections;

    return (
      <TouchableOpacity style={[styles.option, isSelected && styles.selectedOption, isDisabled && styles.disabledOption]} onPress={() => !isDisabled && handleSelect(item.value)} disabled={isDisabled}>
        <Text style={[styles.optionText, isSelected && styles.selectedOptionText, isDisabled && styles.disabledOptionText]}>{item.label}</Text>
        {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity style={[styles.dropdownButton, error ? styles.errorBorder : null]} onPress={() => setIsVisible(true)}>
        <Text style={[styles.dropdownText, values.length === 0 && styles.placeholderText]} numberOfLines={2}>
          {getDisplayText()}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Text style={styles.helperText}>
        Puedes seleccionar hasta {maxSelections} categorías ({values.length}/{maxSelections})
      </Text>

      <Modal visible={isVisible} transparent animationType="fade" onRequestClose={() => setIsVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList data={options} renderItem={renderOption} keyExtractor={(item) => item.value} style={styles.optionsList} showsVerticalScrollIndicator={false} />
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: SPACING.xs,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  dropdownText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  errorBorder: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: "90%",
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  selectedOption: {
    backgroundColor: COLORS.primary + "10",
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  disabledOptionText: {
    color: COLORS.textSecondary,
  },
});
