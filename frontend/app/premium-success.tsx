import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PremiumSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const { sessionToken, refreshUser } = useAuth();

  useEffect(() => {
    if (params.session_id) verify();
  }, [params.session_id]);

  const verify = async () => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/premium/status/${params.session_id}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      await refreshUser();
      setTimeout(() => router.replace('/(tabs)/discover'), 2000);
    } catch (e) { console.error(e); }
  };

  return (
    <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.c}>
      <View style={styles.icon}><Ionicons name="checkmark-circle" size={100} color="#06D6A0" /></View>
      <Text style={styles.t}>Welcome to Premium! 👑</Text>
      <Text style={styles.s}>You now have access to all colleges</Text>
      <ActivityIndicator color="#FFD700" style={{ marginTop: 20 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { marginBottom: 24 },
  t: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  s: { color: '#A899B8', fontSize: 16, marginTop: 8, textAlign: 'center' },
});
