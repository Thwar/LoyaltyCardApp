import React, { createContext, useContext, useState } from "react";
import { Alert } from "./Alert";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AlertOptions {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
  });

  const showAlert = (options: AlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      buttons: options.buttons || [{ text: "OK" }],
    });
  };

  const hideAlert = () => {
    setAlertState({
      visible: false,
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Alert visible={alertState.visible} title={alertState.title} message={alertState.message} buttons={alertState.buttons} onDismiss={hideAlert} />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

// Utility function to provide a similar API to React Native's Alert.alert
export const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  // This will be used as a fallback when not in a provider context
  if (typeof window !== "undefined") {
    // Web environment - use native browser alert as fallback
    const result = window.confirm(`${title}\n\n${message || ""}`);
    if (buttons && buttons.length > 1) {
      const button = result ? buttons.find((b) => b.style !== "cancel") : buttons.find((b) => b.style === "cancel");
      if (button && button.onPress) {
        button.onPress();
      }
    } else if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    // React Native environment - this shouldn't happen if properly configured
    console.warn("Alert called outside of AlertProvider context");
  }
};
