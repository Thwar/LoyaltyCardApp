import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
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
  // Register for push notifications (only works on mobile devices)
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      // Web browsers cannot register for Expo push tokens
      if (Platform.OS === "web") {
        console.log("Push token registration not supported on web platform");
        return null;
      }

      let token: string | null = null;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
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
          console.log("Failed to get push token for push notification!");
          return null;
        }

        // Get the token that uniquely identifies this device
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data;
        console.log("Push notification token:", token);

        // Save the token to the user's profile for later use
        try {
          const { UserService } = await import("./api");
          await UserService.updatePushToken(token);
          console.log("Push token saved to user profile");
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
      // This works from any platform - web, iOS, Android
      const response = await fetch("/api/send-push-notification", {
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

      const result = await response.json();

      if (result.success) {
        console.log("Push notifications sent successfully");
        return true;
      } else {
        console.error("Failed to send push notifications:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error sending push notifications:", error);
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
        console.log("Customer has no push token, cannot send notification");
        return false;
      }

      // Send push notification
      return await this.sendPushNotification([customerUser.pushToken], title, body, data);
    } catch (error) {
      console.error("Error sending notification to customer:", error);
      return false;
    }
  }

  // Send a local notification for stamp added (mobile only)
  static async sendStampAddedNotification(data: StampNotificationData): Promise<void> {
    try {
      // Check if we're on web platform - local notifications are not supported
      if (Platform.OS === "web") {
        console.log("Local notifications not supported on web platform");
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
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
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
        console.log("Notifications not supported on web platform");
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
          sound: true,
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
        console.log("Clear notifications not supported on web platform");
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
        console.log("Notification permissions not supported on web platform");
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
