import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  // Remote push notifications require a physical device.
  if (!Device.isDevice) {
    console.log("Test push notifications on a physical device.");
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();

    status = requested.status;
  }

  if (status !== "granted") {
    console.log("Notification permission was not granted.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Orders and deliveries",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    throw new Error("EAS project ID is not configured.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  // Create this authenticated endpoint on your backend.
  await apiRequest("/notifications/push-token", {
    method: "POST",
    body: JSON.stringify({
      token,
      platform: Platform.OS,
    }),
  });

  return token;
}
