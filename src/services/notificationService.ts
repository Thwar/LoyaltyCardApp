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
  // Register for push notifications
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
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
      } else {
        console.log("Must use physical device for Push Notifications");
      }

      return token;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    }
  }

  // Send a local notification for stamp added
  static async sendStampAddedNotification(data: StampNotificationData): Promise<void> {
    try {
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
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }

  // Get notification permissions status
  static async getPermissionStatus(): Promise<string> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error("Error getting notification permissions:", error);
      return "undetermined";
    }
  }
}
