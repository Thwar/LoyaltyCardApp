import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { AlertProvider } from "./src/components";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { COLORS } from "./src/constants";
import { useCustomFonts } from "./src/utils/fontLoader";
import { LoadingState } from "./src/components";

// Import Firebase services to ensure they're initialized early
import "./src/services/firebase";

export default function App() {
  const fontsLoaded = useCustomFonts();

  if (!fontsLoaded) {
    return <LoadingState loading={true} />;
  }

  return (
    <SafeAreaProvider>
      <AlertProvider>
        <AuthProvider>
          <StatusBar style="light" backgroundColor={COLORS.primary} />
          <AppNavigator />
        </AuthProvider>
      </AlertProvider>
    </SafeAreaProvider>
  );
}
