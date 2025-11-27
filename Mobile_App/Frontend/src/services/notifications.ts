import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure how notifications are handled when received while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Newer Expo SDKs require additional fields
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // iOS specific presentation options
    shouldShowBanner: true,
    shouldShowList: false,
  }),
});

/**
 * Retrieve Expo push token for this device. Returns null if not available or permissions denied.
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications are not supported on emulators.');
      return null;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data || null;
    if (token) {
      console.log('Expo push token:', token);
    }
    return token;
  } catch (err) {
    console.warn('Failed to get Expo push token:', err);
    return null;
  }
};
