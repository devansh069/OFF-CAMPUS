import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';

SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if user is currently inside protected tabs/chat routes
    const inProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'chat' || segments[0] === 'profile-edit';

    if (!user && inProtectedGroup) {
      // Redirect back to welcome landing screen immediately
      router.replace('/welcome');
    }
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
      <Stack.Screen name="premium-success" />
      <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
