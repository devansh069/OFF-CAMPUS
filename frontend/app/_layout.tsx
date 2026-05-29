import React from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
