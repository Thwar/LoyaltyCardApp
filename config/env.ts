/**
 * Environment Configuration
 *
 * This file manages environment variables for different deployment environments.
 * For sensitive data, use Expo's EAS environment variables or local .env files.
 *
 * DO NOT commit sensitive values directly to this file.
 */

import Constants from "expo-constants";

export interface EnvConfig {
  // App Configuration
  APP_ENV: "development" | "staging" | "production";
  APP_NAME: string;
  APP_VERSION: string;

  // Firebase Configuration
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID?: string;

  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;

  // Features
  ENABLE_DEBUG_LOGS: boolean;
  ENABLE_ANALYTICS: boolean;
  ENABLE_CRASH_REPORTING: boolean;

  // Push Notifications
  EXPO_PROJECT_ID: string;

  // Social Auth (if using)
  GOOGLE_WEB_CLIENT_ID?: string;
  FACEBOOK_APP_ID?: string;
  FACEBOOK_CLIENT_TOKEN?: string;
}

// Get environment from Expo Constants or fallback to development
const getEnvironment = (): EnvConfig["APP_ENV"] => {
  if (Constants.expoConfig?.extra?.APP_ENV) {
    return Constants.expoConfig.extra.APP_ENV;
  }

  if (__DEV__) {
    return "development";
  }

  return "production";
};

// Get value from Expo Constants extra or environment variables
const getEnvValue = (key: string, fallback?: string): string => {
  // First try Expo Constants (from EAS environment variables)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key] as string;
  }

  // Then try process.env (for local development)
  if (process.env[key]) {
    return process.env[key];
  }

  // Use fallback if provided
  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Environment variable ${key} is not defined`);
};

// Get boolean value
const getBooleanEnvValue = (key: string, fallback: boolean = false): boolean => {
  try {
    const value = getEnvValue(key, fallback.toString());
    return value.toLowerCase() === "true";
  } catch {
    return fallback;
  }
};

// Get number value
const getNumberEnvValue = (key: string, fallback: number): number => {
  try {
    const value = getEnvValue(key, fallback.toString());
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  } catch {
    return fallback;
  }
};

// Current environment
const APP_ENV = getEnvironment();

// Environment-specific configurations
const developmentConfig: Partial<EnvConfig> = {
  API_BASE_URL: "https://www.caseroapp.com/api",
  ENABLE_DEBUG_LOGS: true,
  ENABLE_ANALYTICS: false,
  ENABLE_CRASH_REPORTING: false,
};

const stagingConfig: Partial<EnvConfig> = {
  API_BASE_URL: "https://www.caseroapp.com/api",
  ENABLE_DEBUG_LOGS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
};

const productionConfig: Partial<EnvConfig> = {
  API_BASE_URL: "https://www.caseroapp.com/api",
  ENABLE_DEBUG_LOGS: false,
  ENABLE_ANALYTICS: true,
  ENABLE_CRASH_REPORTING: true,
};

// Get environment-specific config
const getEnvironmentConfig = (): Partial<EnvConfig> => {
  switch (APP_ENV) {
    case "development":
      return developmentConfig;
    case "staging":
      return stagingConfig;
    case "production":
      return productionConfig;
    default:
      return developmentConfig;
  }
};

// Build final configuration
const buildConfig = (): EnvConfig => {
  const envConfig = getEnvironmentConfig();

  return {
    // App Configuration
    APP_ENV,
    APP_NAME: getEnvValue("APP_NAME", "LoyaltyCardApp"),
    APP_VERSION: getEnvValue("APP_VERSION", Constants.expoConfig?.version || "1.0.0"),

    // Firebase Configuration
    FIREBASE_API_KEY: getEnvValue("FIREBASE_API_KEY"),
    FIREBASE_AUTH_DOMAIN: getEnvValue("FIREBASE_AUTH_DOMAIN"),
    FIREBASE_PROJECT_ID: getEnvValue("FIREBASE_PROJECT_ID"),
    FIREBASE_STORAGE_BUCKET: getEnvValue("FIREBASE_STORAGE_BUCKET"),
    FIREBASE_MESSAGING_SENDER_ID: getEnvValue("FIREBASE_MESSAGING_SENDER_ID"),
    FIREBASE_APP_ID: getEnvValue("FIREBASE_APP_ID"),
    FIREBASE_MEASUREMENT_ID: getEnvValue("FIREBASE_MEASUREMENT_ID", ""),

    // API Configuration
    API_BASE_URL: envConfig.API_BASE_URL || (Constants.expoConfig?.extra?.API_BASE_URL as string) || getEnvValue("API_BASE_URL", ""),
    API_TIMEOUT: getNumberEnvValue("API_TIMEOUT", 10000),

    // Features
    ENABLE_DEBUG_LOGS: envConfig.ENABLE_DEBUG_LOGS ?? getBooleanEnvValue("ENABLE_DEBUG_LOGS", __DEV__),
    ENABLE_ANALYTICS: envConfig.ENABLE_ANALYTICS ?? getBooleanEnvValue("ENABLE_ANALYTICS", !__DEV__),
    ENABLE_CRASH_REPORTING: envConfig.ENABLE_CRASH_REPORTING ?? getBooleanEnvValue("ENABLE_CRASH_REPORTING", !__DEV__),

    // Push Notifications
    EXPO_PROJECT_ID: getEnvValue("EXPO_PROJECT_ID"),

    // Social Auth
    GOOGLE_WEB_CLIENT_ID: getEnvValue("GOOGLE_WEB_CLIENT_ID", ""),
    FACEBOOK_APP_ID: getEnvValue("FACEBOOK_APP_ID", ""),
    FACEBOOK_CLIENT_TOKEN: getEnvValue("FACEBOOK_CLIENT_TOKEN", ""),
  };
};

// Export the configuration
export const env: EnvConfig = buildConfig();

// Helper functions for common checks
export const isDevelopment = () => env.APP_ENV === "development";
export const isStaging = () => env.APP_ENV === "staging";
export const isProduction = () => env.APP_ENV === "production";

// Debug logging helper
export const debugLog = (...args: any[]) => {
  if (env.ENABLE_DEBUG_LOGS) {
    console.log("[DEBUG]", ...args);
  }
};

// Export for easier importing
export default env;
