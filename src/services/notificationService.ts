import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { env } from "../../config/env";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface StampNotificationData {
  customerName?: string;
  businessName: string;
  currentStamps: number;
  totalSlots: number;
  isCompleted: boolean;
}

export class NotificationService {
  private static readonly API_BASE_URL = env.API_BASE_URL;

  // Check if API is configured
  private static isApiConfigured(): boolean {
    return this.API_BASE_URL !== "";
  }

  // Register for push notifications (only works on mobile devices)
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // Import and check Firebase initialization
      const { getApps } = await import("firebase/app");

      if (getApps().length === 0) {
        await import("../services/firebase");
      }

      // Web browsers cannot register for Expo push tokens
      if (Platform.OS === "web") {
        return null;
      }

      let token: string | null = null;

      if (Platform.OS === "android") {
        // Create notification channel for Android with custom sound
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "success.mp3", // Use custom success sound
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });

        // Create a high priority channel for stamp notifications with custom sound
        await Notifications.setNotificationChannelAsync("stamps", {
          name: "Stamp Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "success.mp3", // Use custom success sound for stamps
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });

        // Create a completion channel for when cards are completed
        await Notifications.setNotificationChannelAsync("completion", {
          name: "Card Completion Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "complete.mp3", // Use custom complete sound for completion
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          return null;
        }

        // Get the token that uniquely identifies this device
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data;

        // Save the token to the user's profile for later use
        try {
          const { UserService } = await import("./api");
          await UserService.updatePushToken(token);
        } catch (error) {
          console.warn("Failed to save push token to user profile:", error);
        }
      } else {
        console.log("Must use physical device for Push Notifications");
      }

      return token;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  // Send push notifications via server (works from web and mobile)
  static async sendPushNotification(pushTokens: string[], title: string, body: string, data?: any): Promise<boolean> {
    try {
      // Check if API is configured
      if (!this.isApiConfigured()) {
        console.warn("API_BASE_URL not configured. Skipping server push notifications.");
        return false;
      }

      const apiUrl = `${this.API_BASE_URL}/send-push-notification`;

      // This works from any platform - web, iOS, Android
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pushTokens,
          title,
          body,
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        return true;
      } else {
        console.error("Failed to send push notifications:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error sending push notifications:", error);

      // Fallback: if we're on mobile and server call fails, try local notification
      if (Platform.OS !== "web" && Device.isDevice) {
        try {
          await this.scheduleLocalNotification(title, body, data);
          return true;
        } catch (localError) {
          console.error("Local notification fallback also failed:", localError);
        }
      }

      return false;
    }
  }

  // Send stamp notification via push (for cross-platform notifications)
  static async sendStampNotificationViaPush(pushTokens: string[], data: StampNotificationData): Promise<boolean> {
    const { businessName, currentStamps, totalSlots, isCompleted } = data;

    let title: string;
    let body: string;

    if (isCompleted) {
      title = "🎉 ¡Tarjeta Completada!";
      body = `¡Felicidades! Has completado tu tarjeta de ${businessName}. ¡Puedes canjear tu recompensa!`;
    } else {
      const stampsNeeded = totalSlots - currentStamps;
      title = "✅ ¡Sello Agregado!";
      body = `Sello agregado en ${businessName}. Te ${stampsNeeded === 1 ? "falta" : "faltan"} ${stampsNeeded} sello${stampsNeeded === 1 ? "" : "s"} para tu recompensa.`;
    }

    return await this.sendPushNotification(pushTokens, title, body, data);
  }

  // Send push notification from mobile app (works on all platforms)
  static async sendPushNotificationFromMobile(pushTokens: string[], title: string, body: string, data?: any): Promise<boolean> {
    // Mobile apps can send push notifications via the same server API
    // This works from iOS, Android, and Web
    return await this.sendPushNotification(pushTokens, title, body, data);
  }

  // Helper method to send notification to a specific customer by ID
  static async sendNotificationToCustomer(customerId: string, title: string, body: string, data?: any): Promise<boolean> {
    try {
      // Import UserService dynamically to avoid circular imports
      const { UserService } = await import("./api");

      // Get customer's push token
      const customerUser = await UserService.getUser(customerId);
      if (!customerUser?.pushToken) {
        return false;
      }

      // Send push notification
      return await this.sendPushNotification([customerUser.pushToken], title, body, data);
    } catch (error) {
      console.error("Error sending notification to customer:", error);
      return false;
    }
  }

  // Generic local notification method (fallback for when server push fails)
  static async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      // Check if we're on web platform - notifications are not supported
      if (Platform.OS === "web") {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: "success.mp3",
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          autoDismiss: false,
          // iOS specific properties
          badge: 1,
          categoryIdentifier: "general",
        },
        trigger: null, // Show immediately
        identifier: `notification_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error scheduling local notification:", error);
      throw error;
    }
  }

  // Send a local notification for stamp added (mobile only)
  static async sendStampAddedNotification(data: StampNotificationData): Promise<void> {
    try {
      // Check if we're on web platform - local notifications are not supported
      if (Platform.OS === "web") {
        return;
      }

      const { customerName, businessName, currentStamps, totalSlots, isCompleted } = data;

      let title: string;
      let body: string;

      if (isCompleted) {
        title = "🎉 ¡Tarjeta Completada!";
        body = `¡Felicidades! Has completado tu tarjeta de ${businessName}. ¡Puedes canjear tu recompensa!`;
      } else {
        const stampsNeeded = totalSlots - currentStamps;
        title = "✅ ¡Sello Agregado!";
        body = `Sello agregado en ${businessName}. Te ${stampsNeeded === 1 ? "falta" : "faltan"} ${stampsNeeded} sello${stampsNeeded === 1 ? "" : "s"} para tu recompensa.`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            businessName,
            currentStamps,
            totalSlots,
            isCompleted,
            customerName,
          },
          sound: isCompleted ? "complete.mp3" : "success.mp3", // Use appropriate sound
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          categoryIdentifier: "stamp_notification",
          autoDismiss: false,
        },
        trigger: null, // Show immediately
        identifier: `stamp_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error sending stamp notification:", error);
    }
  }

  // Send a notification when reward is redeemed
  static async sendRewardRedeemedNotification(businessName: string): Promise<void> {
    try {
      // Check if we're on web platform - notifications are not supported
      if (Platform.OS === "web") {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎁 ¡Recompensa Canjeada!",
          body: `¡Has canjeado exitosamente tu recompensa en ${businessName}! ¡Gracias por tu lealtad!`,
          data: {
            businessName,
            type: "reward_redeemed",
          },
          sound: "complete.mp3", // Use complete sound for reward redemption
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error sending reward redeemed notification:", error);
    }
  }

  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      // Check if we're on web platform - notifications are not supported
      if (Platform.OS === "web") {
        return;
      }

      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }

  // Get notification permissions status
  static async getPermissionStatus(): Promise<string> {
    try {
      // Check if we're on web platform - return a default status
      if (Platform.OS === "web") {
        return "undetermined";
      }

      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error("Error getting notification permissions:", error);
      return "undetermined";
    }
  }
}
