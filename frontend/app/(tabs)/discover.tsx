import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Animated, PanResponder, Dimensions, ScrollView } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function Discover() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState<any>(null);
  const [globalMode, setGlobalMode] = useState(false);
  
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles`, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      const d = await r.json();
      setProfiles(d.profiles || []);
      setIdx(0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const swipeOff = async (dir: 'left' | 'right') => {
    const profile = profiles[idx];
    if (!profile) return;
    
    Animated.timing(position, {
      toValue: { x: dir === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      if (dir === 'right') {
        try {
          const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
            body: JSON.stringify({ target_user_id: profile.user_id }),
          });
          const d = await r.json();
          if (d.is_match) setShowMatch(profile);
        } catch (e) { console.error(e); }
      }
      if (idx + 1 >= profiles.length) fetchProfiles();
      else setIdx(idx + 1);
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) swipeOff('right');
      else if (g.dx < -SWIPE_THRESHOLD) swipeOff('left');
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }).start();
    },
  })).current;

  const rotate = position.x.interpolate({ inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2], outputRange: ['-10deg', '0deg', '10deg'] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SCREEN_W / 4], outputRange: [0, 1] });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SCREEN_W / 4, 0], outputRange: [1, 0] });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF1B6B" /></View>;

  const profile = profiles[idx];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.bg}>
        <View style={styles.topBar}>
          <View style={styles.logoBox}>
            <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.logoIcon}>
              <Ionicons name="flame" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.brand}>off campus</Text>
          </View>
          <TouchableOpacity 
            style={[styles.modeBtn, user?.is_premium && globalMode && styles.modeBtnActive]}
            onPress={() => user?.is_premium ? setGlobalMode(!globalMode) : router.push('/premium')}
          >
            <Ionicons name={user?.is_premium ? 'globe' : 'diamond'} size={14} color={user?.is_premium ? '#FFD700' : '#FFD700'} />
            <Text style={styles.modeText}>{user?.is_premium ? (globalMode ? 'Global' : 'Campus') : 'Go Global'}</Text>
          </TouchableOpacity>
        </View>

        {!profile ? (
          <ScrollView contentContainerStyle={styles.empty}>
            <Ionicons name="search" size={80} color="#3D2B4F" />
            <Text style={styles.emptyT}>No more profiles!</Text>
            <Text style={styles.emptyS}>Check back later for new vibes</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchProfiles}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.cardArea}>
            {/* Next card preview */}
            {profiles[idx + 1] && (
              <View style={[styles.card, styles.cardBehind]}>
                <Image source={{ uri: profiles[idx + 1].photos?.[0] || profiles[idx + 1].picture }} style={styles.cardImage} />
              </View>
            )}
            
            <Animated.View
              {...panResponder.panHandlers}
              style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
            >
              <Image source={{ uri: profile.photos?.[0] || profile.picture }} style={styles.cardImage} />
              
              <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
                <Text style={styles.likeStampText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.nopeStamp, { opacity: nopeOpacity }]}>
                <Text style={styles.nopeStampText}>NOPE</Text>
              </Animated.View>

              <View style={styles.vibeBadge}>
                <Ionicons name="sparkles" size={14} color="#FFD700" />
                <Text style={styles.vibeText}>{profile.vibe_score?.toFixed(1)} VIBE</Text>
              </View>

              {profile.is_on_campus && (
                <View style={styles.campusBadge}><Text style={styles.campusText}>ON CAMPUS</Text></View>
              )}

              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={styles.cardGrad}>
                <View style={styles.infoBox}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cardName}>{profile.name}</Text>
                    <Text style={styles.cardAge}>{profile.age}</Text>
                    {profile.verification_status === 'verified' && (
                      <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
                    )}
                  </View>
                  {(profile.year || profile.course) && (
                    <View style={styles.collegeChip}>
                      <Ionicons name="school" size={14} color="#FFF" />
                      <Text style={styles.collegeText}>{[profile.course, profile.year].filter(Boolean).join(' • ')}</Text>
                    </View>
                  )}
                  {profile.bio && <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text>}
                  {profile.looking_for && (
                    <View style={styles.lookingChip}>
                      <Ionicons name="heart" size={12} color="#FF1B6B" />
                      <Text style={styles.lookingText}>Looking for {profile.looking_for}</Text>
                    </View>
                  )}
                  {profile.interests?.length > 0 && (
                    <View style={styles.tagsRow}>
                      {profile.interests.slice(0, 3).map((i: string) => (
                        <View key={i} style={styles.intTag}><Text style={styles.intText}>{i}</Text></View>
                      ))}
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        )}

        {profile && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.nopeBtn]} onPress={() => swipeOff('left')}>
              <Ionicons name="close" size={28} color="#FF1B6B" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.superBtn]}>
              <Ionicons name="star" size={24} color="#FFD700" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => swipeOff('right')}>
              <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.likeBtnGrad}>
                <Ionicons name="heart" size={28} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {showMatch && (
          <View style={styles.matchOverlay}>
            <LinearGradient colors={['#FF1B6B', '#9D4EDD', '#FFD700']} style={styles.matchInner}>
              <Text style={styles.matchTitle}>IT'S A MATCH! 💥</Text>
              <Text style={styles.matchSub}>You and {showMatch.name} liked each other</Text>
              <Image source={{ uri: showMatch.photos?.[0] || showMatch.picture }} style={styles.matchPic} />
              <View style={styles.matchActions}>
                <TouchableOpacity style={styles.matchBtn} onPress={() => { setShowMatch(null); router.push(`/chat/${showMatch.user_id}`); }}>
                  <Text style={styles.matchBtnText}>Say Hi 👋</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.matchBtnSecondary} onPress={() => setShowMatch(null)}>
                  <Text style={styles.matchBtnTextSecondary}>Keep Swiping</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0817' },
  bg: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0817' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  logoBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2A1B3D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FFD700' },
  modeBtnActive: { backgroundColor: '#FFD700' },
  modeText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  cardArea: { flex: 1, paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  card: { width: SCREEN_W - 32, aspectRatio: 0.7, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1A0F2A', position: 'absolute' },
  cardBehind: { transform: [{ scale: 0.95 }], opacity: 0.6 },
  cardImage: { width: '100%', height: '100%' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 80, paddingBottom: 16, paddingHorizontal: 16 },
  infoBox: { gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cardName: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  cardAge: { color: '#FFF', fontSize: 24, fontWeight: '600', opacity: 0.85 },
  collegeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginTop: 4 },
  collegeText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  bioText: { color: '#FFF', fontSize: 14, marginTop: 6, opacity: 0.95 },
  lookingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,27,107,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FF1B6B', marginTop: 4 },
  lookingText: { color: '#FF8FB1', fontSize: 12, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  intTag: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  intText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  vibeBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  vibeText: { color: '#FFD700', fontSize: 12, fontWeight: '900' },
  campusBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#06D6A0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  campusText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  likeStamp: { position: 'absolute', top: 60, left: 30, borderWidth: 4, borderColor: '#06D6A0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, transform: [{ rotate: '-20deg' }] },
  likeStampText: { color: '#06D6A0', fontSize: 32, fontWeight: '900' },
  nopeStamp: { position: 'absolute', top: 60, right: 30, borderWidth: 4, borderColor: '#FF1B6B', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, transform: [{ rotate: '20deg' }] },
  nopeStampText: { color: '#FF1B6B', fontSize: 32, fontWeight: '900' },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 16 },
  actionBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  nopeBtn: { backgroundColor: '#FFF' },
  superBtn: { backgroundColor: '#2A1B3D', borderWidth: 2, borderColor: '#FFD700' },
  likeBtn: { borderRadius: 30, overflow: 'hidden' },
  likeBtnGrad: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, padding: 60, alignItems: 'center', gap: 12 },
  emptyT: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 12 },
  emptyS: { color: '#A899B8' },
  refreshBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FF1B6B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  refreshText: { color: '#FFF', fontWeight: '700' },
  matchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  matchInner: { padding: 30, borderRadius: 24, alignItems: 'center', gap: 16, width: '100%' },
  matchTitle: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  matchSub: { color: '#FFF', fontSize: 14, opacity: 0.95 },
  matchPic: { width: 180, height: 180, borderRadius: 90, borderWidth: 5, borderColor: '#FFF' },
  matchActions: { gap: 12, width: '100%' },
  matchBtn: { backgroundColor: '#FFF', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  matchBtnText: { color: '#FF1B6B', fontWeight: '900', fontSize: 16 },
  matchBtnSecondary: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  matchBtnTextSecondary: { color: '#FFF', fontWeight: '700' },
});
