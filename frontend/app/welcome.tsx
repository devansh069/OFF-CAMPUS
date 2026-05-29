import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.gradient}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.logoBox}>
                  <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.logoCircle}>
                    <Ionicons name="flame" size={36} color="#FFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.brand}>off campus</Text>
                <Text style={styles.tagline}>where college life gets real 🔥</Text>
              </View>

              <View style={styles.features}>
                <Feature icon="heart" color="#FF1B6B" t="Match Your Campus Crush" s="Swipe through verified students" />
                <Feature icon="planet" color="#9D4EDD" t="Live Campus Pulse" s="Stories, confessions & top vibes" />
                <Feature icon="calendar" color="#06D6A0" t="Fests & Events" s="Never miss the big nights out" />
                <Feature icon="diamond" color="#FFD700" t="Go Global" s="Premium ₹99/mo: All Delhi colleges" />
              </View>

              <View style={styles.bottomBox}>
                <TouchableOpacity style={styles.googleBtn} onPress={login}>
                  <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.btnGrad}>
                    <Ionicons name="logo-google" size={22} color="#FFF" />
                    <Text style={styles.btnText}>Continue with Google</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.disclaimer}>verified students only • 18+</Text>
                <TouchableOpacity onPress={() => router.push('/admin')}>
                  <Text style={styles.adminLink}>Admin Portal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const Feature = ({ icon, color, t, s }: any) => (
  <View style={styles.feature}>
    <View style={[styles.featIcon, { backgroundColor: color + '22', borderColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.featT}>{t}</Text>
      <Text style={styles.featS}>{s}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 40, gap: 8 },
  logoBox: { padding: 4, borderRadius: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 42, fontWeight: '900', color: '#FFF', letterSpacing: -1.5, marginTop: 8 },
  tagline: { fontSize: 16, color: '#A899B8', fontWeight: '600' },
  features: { gap: 12, marginVertical: 40 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A0F2A', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#2A1B3D' },
  featIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  featT: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  featS: { color: '#A899B8', fontSize: 12 },
  bottomBox: { gap: 12, alignItems: 'center' },
  googleBtn: { width: '100%', borderRadius: 30, overflow: 'hidden' },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  disclaimer: { color: '#6B5B7A', fontSize: 12 },
  adminLink: { color: '#6B5B7A', fontSize: 12, textDecorationLine: 'underline', marginTop: 8 },
});
