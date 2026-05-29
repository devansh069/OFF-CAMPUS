import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Give the AuthContext time to process the session_id
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          if (!user.college_id || !user.age) {
            router.replace('/onboarding/profile-setup');
          } else {
            router.replace('/(tabs)/discover');
          }
        } else {
          router.replace('/welcome');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF3366" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: '#FFF',
    fontSize: 16,
  },
});
