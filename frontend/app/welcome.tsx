import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const { login } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FF3366', '#FF6B35', '#FFA500']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo}>Off Campus</Text>
            <Text style={styles.tagline}>Where College Life Gets Real</Text>
          </View>

          <View style={styles.features}>
            <FeatureItem icon="heart" text="Meet Your Campus Crush" />
            <FeatureItem icon="people" text="Know Who's On Campus" />
            <FeatureItem icon="chatbubbles" text="Anonymous Confessions" />
            <FeatureItem icon="star" text="Build Your Vibe Score" />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.googleButton} onPress={login}>
              <Ionicons name="logo-google" size={24} color="#FFF" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
            
            <Text style={styles.disclaimer}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
            <TouchableOpacity onPress={() => router.push('/admin')}>
              <Text style={styles.adminLink}>Admin Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const FeatureItem = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={28} color="#FFF" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  features: {
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3366',
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  adminLink: {
    textAlign: 'center',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.6,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
