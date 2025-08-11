/**
 * Expo App Configuration
 * 
 * This file dynamically configures the app based on environment variables.
 * It replaces app.json when you need dynamic configuration.
 */

// Load environment variables from .env files
require('dotenv').config();

export default ({ config }) => {
  const isDev = process.env.NODE_ENV === 'development';
  const isProduction = process.env.APP_ENV === 'production';
  
  return {
    ...config,
    name: process.env.APP_NAME || 'LoyaltyCardApp',
    slug: 'LoyaltyCardApp',
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    plugins: [
      'expo-dev-client',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba'
        }
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
          defaultChannel: 'default'
        }
      ]
    ],
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'Esta aplicación necesita acceso a la cámara para tomar fotos del logo de tu negocio.',
        NSPhotoLibraryUsageDescription: 'Esta aplicación necesita acceso a tu galería de fotos para seleccionar el logo de tu negocio.',
        NSUserNotificationsUsageDescription: 'Esta aplicación necesita enviar notificaciones para informarte sobre sellos agregados a tus tarjetas de lealtad.',
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLName: 'google',
            CFBundleURLSchemes: ['com.googleusercontent.apps.853612097033-i8140tfvcdt6rd1537t7jb82uvp7luba']
          },
          {
            CFBundleURLName: 'loyaltycardapp',
            CFBundleURLSchemes: ['loyaltycardapp']
          }
        ]
      },
      bundleIdentifier: 'com.thwar077.LoyaltyCardApp',
      googleServicesFile: './GoogleService-Info.plist'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.WAKE_LOCK',
        'android.permission.POST_NOTIFICATIONS',
        'com.android.alarm.permission.SET_ALARM'
      ],
      package: 'com.thwar077.LoyaltyCardApp',
      googleServicesFile: './android/app/google-services.json',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'loyaltycardapp'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    scheme: 'loyaltycardapp',
    extra: {
      eas: {
        projectId: process.env.EXPO_PROJECT_ID || '20c6dc88-4b0c-4405-85e3-a0b7e343d220'
      },
      // Environment variables to be accessible in the app
      APP_ENV: process.env.APP_ENV || (isDev ? 'development' : 'production'),
      APP_NAME: process.env.APP_NAME || 'LoyaltyCardApp',
      APP_VERSION: process.env.APP_VERSION || '1.0.0',
      
      // Firebase Configuration
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      
      // API Configuration
      API_BASE_URL: process.env.API_BASE_URL,
      API_TIMEOUT: process.env.API_TIMEOUT,
      
      // Feature Flags
      ENABLE_DEBUG_LOGS: process.env.ENABLE_DEBUG_LOGS,
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
      ENABLE_CRASH_REPORTING: process.env.ENABLE_CRASH_REPORTING,
      
      // Expo Configuration
      EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID,
      
      // Social Auth
      GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
      FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    },
    runtimeVersion: process.env.APP_VERSION || '1.0.0',
    updates: {
      url: `https://u.expo.dev/${process.env.EXPO_PROJECT_ID || '20c6dc88-4b0c-4405-85e3-a0b7e343d220'}`
    }
  };
};
