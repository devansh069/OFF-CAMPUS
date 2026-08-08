import { useEffect, useState } from 'react';
// @ts-ignore
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export function usePushNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<number | null>(null);

  useEffect(() => {
    // Only run on native platforms
    if (Platform.OS === 'web') return;

    let isMounted = true;

    const setupNotifications = async () => {
      try {
        // Request permissions (required for iOS, recommended for Android 13+)
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        if (isMounted) {
          setPermissionStatus(authStatus);
        }

        if (enabled) {
          console.log('[FCM] Authorization status:', authStatus);
          // Get the FCM device token
          const token = await messaging().getToken();
          if (token && isMounted) {
            console.log('[FCM] Device Token acquired:', token);
            setFcmToken(token);
          }
        } else {
          console.log('[FCM] Push notification permissions denied');
        }
      } catch (error) {
        console.warn('[FCM] Setup error:', error);
      }
    };

    setupNotifications();

    // Listen to token refresh events
    const unsubscribeTokenRefresh = messaging().onTokenRefresh((token) => {
      console.log('[FCM] Token refreshed:', token);
      if (isMounted) setFcmToken(token);
    });

    return () => {
      isMounted = false;
      unsubscribeTokenRefresh();
    };
  }, []);

  return { fcmToken, permissionStatus };
}
