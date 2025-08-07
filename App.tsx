import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";
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
        // Check if we're in a development client (not Expo Go)
        const isExpoGo = Constants.appOwnership === 'expo';
        
        if (!isExpoGo) {
          // Initialize push notifications only in development builds
          await NotificationService.registerForPushNotificationsAsync();
          console.log("Push notifications initialized successfully");
        } else {
          console.log("Running in Expo Go - skipping push notification registration");
        }

        // Initialize and preload sounds
        await SoundService.preloadSounds();

        console.log("Services initialized successfully");
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
