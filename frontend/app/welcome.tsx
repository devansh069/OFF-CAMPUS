import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ScrollView, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      if (!user.college_id || !user.age) {
        router.replace('/onboarding/profile-setup');
      } else {
        router.replace('/(tabs)/discover');
      }
    }
  }, [user]);

  const handleLogin = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email to continue');
      return;
    }
    login(email.trim().toLowerCase());
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0C0D18', '#050507']} style={styles.gradient}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <View style={styles.header}>
                <Image 
                  source={require('../assets/images/logo.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
                <Text style={styles.tagline}>where college life gets real 🔥</Text>
              </View>

              <View style={styles.features}>
                <Feature icon="heart" color="#F43F5E" t="Match Your Campus Crush" s="Swipe through verified students" />
                <Feature icon="planet" color="#8B5CF6" t="Live Campus Pulse" s="Stories, confessions & top vibes" />
                <Feature icon="calendar" color="#10B981" t="Fests & Events" s="Never miss the big nights out" />
                <Feature icon="diamond" color="#FFD700" t="Go Global" s="Premium ₹99/mo: All Delhi colleges" />
              </View>

              <View style={styles.bottomBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter college or personal email"
                  placeholderTextColor="#4B5563"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.googleBtn} onPress={handleLogin}>
                  <LinearGradient colors={['#3B82F6', '#8B5CF6', '#EF4444']} style={styles.btnGrad}>
                    <Ionicons name="log-in-outline" size={22} color="#FFF" />
                    <Text style={styles.btnText}>Login / Register</Text>
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
  container: { flex: 1, backgroundColor: '#07080F' },
  gradient: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 40, gap: 8 },
  logoImage: { width: 220, height: 75, alignSelf: 'center', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  features: { gap: 12, marginVertical: 30 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#12131F', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#1E2030' },
  featIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  featT: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  featS: { color: '#94A3B8', fontSize: 12 },
  bottomBox: { gap: 12, alignItems: 'center', width: '100%' },
  input: {
    width: '100%',
    backgroundColor: '#12131F',
    borderWidth: 1,
    borderColor: '#1E2030',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
  },
  googleBtn: { width: '100%', borderRadius: 30, overflow: 'hidden' },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  disclaimer: { color: '#4B5563', fontSize: 12 },
  adminLink: { color: '#6B7280', fontSize: 12, textDecorationLine: 'underline', marginTop: 8 },
});
