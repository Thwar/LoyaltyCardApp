/**
 * Expo App Configuration
 *
 * This file dynamically configures the app based on environment variables.
 * It replaces app.json when you need dynamic configuration.
 */

// Load environment variables from .env files
require("dotenv").config();
import fs from "fs";
import path from "path";

export default ({ config }) => {
  const isDev = process.env.NODE_ENV === "development";
  const isProduction = process.env.APP_ENV === "production";
  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "1119577610065940"; // fallback for dev only
  const androidGoogleServicesPath = "./google-services.json";
  const resolvedAndroidGSPath = path.resolve(process.cwd(), androidGoogleServicesPath);
  const hasAndroidGoogleServices = fs.existsSync(resolvedAndroidGSPath);
  if (!hasAndroidGoogleServices) {
    // Helpful message during prebuild when the file is missing
    console.warn(
      `expo-config: android google-services.json not found at ${resolvedAndroidGSPath}.\n` +
        "Prebuild will continue, but building/running Android with Firebase/Notifications will require this file.\n" +
        "Place your google-services.json at the project root or set ANDROID_GOOGLE_SERVICES_FILE and update config.",
    );
  }

  // Ensure we always include required schemes (caseroapp + Facebook) even if app.json defines its own
  const baseSchemes = Array.isArray(config.scheme) ? config.scheme : config.scheme ? [config.scheme] : [];
  const mergedSchemes = Array.from(new Set(["caseroapp", `fb${FACEBOOK_APP_ID}`, ...baseSchemes]));

  return {
    // Start from any values provided by a static app.json (config)
    ...config,
    // Prefer config values if present so external tools (like VS Code Launch) can edit app.json
    name: config.name || process.env.APP_NAME || "SoyCasero",
    slug: config.slug || "SoyCasero",
    version: config.version || process.env.APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon-background-red.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    plugins: [
      ...(config.plugins || []),
      "expo-dev-client",
      "expo-web-browser",
      "expo-asset",
      "expo-audio",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba",
        },
      ],
      [
        "react-native-fbsdk-next",
        {
          appID: FACEBOOK_APP_ID,
          displayName: config.name || process.env.APP_NAME || "SoyCasero",
          scheme: `fb${FACEBOOK_APP_ID}`,
          advertiserIDCollectionEnabled: false,
          autoLogAppEventsEnabled: false,
          isAutoInitEnabled: true,
          iosUserTrackingPermission: "This identifier will be used to deliver personalized ads to you.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/splash.png",
          color: "#E53935",
          defaultChannel: "default",
          sounds: ["./assets/sounds/success.mp3", "./assets/sounds/complete.mp3"],
          // iOS specific notification settings
          iosDisplayInForeground: true,
          mode: "production", // or "development"
        },
      ],
      "@sentry/react-native/expo",
    ],
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#E53935",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: (config.ios && config.ios.supportsTablet) ?? true,
      icon: {
        dark: "./assets/icon-background-red.png",
        light: "./assets/icon-background-red.png",
        tinted: "./assets/icon-background-red.png",
      },
      infoPlist: {
        NSCameraUsageDescription: "Esta aplicación necesita acceso a la cámara para tomar fotos del logo de tu negocio.",
        NSPhotoLibraryUsageDescription: "Esta aplicación necesita acceso a tu galería de fotos para seleccionar el logo de tu negocio.",
        NSUserNotificationsUsageDescription: "Esta aplicación necesita enviar notificaciones para informarte sobre sellos agregados a tus tarjetas de lealtad.",
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLName: "google",
            CFBundleURLSchemes: ["com.googleusercontent.apps.853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba"],
          },
          {
            CFBundleURLName: "facebook",
            CFBundleURLSchemes: [`fb${FACEBOOK_APP_ID}`],
          },
          {
            CFBundleURLName: "caseroapp",
            CFBundleURLSchemes: ["caseroapp"],
          },
        ],
      },
      bundleIdentifier: (config.ios && config.ios.bundleIdentifier) || "com.thwar077.CaseroApp",
      googleServicesFile: (config.ios && config.ios.googleServicesFile) || "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icon-background-red.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.WAKE_LOCK",
        "android.permission.POST_NOTIFICATIONS",
        "com.android.alarm.permission.SET_ALARM",
      ],
      package: (config.android && config.android.package) || "com.thwar077.CaseroApp",
      googleServicesFile: (config.android && config.android.googleServicesFile) || androidGoogleServicesPath,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "caseroapp",
            },
            {
              scheme: `fb${FACEBOOK_APP_ID}`,
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    scheme: mergedSchemes,
    extra: {
      ...(config.extra || {}),
      eas: {
        ...(config.extra && config.extra.eas ? config.extra.eas : {}),
        projectId: (config.extra && config.extra.eas && config.extra.eas.projectId) || process.env.EXPO_PROJECT_ID || "dc1566c6-aafc-47fa-afe6-ec49158b37f7",
      },
      // Environment variables to be accessible in the app
      APP_ENV: (config.extra && config.extra.APP_ENV) || process.env.APP_ENV || (isDev ? "development" : "production"),
      APP_NAME: (config.extra && config.extra.APP_NAME) || config.name || process.env.APP_NAME || "SoyCasero",
      APP_VERSION: (config.extra && config.extra.APP_VERSION) || process.env.APP_VERSION || "1.0.0",

      // Firebase Configuration
      FIREBASE_API_KEY: (config.extra && config.extra.FIREBASE_API_KEY) || process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: (config.extra && config.extra.FIREBASE_AUTH_DOMAIN) || process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: (config.extra && config.extra.FIREBASE_PROJECT_ID) || process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: (config.extra && config.extra.FIREBASE_STORAGE_BUCKET) || process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: (config.extra && config.extra.FIREBASE_MESSAGING_SENDER_ID) || process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: (config.extra && config.extra.FIREBASE_APP_ID) || process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: (config.extra && config.extra.FIREBASE_MEASUREMENT_ID) || process.env.FIREBASE_MEASUREMENT_ID,

      // API Configuration
      API_BASE_URL: (config.extra && config.extra.API_BASE_URL) || process.env.API_BASE_URL || "https://www.soycasero.com/api",
      API_TIMEOUT: (config.extra && config.extra.API_TIMEOUT) || process.env.API_TIMEOUT,

      // Feature Flags
      ENABLE_DEBUG_LOGS: (config.extra && config.extra.ENABLE_DEBUG_LOGS) || process.env.ENABLE_DEBUG_LOGS,
      ENABLE_ANALYTICS: (config.extra && config.extra.ENABLE_ANALYTICS) || process.env.ENABLE_ANALYTICS,
      ENABLE_CRASH_REPORTING: (config.extra && config.extra.ENABLE_CRASH_REPORTING) || process.env.ENABLE_CRASH_REPORTING,

      // Expo Configuration
      EXPO_PROJECT_ID: (config.extra && config.extra.EXPO_PROJECT_ID) || process.env.EXPO_PROJECT_ID,

      // Social Auth
      GOOGLE_WEB_CLIENT_ID: (config.extra && config.extra.GOOGLE_WEB_CLIENT_ID) || process.env.GOOGLE_WEB_CLIENT_ID,
      // Ensure the runtime always has a Facebook App ID. Fall back to the same
      // value used for native configuration so Android doesn't generate
      // fb://authorize (empty id) which causes a Play Store 404.
      FACEBOOK_APP_ID: (config.extra && config.extra.FACEBOOK_APP_ID) || FACEBOOK_APP_ID,
    },
    runtimeVersion: config.runtimeVersion || process.env.APP_VERSION || "1.0.0",
    updates: {
      ...(config.updates || {}),
      url: (config.updates && config.updates.url) || `https://u.expo.dev/${process.env.EXPO_PROJECT_ID || "dfe2bd78-90b2-4031-bec7-4cd519f6334a"}`,
    },
  };
};
