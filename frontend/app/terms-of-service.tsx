import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050005', '#160222']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#C2FF3D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.lastUpdated}>Last updated: July 2026</Text>

          <Text style={styles.heading}>1. Eligibility & Age Restriction</Text>
          <Text style={styles.paragraph}>
            Off Campus is strictly designed for students enrolled in verified colleges and universities. You must be at least 18 years of age to register or use any matching and chatting features.
          </Text>

          <Text style={styles.heading}>2. Community Standards</Text>
          <Text style={styles.paragraph}>
            Users agree to behave with respect, integrity, and safety. Bullying, harassment, hate speech, or sharing explicit media will result in permanent account bans.
          </Text>

          <Text style={styles.heading}>3. Subscription & Premium Passes</Text>
          <Text style={styles.paragraph}>
            Accessing special premium benefits, such as global vibe matching or unlimiting swipes, is subject to recurring billing plans. Purchases are final and non-refundable.
          </Text>

          <Text style={styles.heading}>4. Disclaimer of Liability</Text>
          <Text style={styles.paragraph}>
            Off Campus is not liable for interpersonal interactions, offline meetups, or any disputes occurring between verified platform members. Play safe, connect responsibly.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050005',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#2A1B3D',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
  },
  lastUpdated: {
    color: 'rgba(194, 255, 61, 0.7)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 20,
  },
  heading: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 8,
  },
  paragraph: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    lineHeight: 22,
  },
});
