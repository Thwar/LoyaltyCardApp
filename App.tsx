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
import * as Sentry from "@sentry/react-native";
import { env } from "./config/env";

// Import Firebase services to ensure they're initialized early
import "./src/services/firebase";

// Initialize Sentry before the App component
Sentry.init({
  dsn: env.SENTRY_DSN,
  debug: env.ENABLE_DEBUG_LOGS,
  tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
  // Set to false in production to save quota, or lower rate
  enabled: env.ENABLE_CRASH_REPORTING,
});

function App() {
  const fontsLoaded = useCustomFonts();

  useEffect(() => {
    // Initialize notification and sound services with delay to ensure Firebase is ready
    const initializeServices = async () => {
      try {
        // Small delay to ensure Firebase initialization completes
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check if we're in a development client (not Expo Go)
        const isExpoGo = Constants.appOwnership === "expo";

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
        Sentry.captureException(error);
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

// Wrap with Sentry
export default Sentry.wrap(App);
