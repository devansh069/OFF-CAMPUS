import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Referrals() {
  const { sessionToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/referrals/my-stats`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!stats?.referral_code) return;
    try {
      await Clipboard.setStringAsync(stats.referral_code);
      Alert.alert('Copied!', 'Referral code copied to clipboard');
    } catch (error) {
      console.error(error);
    }
  };

  const shareCode = async () => {
    if (!stats?.referral_code) return;
    try {
      await Share.share({
        message: `Hey! Join me on Off Campus - the dating app for college students! 🎓💕\n\nUse my code: ${stats.referral_code}\n\nWe both get premium perks!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C2FF3D" />
      </View>
    );
  }

  const perks = [
    { title: '+2 Vibe Score', desc: 'Instant boost to your profile', icon: 'sparkles' },
    { title: '1.5x Visibility', desc: 'Get seen by more matches (3 Friends)', icon: 'eye' },
    { title: '10/10 Vibe Score', desc: 'Max out your vibe instantly (5 Friends)', icon: 'star' },
    { title: '2.0x Ultimate', desc: 'Maximum profile visibility (7 Friends)', icon: 'rocket' },
    { title: 'Event Pass', desc: 'Free entry to Off-Campus events (10 Friends)', icon: 'ticket' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Referrals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Dynamic Header */}
        <View style={styles.headerSection}>
          <View style={styles.glowCircle}>
            <Ionicons name="people" size={48} color="#C2FF3D" />
          </View>
          <Text style={styles.mainHeading}>Invite Friends,</Text>
          <Text style={styles.subHeading}>Unlock Premium Perks</Text>
        </View>

        {/* Code Card */}
        <View style={styles.glassCard}>
          <Text style={styles.glassLabel}>YOUR UNIQUE CODE</Text>
          <View style={styles.codeWrapper}>
            <Text style={styles.codeText}>{stats?.referral_code || 'LOADING...'}</Text>
          </View>
          
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={copyCode}>
              <Ionicons name="copy-outline" size={20} color="#C2FF3D" />
              <Text style={styles.actionBtnText}>Copy Code</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={shareCode}>
              <Ionicons name="share-social" size={20} color="#0A0A0A" />
              <Text style={[styles.actionBtnText, { color: '#0A0A0A' }]}>Share Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <LinearGradient colors={['rgba(194, 255, 61, 0.1)', 'rgba(194, 255, 61, 0.02)']} style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.referral_count || 0}</Text>
            <Text style={styles.statDesc}>Friends Joined</Text>
          </LinearGradient>
        </View>

        {/* Perks Timeline */}
        <View style={styles.perksSection}>
          <Text style={styles.sectionTitle}>Unlock Timeline</Text>
          <View style={styles.timeline}>
            {perks.map((perk, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineIcon}>
                  <Ionicons name={perk.icon as any} size={20} color="#0A0A0A" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{perk.title}</Text>
                  <Text style={styles.timelineDesc}>{perk.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  glowCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.25)',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  mainHeading: { color: '#FFF', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subHeading: { color: '#C2FF3D', fontSize: 18, fontWeight: '600' },
  glassCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassLabel: { color: '#999', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 16 },
  codeWrapper: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.2)',
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  codeText: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: 4 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionBtnPrimary: {
    backgroundColor: '#C2FF3D',
  },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  statsContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  statBox: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.15)',
  },
  statNumber: { color: '#C2FF3D', fontSize: 56, fontWeight: '900', marginBottom: 4 },
  statDesc: { color: '#FFF', fontSize: 16, fontWeight: '600', opacity: 0.8 },
  perksSection: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 24 },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  timelineDesc: { color: '#999', fontSize: 14, lineHeight: 22 },
});
