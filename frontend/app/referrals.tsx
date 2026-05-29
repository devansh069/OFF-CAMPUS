import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
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
        message: `Hey! Join me on Off Campus - the dating app for college students! 🎓💕\n\nUse my code: ${stats.referral_code}\n\nWe both get 7 days of Premium FREE!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Refer Friends</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#FFD700', '#FFA500', '#FF6B35']}
          style={styles.heroCard}
        >
          <Ionicons name="gift" size={56} color="#FFF" />
          <Text style={styles.heroTitle}>Get Free Premium!</Text>
          <Text style={styles.heroSubtitle}>
            Earn 7 days of Premium for every friend who joins
          </Text>
        </LinearGradient>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
          <Text style={styles.code}>{stats?.referral_code}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={copyCode}>
              <Ionicons name="copy" size={20} color="#FF3366" />
              <Text style={styles.codeBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.codeBtn, styles.shareBtn]} onPress={shareCode}>
              <Ionicons name="share-social" size={20} color="#FFF" />
              <Text style={[styles.codeBtnText, { color: '#FFF' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.referral_count || 0}</Text>
            <Text style={styles.statLabel}>Friends Joined</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.rewards_earned_days || 0}</Text>
            <Text style={styles.statLabel}>Days Earned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats?.premium_days_remaining || 0}</Text>
            <Text style={styles.statLabel}>Days Left</Text>
          </View>
        </View>

        <View style={styles.howSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Share your code with college friends</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>They sign up using your code</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>You both get 7 days of Premium FREE</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
            <Text style={styles.stepText}>Premium = access to ALL colleges! 🔥</Text>
          </View>
        </View>

        {stats?.referred_users?.length > 0 && (
          <View style={styles.referredSection}>
            <Text style={styles.sectionTitle}>Your Referrals</Text>
            {stats.referred_users.map((u: any, i: number) => (
              <View key={i} style={styles.referredItem}>
                <Ionicons name="person-circle" size={32} color="#FF3366" />
                <Text style={styles.referredName}>{u.name}</Text>
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>+7 days</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
  },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  heroCard: {
    margin: 16,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  heroSubtitle: { fontSize: 14, color: '#FFF', textAlign: 'center', opacity: 0.95 },
  codeCard: {
    margin: 16,
    marginTop: 0,
    padding: 24,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#FF3366',
  },
  codeLabel: { color: '#999', fontSize: 12, letterSpacing: 2, fontWeight: '600' },
  code: { color: '#FFF', fontSize: 32, fontWeight: 'bold', letterSpacing: 4 },
  codeActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0A0A0A',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FF3366',
  },
  shareBtn: { backgroundColor: '#FF3366' },
  codeBtnText: { color: '#FF3366', fontWeight: 'bold' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: '#FFD700', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#999', fontSize: 11, textAlign: 'center' },
  howSection: { padding: 16, gap: 12 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E1E1E',
    padding: 14,
    borderRadius: 12,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: '#FFF', fontWeight: 'bold' },
  stepText: { color: '#FFF', flex: 1, fontSize: 14 },
  referredSection: { padding: 16 },
  referredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  referredName: { color: '#FFF', flex: 1, fontWeight: '600' },
  successBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  successBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
});
