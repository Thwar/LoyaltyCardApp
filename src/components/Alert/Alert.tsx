import React from "react";
import { Modal, View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { COLORS, FONT_SIZES, SPACING } from "../../constants";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ visible, title, message, buttons = [{ text: "OK" }], onDismiss }) => {
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case "cancel":
        return [styles.button, styles.cancelButton];
      case "destructive":
        return [styles.button, styles.destructiveButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case "cancel":
        return [styles.buttonText, styles.cancelButtonText];
      case "destructive":
        return [styles.buttonText, styles.destructiveButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <Pressable key={index} style={({ pressed }) => [...getButtonStyle(button.style), pressed && styles.buttonPressed]} onPress={() => handleButtonPress(button)}>
                <Text style={getButtonTextStyle(button.style)}>{button.text}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  alertContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    minWidth: Platform.OS === "web" ? 300 : undefined,
    maxWidth: Platform.OS === "web" ? 500 : undefined,
    width: Platform.OS === "web" ? "auto" : "100%",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
      },
    }),
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.black,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  defaultButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  destructiveButton: {
    backgroundColor: COLORS.error,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  defaultButtonText: {
    color: COLORS.white,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
  },
  destructiveButtonText: {
    color: COLORS.white,
  },
});
