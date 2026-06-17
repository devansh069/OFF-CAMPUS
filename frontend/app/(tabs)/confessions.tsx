import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function CampusLive() {
  const { user, sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [confessions, setConfessions] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [topVibes, setTopVibes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [college, setCollege] = useState<any>(null);
  const [feedType, setFeedType] = useState<'global' | 'college'>('global');

  useEffect(() => {
    fetchAll();
    if (user?.college_id) {
      fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user.college_id}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.college) {
            setCollege(data.college);
          }
        })
        .catch(e => console.error('Error fetching college:', e));
    }
  }, [user?.college_id]);

  const fetchAll = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${sessionToken}` };
      const [c, s, l] = await Promise.all([
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/leaderboard/top-vibes?limit=3`, { headers }).then(r => r.json()),
      ]);
      setConfessions(c.confessions || []);
      setStories(s.users_with_stories || []);
      setTopVibes(l.top_vibes || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ content: text, college_id: feedType === 'college' ? user?.college_id : null }),
      });
      setText('');
      await fetchAll();
    } catch (e) { console.error(e); }
    finally { setPosting(false); }
  };

  const likeC = async (id: string) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${id}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionToken}` } });
      setConfessions(confessions.map(c => c.confession_id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
    } catch (e) { console.error(e); }
  };

  const addStory = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      try {
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/create`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
          body: JSON.stringify({ image: `data:image/jpeg;base64,${result.assets[0].base64}` }),
        });
        Alert.alert('Story posted!', 'Your story will be live for 24 hours');
        await fetchAll();
      } catch (e) { console.error(e); }
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF1B6B" /></View>;

  const filteredConfessions = confessions.filter((c: any) => {
    if (feedType === 'college') {
      return c.college_id === user?.college_id;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#FF1B6B" />}>
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }} />
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>{feedType === 'global' ? '142 Live' : '18 Live'}</Text></View>
          </View>

          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => setFeedType(prev => prev === 'global' ? 'college' : 'global')}
            activeOpacity={0.7}
          >
            <Text style={styles.heroT} numberOfLines={1}>
              {feedType === 'global' ? 'Global' : (college?.short_name || college?.name || 'My Campus')}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#FFF" style={styles.chevronIcon} />
          </TouchableOpacity>

          {/* Stories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 14 }}>
            <TouchableOpacity style={styles.storyItem} onPress={addStory}>
              <View style={styles.addStoryCircle}>
                <Ionicons name="camera" size={28} color="#FF1B6B" />
                <View style={styles.addPlus}><Ionicons name="add" size={14} color="#FFF" /></View>
              </View>
              <Text style={styles.storyName}>Your Story</Text>
            </TouchableOpacity>
            {stories.map((s: any) => (
              <TouchableOpacity key={s.user_id} style={styles.storyItem}>
                <LinearGradient colors={s.has_unviewed ? ['#FF1B6B', '#9D4EDD', '#FFD700'] : ['#3D2B4F', '#3D2B4F']} style={styles.storyRing}>
                  <View style={styles.storyInner}>
                    {s.user_picture ? <Image source={{ uri: s.user_picture }} style={styles.storyImg} /> : <View style={[styles.storyImg, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#FFF', fontWeight: '900', fontSize: 24 }}>{s.user_name?.[0]}</Text></View>}
                  </View>
                </LinearGradient>
                <Text style={styles.storyName} numberOfLines={1}>{s.user_name?.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Slim Line Divider */}
          <View style={styles.divider} />

          {/* Sleek Inline Input */}
          <View style={styles.inlineInputRow}>
            <View style={styles.inlineEmojiCircle}>
              <Text style={{ fontSize: 18 }}>🤫</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              placeholder="Drop an anonymous confession..."
              placeholderTextColor="#6B5B7A"
              value={text}
              onChangeText={setText}
              maxLength={300}
              returnKeyType="send"
              onSubmitEditing={post}
            />
            <TouchableOpacity
              style={[styles.plusButton, !text.trim() && styles.plusButtonDisabled]}
              onPress={post}
              disabled={!text.trim() || posting}
              activeOpacity={0.7}
            >
              {posting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="add" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Slim Line Divider after input */}
          <View style={styles.divider} />

          {/* Top Vibes */}
          {topVibes.length > 0 && (
            <>
              <View style={styles.sectionHead}>
                <View style={styles.trophyIc}><Ionicons name="trophy" size={20} color="#06D6A0" /></View>
                <Text style={styles.sectionT}>Top Vibes</Text>
              </View>
              {topVibes.map((u, i) => (
                <View key={u.user_id} style={styles.vibeCard}>
                  <LinearGradient colors={i === 0 ? ['#FFD700', '#FFA500'] : i === 1 ? ['#C0C0C0', '#A8A8A8'] : ['#CD7F32', '#A05A2C']} style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{i + 1}</Text>
                  </LinearGradient>
                  {u.photos?.[0] || u.picture ? <Image source={{ uri: u.photos?.[0] || u.picture }} style={styles.vibePic} /> : <View style={[styles.vibePic, { backgroundColor: '#3D2B4F' }]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vibeName}>{u.name}</Text>
                    <Text style={styles.vibeBio} numberOfLines={1}>{u.bio || u.course || 'Campus star ⭐'}</Text>
                  </View>
                  <View style={styles.vibeScoreBox}>
                    <Ionicons name="sparkles" size={14} color="#FFD700" />
                    <Text style={styles.vibeScoreT}>{u.vibe_score?.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Confessions */}
          <View style={styles.sectionHead}>
            <Ionicons name="megaphone" size={20} color="#FF1B6B" />
            <Text style={styles.sectionT}>Confessions</Text>
          </View>
          {filteredConfessions.map((c: any) => (
            <View key={c.confession_id} style={styles.confCard}>
              <View style={styles.confTop}>
                <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.confAv}>
                  <Text style={styles.confAvT}>🤫</Text>
                </LinearGradient>
                <View style={styles.confAnon}>
                  <Text style={styles.confAnonT}>Anonymous • {c.college_id === user?.college_id ? (college?.short_name || 'Campus') : 'Global'}</Text>
                </View>
                <Text style={styles.confTime}>{c.created_at && formatDistanceToNow(new Date(c.created_at), { addSuffix: false })}</Text>
              </View>
              <Text style={styles.confTxt}>{c.content}</Text>
              <View style={styles.confActions}>
                <TouchableOpacity style={styles.confAct} onPress={() => likeC(c.confession_id)}>
                  <Ionicons name="heart" size={18} color="#FF1B6B" />
                  <Text style={styles.confActT}>{c.likes || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confAct}>
                  <Ionicons name="chatbubble" size={16} color="#A899B8" />
                  <Text style={styles.confActT}>{c.comments || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3D1A2E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#FF1B6B' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF1B6B' },
  liveText: { color: '#FF1B6B', fontSize: 12, fontWeight: '900' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  heroT: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  chevronIcon: { marginLeft: 8 },
  storiesScroll: { flexGrow: 0, marginBottom: 16 },
  storyItem: { alignItems: 'center', gap: 6, width: 72 },
  addStoryCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FF1B6B', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', position: 'relative' },
  addPlus: { position: 'absolute', bottom: 0, right: 4, backgroundColor: '#FF1B6B', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000000' },
  storyRing: { width: 72, height: 72, borderRadius: 36, padding: 2, alignItems: 'center', justifyContent: 'center' },
  storyInner: { width: '100%', height: '100%', borderRadius: 36, backgroundColor: '#000000', padding: 2 },
  storyImg: { width: '100%', height: '100%', borderRadius: 32 },
  storyName: { color: '#C5B6D6', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.15)', marginHorizontal: 16, marginVertical: 12 },
  inlineInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  inlineEmojiCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  inlineInput: { flex: 1, color: '#FFF', fontSize: 15, paddingVertical: 8 },
  plusButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' },
  plusButtonDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.2)', opacity: 0.5 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  trophyIc: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#06D6A022', alignItems: 'center', justifyContent: 'center' },
  sectionT: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  vibeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6, marginHorizontal: 16, padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 18, borderWidth: 1, borderColor: '#2A1B3D' },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  vibePic: { width: 50, height: 50, borderRadius: 25 },
  vibeName: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  vibeBio: { color: '#A899B8', fontSize: 12 },
  vibeScoreBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70022', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  vibeScoreT: { color: '#FFD700', fontWeight: '900' },
  confCard: { marginVertical: 8, marginHorizontal: 16, padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20, borderWidth: 1, borderColor: '#2A1B3D' },
  confTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  confAv: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  confAvT: { fontSize: 16, color: '#FFF' },
  confAnon: { backgroundColor: '#2A1B3D', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  confAnonT: { color: '#A899B8', fontSize: 12, fontWeight: '700' },
  confTime: { color: '#6B5B7A', fontSize: 12, marginLeft: 'auto' },
  confTxt: { color: '#FFF', fontSize: 16, lineHeight: 22 },
  confActions: { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  confAct: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confActT: { color: '#A899B8', fontWeight: '600' },
});
