import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { AlertProvider } from "./src/components";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { COLORS } from "./src/constants";
import { useCustomFonts } from "./src/utils/fontLoader";
import { LoadingState } from "./src/components";
import { NotificationService } from "./src/services/notificationService";
import { SoundService } from "./src/services/soundService";

// Import Firebase services to ensure they're initialized early
import "./src/services/firebase";

export default function App() {
  const fontsLoaded = useCustomFonts();

  useEffect(() => {
    // Initialize notification and sound services
    const initializeServices = async () => {
      try {
        // Initialize push notifications
        await NotificationService.registerForPushNotificationsAsync();

        // Initialize and preload sounds
        await SoundService.preloadSounds();

        console.log("Notification and sound services initialized successfully");
      } catch (error) {
        console.error("Error initializing services:", error);
      }
    };

    if (fontsLoaded) {
      initializeServices();
    }
  }, [fontsLoaded]);

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
