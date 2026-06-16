import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Dimensions, 
  FlatList, 
  RefreshControl,
  TextInput,
  ScrollView
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POPULAR_INTERESTS = ['All', 'Gaming', 'Coding', 'Music', 'Fitness', 'Art', 'Reading', 'Photography', 'Dance'];

export default function Discover() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  
  // Data state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMatch, setShowMatch] = useState<any>(null);
  
  // Filters & Sorting state
  const [globalMode, setGlobalMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('All');
  const [sortBy, setSortBy] = useState<'default' | 'vibe' | 'age'>('default');

  useEffect(() => { 
    fetchProfiles(); 
  }, []);

  const fetchProfiles = async () => {
    try {
      console.log('fetchProfiles (frontend): Fetching profiles...');
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles`, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      const d = await r.json();
      console.log('fetchProfiles (frontend): Response count:', d.profiles ? d.profiles.length : 0);
      setProfiles(d.profiles || []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfiles();
    setRefreshing(false);
  };

  const handleLike = async (targetUserId: string) => {
    try {
      const targetProfile = profiles.find(p => p.user_id === targetUserId);
      
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const d = await r.json();
      
      if (d.is_match && targetProfile) {
        setShowMatch(targetProfile);
      }
      
      // Filter out liked user from the feed
      setProfiles(prev => prev.filter(p => p.user_id !== targetUserId));
    } catch (e) { 
      console.error(e); 
    }
  };

  const handlePass = async (targetUserId: string) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      
      // Filter out passed user from the feed
      setProfiles(prev => prev.filter(p => p.user_id !== targetUserId));
    } catch (e) { 
      console.error(e); 
    }
  };

  // Get locally filtered and sorted list of profiles
  const getFilteredProfiles = () => {
    let result = [...profiles];

    // 1. Apply Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.course?.toLowerCase().includes(query) ||
        p.bio?.toLowerCase().includes(query) ||
        p.interests?.some((i: string) => i.toLowerCase().includes(query))
      );
    }

    // 2. Apply Interest category filter
    if (selectedInterest !== 'All') {
      result = result.filter(p => 
        p.interests?.some((i: string) => i.toLowerCase() === selectedInterest.toLowerCase())
      );
    }

    // 3. Apply Sorting
    if (sortBy === 'vibe') {
      result.sort((a, b) => (b.vibe_score || 0) - (a.vibe_score || 0));
    } else if (sortBy === 'age') {
      result.sort((a, b) => (a.age || 0) - (b.age || 0));
    }

    return result;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F43F5E" />
      </View>
    );
  }

  const activeProfiles = getFilteredProfiles();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0C0D18', '#050507']} style={styles.bg}>
        
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
          <TouchableOpacity 
            style={[styles.modeBtn, user?.is_premium && globalMode && styles.modeBtnActive]}
            onPress={() => user?.is_premium ? setGlobalMode(!globalMode) : router.push('/premium')}
          >
            <Ionicons name={user?.is_premium ? 'globe' : 'diamond'} size={14} color="#FFD700" />
            <Text style={styles.modeText}>{user?.is_premium ? (globalMode ? 'Global' : 'Campus') : 'Go Global'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Sort Row */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#6B7280" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, course, tag..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Button */}
          <TouchableOpacity 
            style={[styles.sortBtn, sortBy !== 'default' && styles.sortBtnActive]}
            onPress={() => {
              if (sortBy === 'default') setSortBy('vibe');
              else if (sortBy === 'vibe') setSortBy('age');
              else setSortBy('default');
            }}
          >
            <Ionicons 
              name={sortBy === 'vibe' ? 'sparkles' : sortBy === 'age' ? 'calendar-outline' : 'funnel-outline'} 
              size={16} 
              color={sortBy !== 'default' ? '#07080F' : '#E2E8F0'} 
            />
            <Text style={[styles.sortText, sortBy !== 'default' && styles.sortTextActive]}>
              {sortBy === 'vibe' ? 'Top Vibe' : sortBy === 'age' ? 'Age' : 'Sort'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Interest Pills Horizontal Bar */}
        <View style={styles.pillsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
            {POPULAR_INTERESTS.map((interest) => {
              const isActive = selectedInterest === interest;
              return (
                <TouchableOpacity
                  key={interest}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => setSelectedInterest(interest)}
                >
                  {isActive ? (
                    <LinearGradient 
                      colors={['#3B82F6', '#8B5CF6', '#EF4444']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }}
                      style={styles.pillGrad}
                    >
                      <Text style={styles.pillTextActive}>{interest}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.pillText}>{interest}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Scrollable Feed List */}
        <FlatList
          data={activeProfiles}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F43F5E" />
          }
          renderItem={({ item }) => (
            <View style={styles.profileCard}>
              
              {/* Photo Area */}
              <View style={styles.photoContainer}>
                <Image source={{ uri: item.photos?.[0] || item.picture }} style={styles.profilePhoto} />
                
                {/* Vibe Badge */}
                <View style={styles.cardVibeBadge}>
                  <Ionicons name="sparkles" size={12} color="#FFD700" />
                  <Text style={styles.cardVibeText}>{item.vibe_score?.toFixed(1)} VIBE</Text>
                </View>

                {/* On Campus Badge */}
                {item.is_on_campus && (
                  <View style={styles.cardCampusBadge}>
                    <Text style={styles.cardCampusText}>ON CAMPUS</Text>
                  </View>
                )}
              </View>

              {/* Details Area */}
              <View style={styles.cardDetails}>
                
                {/* Name & Age */}
                <View style={styles.cardNameRow}>
                  <Text style={styles.cardName}>{item.name}, {item.age}</Text>
                  {item.verification_status === 'verified' && (
                    <Ionicons name="checkmark-circle" size={18} color="#4FC3F7" style={{ marginLeft: 6 }} />
                  )}
                </View>

                {/* College / Course */}
                {(item.year || item.course) && (
                  <View style={styles.cardCollegeRow}>
                    <Ionicons name="school-outline" size={14} color="#94A3B8" />
                    <Text style={styles.cardCollegeText}>{[item.course, item.year].filter(Boolean).join(' • ')}</Text>
                  </View>
                )}

                {/* Bio */}
                {item.bio && <Text style={styles.cardBio}>{item.bio}</Text>}

                {/* Looking For */}
                {item.looking_for && (
                  <View style={styles.cardLookingChip}>
                    <Ionicons name="heart" size={12} color="#F43F5E" />
                    <Text style={styles.cardLookingText}>Looking for {item.looking_for}</Text>
                  </View>
                )}

                {/* Interests / Tags */}
                {item.interests?.length > 0 && (
                  <View style={styles.cardTagsRow}>
                    {item.interests.slice(0, 4).map((i: string) => (
                      <View key={i} style={styles.cardTag}>
                        <Text style={styles.cardTagText}>{i}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons inside Card */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.cardActionBtn, styles.cardNopeBtn]} onPress={() => handlePass(item.user_id)}>
                    <Ionicons name="close" size={24} color="#F43F5E" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cardActionBtn, styles.cardSuperBtn]}>
                    <Ionicons name="star" size={20} color="#6366F1" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cardActionBtn, styles.cardLikeBtn]} onPress={() => handleLike(item.user_id)}>
                    <LinearGradient colors={['#3B82F6', '#8B5CF6', '#EF4444']} style={styles.cardLikeGrad}>
                      <Ionicons name="heart" size={24} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={80} color="#3D2B4F" />
              <Text style={styles.emptyT}>No profiles match your filter</Text>
              <Text style={styles.emptyS}>Try changing your search keywords, interest pills, or hit Refresh</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={fetchProfiles}>
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Match Screen Overlay */}
        {showMatch && (
          <View style={styles.matchOverlay}>
            <LinearGradient colors={['#3B82F6', '#8B5CF6', '#EF4444']} style={styles.matchInner}>
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
  container: { flex: 1, backgroundColor: '#07080F' },
  bg: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07080F' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logoImage: { width: 130, height: 40 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#121324', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2E3048' },
  modeBtnActive: { backgroundColor: '#FFD700' },
  modeText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  listContainer: { padding: 16, paddingBottom: 40 },

  // Search Container
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 10, alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#121324', borderRadius: 20, borderWidth: 1, borderColor: '#1E2235', paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13, height: '100%', paddingVertical: 0 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#121324', borderRadius: 20, borderWidth: 1, borderColor: '#1E2235', paddingHorizontal: 12, height: 44 },
  sortBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  sortText: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  sortTextActive: { color: '#07080F' },

  // Pills Container
  pillsContainer: { marginBottom: 12 },
  pillsScroll: { paddingHorizontal: 16, gap: 8 },
  pill: { backgroundColor: '#121324', borderRadius: 16, borderWidth: 1, borderColor: '#1E2235', overflow: 'hidden', height: 34, justifyContent: 'center' },
  pillActive: { borderWidth: 0 },
  pillGrad: { paddingHorizontal: 14, height: '100%', justifyContent: 'center', alignItems: 'center' },
  pillText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', paddingHorizontal: 14 },
  pillTextActive: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  
  // Card Styles
  profileCard: { 
    backgroundColor: '#121324', 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#1E2235', 
    overflow: 'hidden', 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6
  },
  photoContainer: { position: 'relative', width: '100%', aspectRatio: 1.1 },
  profilePhoto: { width: '100%', height: '100%' },
  
  cardVibeBadge: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  cardVibeText: { color: '#FFD700', fontSize: 12, fontWeight: '900' },
  cardCampusBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  cardCampusText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  
  cardDetails: { padding: 20, gap: 8 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  cardCollegeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardCollegeText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  cardBio: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, marginTop: 4 },
  
  cardLookingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(244,63,94,0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(244,63,94,0.5)', marginTop: 4 },
  cardLookingText: { color: '#FDA4AF', fontSize: 12, fontWeight: '700' },
  
  cardTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  cardTag: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardTagText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  
  // Actions Row inside Card
  cardActions: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: '#1E2235', paddingTop: 16 },
  cardActionBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  cardNopeBtn: { backgroundColor: '#1A1B2D', borderWidth: 1, borderColor: '#2E3048' },
  cardSuperBtn: { backgroundColor: '#1A1B2D', borderWidth: 1, borderColor: '#2E3048' },
  cardLikeBtn: { borderRadius: 25, overflow: 'hidden' },
  cardLikeGrad: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  
  // Empty State
  empty: { flex: 1, padding: 40, alignItems: 'center', gap: 12, justifyContent: 'center', minHeight: 350 },
  emptyT: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  emptyS: { color: '#94A3B8', textAlign: 'center', fontSize: 14 },
  refreshBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#F43F5E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 16 },
  refreshText: { color: '#FFF', fontWeight: '700' },
  
  // Match Overlay
  matchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  matchInner: { padding: 30, borderRadius: 24, alignItems: 'center', gap: 16, width: '100%' },
  matchTitle: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  matchSub: { color: '#FFF', fontSize: 14, opacity: 0.95 },
  matchPic: { width: 180, height: 180, borderRadius: 90, borderWidth: 5, borderColor: '#FFF' },
  matchActions: { gap: 12, width: '100%' },
  matchBtn: { backgroundColor: '#FFF', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  matchBtnText: { color: '#F43F5E', fontWeight: '900', fontSize: 16 },
  matchBtnSecondary: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  matchBtnTextSecondary: { color: '#FFF', fontWeight: '700' },
});
