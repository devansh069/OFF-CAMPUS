import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Referrals() {
  const { sessionToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchStats();

    // Pulse animation for the hero icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (stats) {
      const userCount = stats?.referral_count || 0;
      const progress = Math.min(userCount / 10, 1);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [stats]);

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
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const shareCode = async () => {
    const code = stats?.referral_code || 'CAMPUS2026';
    try {
      await Share.share({
        message: `Hey! Join me on Off Campus - the premier app for college students!\n\nUse my referral code: ${code}\n\nWe both get instant vibe score boosts and exclusive perks!`,
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

  const milestones = [
    { target: 1, title: '+2 Vibe Boost', desc: 'Instant +2 Vibe Score points', icon: 'sparkles', color: '#C2FF3D' },
    { target: 3, title: '1.5x Visibility', desc: 'Profile shown to 50% more people', icon: 'eye', color: '#7C5CFC' },
    { target: 5, title: 'Max 10/10 Score', desc: 'Max out your reputation instantly', icon: 'star', color: '#FFD700' },
    { target: 7, title: '2x Super Boost', desc: 'Top priority on discovery feed', icon: 'rocket', color: '#FF6B9D' },
    { target: 10, title: 'Free Event Pass', desc: 'VIP access to campus events', icon: 'ticket', color: '#4FC3F7' },
  ];

  const howItWorks = [
    { step: '1', title: 'Share Your Code', desc: 'Copy or share your unique referral code with friends', icon: 'share-social' },
    { step: '2', title: 'Friends Sign Up', desc: 'They enter your code during registration', icon: 'person-add' },
    { step: '3', title: 'You Get Rewarded', desc: 'You receive +2 Vibe Score boost instantly', icon: 'gift' },
  ];

  return (
    <View style={styles.container}>
      {/* Background Glow */}
      <View style={styles.glowBallContainer}>
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Secondary glow */}
      <View style={styles.glowBallRight}>
        <LinearGradient
          colors={['rgba(194, 255, 61, 0.08)', 'rgba(0,0,0,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topTitleRow}>
            <Ionicons name="gift-outline" size={18} color="#C2FF3D" style={{ marginRight: 6 }} />
            <Text style={styles.topTitle}>Referrals</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Animated.View style={[styles.heroIconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient colors={['#C2FF3D', '#76A30E']} style={styles.heroIconGrad}>
                <Ionicons name="people" size={38} color="#000" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.heroTitle}>Invite Friends</Text>
            <Text style={styles.heroSubtitle}>Earn Vibe Boosts & Unlock Exclusive Perks</Text>
          </View>

          {/* Referral Code Card */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{stats?.referral_code || 'CAMPUS2026'}</Text>
            </View>
            <View style={styles.codeBtnRow}>
              <TouchableOpacity style={styles.codeBtnCopy} onPress={copyCode} activeOpacity={0.8}>
                <Ionicons name={codeCopied ? "checkmark-circle" : "copy-outline"} size={18} color={codeCopied ? "#C2FF3D" : "#FFF"} />
                <Text style={[styles.codeBtnCopyText, codeCopied && { color: '#C2FF3D' }]}>
                  {codeCopied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.codeBtnShare} onPress={shareCode} activeOpacity={0.8}>
                <Ionicons name="share-social" size={18} color="#000" />
                <Text style={styles.codeBtnShareText}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Tracker */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressCountNum}>{userCount}</Text>
                <Text style={styles.progressCountLabel}>Friends Joined</Text>
              </View>
              <View style={styles.progressBadge}>
                <Ionicons name="trending-up" size={14} color="#C2FF3D" />
                <Text style={styles.progressBadgeText}>+{userCount * 2} Vibe Score</Text>
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={['#C2FF3D', '#76A30E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>0</Text>
              <Text style={styles.progressLabelText}>10 friends</Text>
            </View>
          </View>

          {/* Milestone Timeline */}
          <View style={styles.milestonesSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="ribbon-outline" size={20} color="#C2FF3D" />
              <Text style={styles.sectionTitle}>Milestone Perks</Text>
            </View>

            <View style={styles.timelineContainer}>
              {milestones.map((m, idx) => {
                const isUnlocked = userCount >= m.target;
                const isLast = idx === milestones.length - 1;
                return (
                  <View key={idx} style={styles.timelineItem}>
                    {/* Connecting line */}
                    {!isLast && (
                      <View style={[
                        styles.timelineLine,
                        { backgroundColor: isUnlocked ? 'rgba(194, 255, 61, 0.3)' : 'rgba(255, 255, 255, 0.06)' }
                      ]} />
                    )}

                    {/* Icon node */}
                    <View style={[
                      styles.timelineNode,
                      {
                        backgroundColor: isUnlocked ? `${m.color}20` : 'rgba(255, 255, 255, 0.04)',
                        borderColor: isUnlocked ? m.color : 'rgba(255, 255, 255, 0.1)',
                      }
                    ]}>
                      <Ionicons
                        name={isUnlocked ? "checkmark" : m.icon as any}
                        size={18}
                        color={isUnlocked ? m.color : 'rgba(255, 255, 255, 0.3)'}
                      />
                    </View>

                    {/* Content card */}
                    <View style={[
                      styles.timelineCard,
                      isUnlocked && { borderColor: `${m.color}30`, backgroundColor: `${m.color}06` }
                    ]}>
                      <View style={styles.timelineCardTop}>
                        <Text style={[styles.timelineTitle, isUnlocked && { color: m.color }]}>{m.title}</Text>
                        <View style={[
                          styles.timelineBadge,
                          {
                            backgroundColor: isUnlocked ? `${m.color}15` : 'rgba(255,255,255,0.04)',
                            borderColor: isUnlocked ? `${m.color}40` : 'rgba(255,255,255,0.08)',
                          }
                        ]}>
                          <Text style={[
                            styles.timelineBadgeText,
                            { color: isUnlocked ? m.color : 'rgba(255,255,255,0.35)' }
                          ]}>
                            {isUnlocked ? 'UNLOCKED' : `${m.target} FRIENDS`}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.timelineDesc}>{m.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* How It Works */}
          <View style={styles.howItWorksSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bulb-outline" size={20} color="#FFD700" />
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>

            <View style={styles.stepsRow}>
              {howItWorks.map((step, idx) => (
                <View key={idx} style={styles.stepCard}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumber}>{step.step}</Text>
                  </View>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name={step.icon as any} size={22} color="#C2FF3D" />
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bottom CTA */}
          <TouchableOpacity style={styles.bottomCta} onPress={shareCode} activeOpacity={0.9}>
            <LinearGradient colors={['#C2FF3D', '#9BDC20']} style={styles.bottomCtaGrad}>
              <Ionicons name="share-social" size={22} color="#000" />
              <Text style={styles.bottomCtaText}>Share & Earn Rewards</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
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
  glowBallRight: {
    position: 'absolute',
    top: -200,
    right: -300,
    width: 700,
    height: 700,
    borderRadius: 350,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topTitleRow: { flexDirection: 'row', alignItems: 'center' },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 16 },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroIconCircle: {
    marginBottom: 16,
  },
  heroIconGrad: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Code Card
  codeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  codeLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 14,
  },
  codeBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.2)',
    borderStyle: 'dashed',
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  codeText: {
    color: '#C2FF3D',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 6,
  },
  codeBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  codeBtnCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  codeBtnCopyText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  codeBtnShare: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C2FF3D',
    paddingVertical: 14,
    borderRadius: 16,
  },
  codeBtnShareText: { color: '#000', fontSize: 14, fontWeight: '900' },

  // Progress Card
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 28,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressCountNum: {
    color: '#C2FF3D',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
  },
  progressCountLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  progressBadgeText: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabelText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Milestones
  milestonesSection: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  timelineContainer: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: 80,
  },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 42,
    bottom: -2,
    width: 2,
    borderRadius: 1,
  },
  timelineNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 14,
    zIndex: 1,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  timelineCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  timelineBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timelineDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    lineHeight: 18,
  },

  // How It Works
  howItWorksSection: {
    marginBottom: 24,
  },
  stepsRow: {
    gap: 12,
  },
  stepCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    position: 'relative',
  },
  stepNumberCircle: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '900',
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.15)',
  },
  stepTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepDesc: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  // Bottom CTA
  bottomCta: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 4,
  },
  bottomCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  bottomCtaText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '900',
  },
});
