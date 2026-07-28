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
      if (sessionToken === 'dummy_token' || !sessionToken) {
        setStats({
          referral_code: 'CAMPUS2026',
          referral_count: 2,
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/referrals/my-stats`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    const code = stats?.referral_code || 'CAMPUS2026';
    try {
      await Clipboard.setStringAsync(code);
      Alert.alert('Copied! 📋', 'Referral code copied to clipboard');
    } catch (error) {
      console.error(error);
    }
  };

  const shareCode = async () => {
    const code = stats?.referral_code || 'CAMPUS2026';
    try {
      await Share.share({
        message: `Hey! Join me on Off Campus - the premier app for college students! 🎓✨\n\nUse my referral code: ${code}\n\nWe both get instant vibe score boosts and exclusive perks!`,
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

  const userCount = stats?.referral_count || 0;

  const perks = [
    { target: 1, title: '+2 Vibe Score Boost', desc: 'Instant +2 points added to your Vibe Score', icon: 'sparkles' },
    { target: 3, title: '1.5x Profile Visibility', desc: 'Get seen by 50% more campus matches', icon: 'eye' },
    { target: 5, title: 'Instant 10/10 Max Score', desc: 'Max out your reputation score instantly', icon: 'star' },
    { target: 7, title: '2.0x Ultimate Visibility', desc: 'Top priority placement on the discovery feed', icon: 'rocket' },
    { target: 10, title: 'Free Off-Campus Event Pass', desc: 'VIP access ticket to official campus events', icon: 'ticket' },
  ];

  return (
    <View style={styles.container}>
      {/* Background Top-Left Purple Glow Ball */}
      <View style={styles.glowBallContainer}>
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topTitleRow}>
            <Ionicons name="gift-outline" size={18} color="#C2FF3D" style={{ marginRight: 6 }} />
            <Text style={styles.topTitle}>Referrals & Perks</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.glowIconCircle}>
              <Ionicons name="people" size={36} color="#C2FF3D" />
            </View>
            <Text style={styles.mainHeading}>Invite Friends</Text>
            <Text style={styles.subHeading}>Unlock Exclusive Perks & Vibe Boosts</Text>
          </View>

          {/* Referral Code Card (Glassmorphic) */}
          <View style={styles.glassCard}>
            <Text style={styles.glassLabel}>YOUR UNIQUE REFERRAL CODE</Text>
            
            <View style={styles.codeWrapper}>
              <Text style={styles.codeText}>{stats?.referral_code || 'CAMPUS2026'}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={copyCode} activeOpacity={0.8}>
                <Ionicons name="copy-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnTextSecondary}>Copy Code</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnPrimary} onPress={shareCode} activeOpacity={0.8}>
                <Ionicons name="share-social" size={18} color="#000" />
                <Text style={styles.actionBtnTextPrimary}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Joined Stats Box */}
          <View style={styles.statsCardGlass}>
            <View style={styles.statContentLeft}>
              <Text style={styles.statNumber}>{userCount}</Text>
              <View style={{ marginLeft: 16 }}>
                <Text style={styles.statTitle}>Friends Joined</Text>
                <Text style={styles.statSub}>+2 Vibe Score added for each join</Text>
              </View>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#C2FF3D" />
              <Text style={styles.statBadgeText}>Active</Text>
            </View>
          </View>

          {/* Perks Unlock Timeline */}
          <View style={styles.perksSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="ribbon-outline" size={20} color="#C2FF3D" />
              <Text style={styles.sectionTitle}>Unlock Milestone Perks</Text>
            </View>

            <View style={{ gap: 12, marginTop: 14 }}>
              {perks.map((perk, index) => {
                const isUnlocked = userCount >= perk.target;
                return (
                  <View
                    key={index}
                    style={[
                      styles.perkCardGlass,
                      isUnlocked && styles.perkCardGlassUnlocked
                    ]}
                  >
                    <View style={styles.perkHeaderRow}>
                      <View style={[
                        styles.perkIconWrap,
                        {
                          backgroundColor: isUnlocked ? 'rgba(194, 255, 61, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          borderColor: isUnlocked ? '#C2FF3D' : 'rgba(255, 255, 255, 0.12)'
                        }
                      ]}>
                        <Ionicons
                          name={perk.icon as any}
                          size={18}
                          color={isUnlocked ? "#C2FF3D" : "rgba(255, 255, 255, 0.5)"}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.perkTitle}>{perk.title}</Text>
                          <View style={[
                            styles.statusPill,
                            {
                              backgroundColor: isUnlocked ? 'rgba(194, 255, 61, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              borderColor: isUnlocked ? 'rgba(194, 255, 61, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                            }
                          ]}>
                            <Text style={[styles.statusPillText, { color: isUnlocked ? '#C2FF3D' : 'rgba(255, 255, 255, 0.4)' }]}>
                              {isUnlocked ? 'UNLOCKED' : `${perk.target} FRIENDS`}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.perkDesc}>{perk.desc}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  topTitleRow: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 16 },
  headerSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  glowIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  mainHeading: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  subHeading: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  glassLabel: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 14 },
  codeWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  codeText: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C2FF3D',
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionBtnTextSecondary: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  actionBtnTextPrimary: { color: '#000', fontSize: 14, fontWeight: '900' },
  statsCardGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  statContentLeft: { flexDirection: 'row', alignItems: 'center' },
  statNumber: { color: '#C2FF3D', fontSize: 36, fontWeight: '900' },
  statTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  statSub: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  statBadgeText: { color: '#C2FF3D', fontSize: 11, fontWeight: '800' },
  perksSection: { marginTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  perkCardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  perkCardGlassUnlocked: {
    borderColor: 'rgba(194, 255, 61, 0.3)',
    backgroundColor: 'rgba(194, 255, 61, 0.04)',
  },
  perkHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  perkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  perkTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  perkDesc: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '900' },
});
