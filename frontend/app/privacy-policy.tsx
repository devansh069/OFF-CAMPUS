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

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050005', '#160222']} style={styles.gradient}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#C2FF3D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.lastUpdated}>Last updated: July 2026</Text>

          <Text style={styles.heading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect personal profile data (such as name, age, gender, height, religion, lifestyle, interests, academic course, and year) to provide you matching services. Location permissions are utilized to calculate matches near your college campus.
          </Text>

          <Text style={styles.heading}>2. Spotify Integration</Text>
          <Text style={styles.paragraph}>
            Connecting your Spotify account grants access to read your top tracks and top artists. This music data is used to calculate your vibe compatibility scores with other students.
          </Text>

          <Text style={styles.heading}>3. Data Security & Storage</Text>
          <Text style={styles.paragraph}>
            Off Campus utilizes robust database encryption mechanisms and secure tokens (JWT) to safeguard chat histories, messages, and profile photographs.
          </Text>

          <Text style={styles.heading}>4. Your Rights</Text>
          <Text style={styles.paragraph}>
            You hold complete ownership of your personal data. At any time, you can request an export backup of your data or permanently delete your account directly through the Settings dashboard.
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
