import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Lazy import @react-native-firebase/messaging safely
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('[PushNotification] @react-native-firebase/messaging not loaded:', (e as Error).message);
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000';

/**
 * Register FCM push token with backend API
 */
export const registerPushTokenWithBackend = async (fcmToken: string) => {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');
    if (!sessionToken || !fcmToken) return;

    console.log('[NotificationService] Registering FCM Token with backend...', fcmToken.substring(0, 20) + '...');
    const response = await fetch(`${BACKEND_URL}/api/auth/register-push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ token: fcmToken })
    });

    if (response.ok) {
      console.log('[NotificationService] Push token registered with backend successfully.');
    } else {
      console.warn('[NotificationService] Failed to register push token with backend:', response.status);
    }
  } catch (error) {
    console.error('[NotificationService Error] Failed to register token:', error);
  }
};

/**
 * Handle notification deep linking navigation
 */
export const handleNotificationDeepLink = (data: any) => {
  if (!data) return;

  console.log('[NotificationService] Handling deep link with payload:', data);
  const { deepLink, type, targetUserId, confessionId, eventId } = data;

  if (deepLink) {
    try {
      router.push(deepLink as any);
      return;
    } catch (e) {
      console.warn('[NotificationService] Direct deepLink push failed, trying fallback:', e);
    }
  }

  // Fallback by notification type
  switch (type) {
    case 'chat':
      if (targetUserId) router.push(`/chat/${targetUserId}` as any);
      break;
    case 'match':
      if (targetUserId) router.push(`/chat/${targetUserId}` as any);
      else router.push('/(tabs)/messages' as any);
      break;
    case 'like':
    case 'handshake':
      router.push('/(tabs)/likes' as any);
      break;
    case 'confession_like':
    case 'confession_comment':
      router.push('/(tabs)/confessions' as any);
      break;
    case 'verification_approved':
    case 'verification_rejected':
      router.push('/onboarding/verification' as any);
      break;
    case 'event_approved':
    case 'event_rsvp':
      router.push('/(tabs)/events' as any);
      break;
    case 'premium_activated':
    case 'premium_expiring':
    case 'premium_expired':
    case 'grant_premium':
      router.push('/premium' as any);
      break;
    default:
      router.push('/(tabs)/discover' as any);
      break;
  }
};

/**
 * Initialize Push Notifications on App Boot
 */
export const initPushNotifications = async () => {
  if (!messaging) {
    console.log('[NotificationService] FCM Messaging not available in current environment.');
    return;
  }

  try {
    // 1. Request Permission (Required for iOS & Android 13+)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[NotificationService] User denied push notification permissions.');
      return;
    }

    console.log('[NotificationService] Push notification permission granted.');

    // 2. Fetch Device FCM Token
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await registerPushTokenWithBackend(fcmToken);
    }

    // 3. Token Refresh Listener
    messaging().onTokenRefresh(async (newToken: string) => {
      console.log('[NotificationService] FCM Token refreshed.');
      await registerPushTokenWithBackend(newToken);
    });

    // 4. Foreground Message Listener (App is open)
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage: any) => {
      console.log('[NotificationService] Foreground Notification received:', remoteMessage);
      // Foreground notifications arrive silently; app will render in-app alert or banner
    });

    // 5. Notification Tap Listener (App opened from background state)
    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('[NotificationService] App opened from background by tapping notification:', remoteMessage);
      handleNotificationDeepLink(remoteMessage.data);
    });

    // 6. Check Initial Notification (App launched from cold killed state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('[NotificationService] App launched from cold state via notification:', remoteMessage);
          handleNotificationDeepLink(remoteMessage.data);
        }
      });

    return () => {
      unsubscribeForeground();
    };
  } catch (error) {
    console.error('[NotificationService Initialization Error]:', error);
  }
};

/**
 * Update Notification Preferences with backend
 */
export const updateNotificationPreferencesWithBackend = async (preferences: Record<string, boolean>) => {
  try {
    const sessionToken = await AsyncStorage.getItem('session_token');
    if (!sessionToken) return;

    await fetch(`${BACKEND_URL}/api/auth/notification-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ preferences })
    });
  } catch (error) {
    console.error('[NotificationService Error] Failed to update preferences:', error);
  }
};
