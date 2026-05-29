import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Linking } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Premium() {
  const { user, sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const origin = Platform.OS === 'web' ? window.location.origin : 'https://vibe-score-9.preview.emergentagent.com';
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/premium/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({
          success_url: `${origin}/premium-success`,
          cancel_url: `${origin}/premium`,
        }),
      });
      if (!r.ok) {
        const err = await r.text();
        Alert.alert('Error', `Could not start checkout: ${err}`);
        return;
      }
      const d = await r.json();
      if (Platform.OS === 'web') {
        window.location.href = d.checkout_url;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(d.checkout_url, `${origin}/premium-success`);
        if (result.type === 'success' && result.url) {
          const m = result.url.match(/session_id=([^&]+)/);
          if (m) await verifyPayment(m[1]);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (sessionId: string) => {
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/premium/status/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const d = await r.json();
      if (d.is_premium) {
        await refreshUser();
        Alert.alert('Welcome to Premium! 👑', 'You now have access to all colleges!');
        router.back();
      }
    } catch (e) { console.error(e); }
  };

  const features = [
    { icon: 'globe', text: 'Browse profiles from ALL colleges across Delhi' },
    { icon: 'flash', text: 'See top vibes from every campus' },
    { icon: 'calendar', text: 'RSVP to events at other colleges' },
    { icon: 'eye', text: 'See who viewed your profile' },
    { icon: 'star', text: 'Boost your Vibe Score visibility' },
    { icon: 'sparkles', text: 'No ads, premium-only stories' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.bg}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
          <View style={styles.crown}>
            <LinearGradient colors={['#FFD700', '#FF6B35']} style={styles.crownCircle}>
              <Ionicons name="diamond" size={48} color="#FFF" />
            </LinearGradient>
          </View>

          <Text style={styles.heroTitle}>Off Campus</Text>
          <Text style={styles.heroPremium}>PREMIUM</Text>
          <Text style={styles.heroSub}>Unlock all of Delhi's campuses 🇮🇳</Text>

          <View style={styles.priceCard}>
            <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.priceGrad}>
              <Text style={styles.priceAmt}>₹99</Text>
              <Text style={styles.pricePer}>per month</Text>
              <Text style={styles.priceNote}>Cancel anytime</Text>
            </LinearGradient>
          </View>

          <View style={styles.features}>
            {features.map((f, i) => (
              <View key={i} style={styles.feature}>
                <View style={styles.featIcon}>
                  <Ionicons name={f.icon as any} size={20} color="#FFD700" />
                </View>
                <Text style={styles.featText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.subBtn} onPress={handleSubscribe} disabled={loading || user?.is_premium}>
            <LinearGradient colors={['#FFD700', '#FF6B35']} style={styles.subBtnGrad}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="diamond" size={20} color="#FFF" />
                  <Text style={styles.subBtnText}>{user?.is_premium ? 'Already Premium ✨' : 'Subscribe Now'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            🔒 Secure payment via Stripe • Cancel anytime from your account
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0817' },
  bg: { flex: 1 },
  topBar: { padding: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  crown: { alignItems: 'center', marginBottom: 16 },
  crownCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#FFF', fontSize: 36, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  heroPremium: { color: '#FFD700', fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 4 },
  heroSub: { color: '#A899B8', fontSize: 16, textAlign: 'center', marginTop: 8 },
  priceCard: { marginTop: 24, borderRadius: 24, overflow: 'hidden' },
  priceGrad: { padding: 24, alignItems: 'center' },
  priceAmt: { color: '#FFF', fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  pricePer: { color: '#FFF', fontSize: 16, opacity: 0.9 },
  priceNote: { color: '#FFF', fontSize: 12, opacity: 0.7, marginTop: 8 },
  features: { marginTop: 24, gap: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A0F2A', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#2A1B3D' },
  featIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFD70022', alignItems: 'center', justifyContent: 'center' },
  featText: { color: '#FFF', flex: 1, fontSize: 14 },
  subBtn: { marginTop: 24, borderRadius: 30, overflow: 'hidden' },
  subBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18 },
  subBtnText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  disclaimer: { color: '#6B5B7A', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
