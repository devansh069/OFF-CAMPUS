import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Dimensions, 
  ScrollView,
  Animated
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// High quality Unsplash URLs
const postsTemplates = [
  {
    category: 'Gaming',
    images: [
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Setup is ready, ranking up tonight! 🎮🔥`,
      `Nothing beats a retro gaming weekend.`
    ]
  },
  {
    category: 'Coding',
    images: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Building the future, one line of code at a time 💻`,
      `Debug mode: ON. Caffeine level: Critical.`
    ]
  },
  {
    category: 'Music',
    images: [
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Lost in the rhythms of the city 🎧🎧`,
      `Jamming session after a long day of lectures 🎸`
    ]
  },
  {
    category: 'Fitness',
    images: [
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Consistency > Motivation. Early morning grind! 💪`,
      `Running away from my responsibilities like... 🏃‍♂️`
    ]
  },
  {
    category: 'Reading',
    images: [
      'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Getting lost in a completely different world today 📖`,
      `Rainy days and a good book 🌧️☕`
    ]
  },
  {
    category: 'Art',
    images: [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Expressing what words cannot 🎨✨`,
      `Messy hands, happy heart.`
    ]
  },
  {
    category: 'Photography',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Capturing moments that will never happen again 📷`,
      `Chasing the golden hour.`
    ]
  }
];

const defaultTemplates = [
  {
    images: [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=80'
    ],
    captions: [
      `Campus life is testing my limits but we keep going! 🙌`,
      `Out with friends, making memories!`
    ]
  }
];

const getUserMockPosts = (profile: any) => {
  const interests = profile.interests || [];
  let matched = postsTemplates.filter(t => 
    interests.some((i: string) => i.toLowerCase() === t.category.toLowerCase())
  );
  if (matched.length === 0) {
    matched = defaultTemplates;
  }
  const posts: any[] = [];
  const numPosts = 2;
  for (let i = 0; i < numPosts; i++) {
    const template = matched[i % matched.length];
    const imageList = template.images;
    const captionList = template.captions;
    posts.push({
      image: imageList[i % imageList.length],
      caption: captionList[i % captionList.length],
      likes: Math.floor(Math.random() * 80) + 12,
      comments: Math.floor(Math.random() * 12) + 2
    });
  }
  return posts;
};

export default function Discover() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  
  // Data state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState<any>(null);
  const [college, setCollege] = useState<any>(null);
  
  // Navigation & Filter state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [globalMode, setGlobalMode] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'both'>('both');

  // Animation Refs
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => { 
    fetchProfiles(); 
    if (user?.college_id) {
      fetchCollege();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      console.log('fetchProfiles (frontend): Fetching profiles...');
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles`, { 
        headers: { 'Authorization': `Bearer ${sessionToken}` } 
      });
      const d = await r.json();
      console.log('fetchProfiles (frontend): Response count:', d.profiles ? d.profiles.length : 0);
      setProfiles(d.profiles || []);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchCollege = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user?.college_id}`);
      const data = await response.json();
      setCollege(data.college);
    } catch (error) {
      console.error('Error fetching college:', error);
    }
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
    } catch (e) { 
      console.error(e); 
    }
  };

  const handlePassAndNext = (targetUserId: string) => {
    // 1. Slide out to the left
    Animated.timing(slideAnim, {
      toValue: -Dimensions.get('window').width,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      // 2. Perform backend pass logic in background
      handlePass(targetUserId);
      // 3. Move to next user
      setCurrentIndex(prev => prev + 1);
      // 4. Scroll to top of the next card
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // 5. Instantly place the new card on the right
      slideAnim.setValue(Dimensions.get('window').width);
      // 6. Slide in from the right
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleLikeAndNext = (targetUserId: string) => {
    // 1. Slide out to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      // 2. Perform backend like logic in background
      handleLike(targetUserId);
      // 3. Move to next user
      setCurrentIndex(prev => prev + 1);
      // 4. Scroll to top of the next card
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      // 5. Instantly place the new card on the right
      slideAnim.setValue(Dimensions.get('window').width);
      // 6. Slide in from the right
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 45,
        useNativeDriver: true,
      }).start();
    });
  };

  // Locally filtered list
  const getFilteredProfiles = () => {
    let result = [...profiles];
    if (genderFilter !== 'both') {
      result = result.filter(p => p.gender === genderFilter);
    }
    return result;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF1B6B" />
      </View>
    );
  }

  const activeProfiles = getFilteredProfiles();
  const currentProfile = activeProfiles[currentIndex];
  const hasProfile = activeProfiles.length > 0 && currentIndex < activeProfiles.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>
        
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Ionicons name="flame" size={24} color="#FF1B6B" />
            <Text style={styles.logoText}>mismatched</Text>
          </View>
          <TouchableOpacity 
            style={styles.modeBtn}
            onPress={() => setGlobalMode(!globalMode)}
            activeOpacity={0.8}
          >
            <Ionicons name="globe" size={14} color="#FFD700" />
            <Text style={styles.modeText}>{globalMode ? 'Global' : (college?.short_name || 'My Campus')}</Text>
          </TouchableOpacity>
        </View>

        {/* Gender Filter Selector */}
        <View style={styles.filterContainer}>
          <View style={styles.filterLabelContainer}>
            <Ionicons name="options-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.filterLabel}>Show Me:</Text>
          </View>
          <View style={styles.filterButtonsRow}>
            {(['male', 'female', 'both'] as const).map((option) => {
              const isActive = genderFilter === option;
              const label = option === 'male' ? 'Male' : option === 'female' ? 'Female' : 'Both';
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                  onPress={() => {
                    setGenderFilter(option);
                    setCurrentIndex(0); // Reset index on filter change
                  }}
                  activeOpacity={0.8}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#FF1B6B', '#9D4EDD']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.filterBtnGrad}
                    >
                      <Text style={styles.filterBtnTextActive}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.filterBtnText}>{label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Profiles Container / Card stack */}
        {hasProfile ? (
          <View style={styles.cardWrapper}>
            <Animated.View style={[styles.cardContainer, { transform: [{ translateX: slideAnim }] }]}>
              <ScrollView 
                ref={scrollViewRef}
                style={styles.profileScrollView}
                contentContainerStyle={styles.profileScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Standalone Photo Card */}
                <View style={styles.photoCard}>
                  <View style={styles.photoContainer}>
                    <Image 
                      source={{ uri: currentProfile.photos?.[0] || currentProfile.picture }} 
                      style={styles.profilePhoto} 
                    />
                    
                    {/* Vibe Badge */}
                    <View style={styles.cardVibeBadge}>
                      <Ionicons name="sparkles" size={12} color="#FFD700" />
                      <Text style={styles.cardVibeText}>{currentProfile.vibe_score?.toFixed(1)} VIBE</Text>
                    </View>

                    {/* On Campus Badge */}
                    {currentProfile.is_on_campus && (
                      <View style={styles.cardCampusBadge}>
                        <Text style={styles.cardCampusText}>ON CAMPUS</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 2. Standalone Details Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.profileDetails}>
                    {/* Name & Age */}
                    <View style={styles.cardNameRow}>
                      <Text style={styles.cardName}>{currentProfile.name}, {currentProfile.age}</Text>
                      {currentProfile.verification_status === 'verified' && (
                        <Ionicons name="checkmark-circle" size={18} color="#00B0FF" style={{ marginLeft: 6 }} />
                      )}
                    </View>

                    {/* College / Course */}
                    {(currentProfile.year || currentProfile.course) && (
                      <View style={styles.cardCollegeRow}>
                        <Ionicons name="school-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
                        <Text style={styles.cardCollegeText}>{[currentProfile.course, currentProfile.year].filter(Boolean).join(' • ')}</Text>
                      </View>
                    )}

                    {/* Bio */}
                    {currentProfile.bio && <Text style={styles.cardBio}>{currentProfile.bio}</Text>}

                    {/* Looking For */}
                    {currentProfile.looking_for && (
                      <View style={styles.cardLookingChip}>
                        <Ionicons name="heart" size={12} color="#FF1B6B" />
                        <Text style={styles.cardLookingText}>Looking for {currentProfile.looking_for}</Text>
                      </View>
                    )}

                    {/* Interests / Tags */}
                    {currentProfile.interests?.length > 0 && (
                      <View style={styles.cardTagsRow}>
                        {currentProfile.interests.map((i: string) => (
                          <View key={i} style={styles.cardTag}>
                            <Text style={styles.cardTagText}>{i}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* 3. Standalone Spotify Card (if present) */}
                {currentProfile.spotify_data?.top_tracks?.length > 0 && (
                  <View style={styles.spotifyCard}>
                    <Text style={styles.sectionTitle}>Top Spotify Tracks 🎵</Text>
                    {currentProfile.spotify_data.top_tracks.slice(0, 3).map((track: any, idx: number) => (
                      <View key={idx} style={styles.spotifyTrackRow}>
                        <Ionicons name="play" size={16} color="#1DB954" />
                        <View style={styles.spotifyTrackInfo}>
                          <Text style={styles.spotifyTrackName}>{track.name}</Text>
                          <Text style={styles.spotifyArtistName}>{track.artist}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 4. Moments & Posts Section */}
                <View style={styles.postsSection}>
                  <Text style={styles.sectionTitle}>Moments & Posts 📸</Text>
                  {getUserMockPosts(currentProfile).map((post: any, idx: number) => (
                    <View key={idx} style={styles.postCard}>
                      <Image source={{ uri: post.image }} style={styles.postImage} />
                      <Text style={styles.postCaption}>{post.caption}</Text>
                      <View style={styles.postFooter}>
                        <View style={styles.postFooterStat}>
                          <Ionicons name="heart-outline" size={16} color="#FF1B6B" />
                          <Text style={styles.postFooterText}>{post.likes} likes</Text>
                        </View>
                        <View style={styles.postFooterStat}>
                          <Ionicons name="chatbubble-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                          <Text style={styles.postFooterText}>{post.comments} comments</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>
            
            {/* Floating Action Overlay Buttons */}
            <View style={styles.floatingActions}>
              <TouchableOpacity 
                style={[styles.floatingBtn, styles.floatingNope]} 
                onPress={() => handlePassAndNext(currentProfile.user_id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={28} color="#FF453A" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.floatingBtn, styles.floatingLike]} 
                onPress={() => handleLikeAndNext(currentProfile.user_id)}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={28} color="#FF1B6B" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={80} color="rgba(255, 255, 255, 0.15)" />
            <Text style={styles.emptyT}>No more profiles found</Text>
            <Text style={styles.emptyS}>Try changing your filter settings or hit refresh to check again</Text>
            <TouchableOpacity 
              style={styles.refreshBtn} 
              onPress={async () => {
                setLoading(true);
                await fetchProfiles();
                setCurrentIndex(0);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.refreshText}>Refresh Feed</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Match Screen Overlay */}
        {showMatch && (
          <View style={styles.matchOverlay}>
            <LinearGradient 
              colors={['#FF1B6B', '#9D4EDD']} 
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.matchInner}
            >
              <Text style={styles.matchTitle}>IT'S A MATCH! 💥</Text>
              <Text style={styles.matchSub}>You and {showMatch.name} liked each other</Text>
              <Image source={{ uri: showMatch.photos?.[0] || showMatch.picture }} style={styles.matchPic} />
              <View style={styles.matchActions}>
                <TouchableOpacity 
                  style={styles.matchBtn} 
                  onPress={() => { 
                    setShowMatch(null); 
                    router.push(`/chat/${showMatch.user_id}`); 
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.matchBtnText}>Say Hi 👋</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.matchBtnSecondary} 
                  onPress={() => setShowMatch(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.matchBtnTextSecondary}>Keep Swiping</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  logoContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40 
  },
  logoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modeBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)' 
  },
  modeText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  
  // Filter Selector
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    height: 30,
    justifyContent: 'center',
  },
  filterBtnActive: {
    borderWidth: 0,
  },
  filterBtnGrad: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  filterBtnTextActive: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Card Structure
  cardWrapper: {
    flex: 1,
    position: 'relative',
  },
  cardContainer: {
    flex: 1,
  },
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 130, // Space for floating buttons overlay
  },
  photoCard: {
    position: 'relative', 
    width: '100%', 
    aspectRatio: 0.85, // Taller portrait display
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  photoContainer: { 
    width: '100%', 
    height: '100%',
    position: 'relative',
  },
  profilePhoto: { width: '100%', height: '100%' },
  
  cardVibeBadge: { 
    position: 'absolute', 
    top: 16, 
    left: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(0,0,0,0.65)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardVibeText: { color: '#FFD700', fontSize: 12, fontWeight: '900' },
  cardCampusBadge: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: 'rgba(6, 214, 160, 0.12)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 214, 160, 0.3)',
  },
  cardCampusText: { color: '#06D6A0', fontSize: 10, fontWeight: '900' },
  
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
    marginBottom: 16,
  },
  profileDetails: { 
    gap: 8 
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  cardCollegeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardCollegeText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 14, fontWeight: '600' },
  cardBio: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  
  cardLookingChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(255, 27, 107, 0.08)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 16, 
    alignSelf: 'flex-start', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 27, 107, 0.25)', 
    marginTop: 4 
  },
  cardLookingText: { color: '#FF1B6B', fontSize: 12, fontWeight: '700' },
  
  cardTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  cardTag: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)' 
  },
  cardTagText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: '600' },
  
  // Section layout
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2
  },

  // Spotify Section
  spotifyCard: {
    backgroundColor: 'rgba(29, 185, 84, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.15)',
    padding: 20,
    marginBottom: 16,
  },
  spotifyTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10
  },
  spotifyTrackInfo: {
    flex: 1
  },
  spotifyTrackName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  spotifyArtistName: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1
  },

  // Posts layout
  postsSection: {
    marginTop: 8
  },
  postCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginBottom: 16
  },
  postImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover'
  },
  postCaption: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    padding: 14,
    lineHeight: 20
  },
  postFooter: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 16
  },
  postFooterStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  postFooterText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600'
  },

  // Floating Actions Row Overlay
  floatingActions: { 
    position: 'absolute', 
    bottom: 24, 
    left: 0,
    right: 0,
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 28, 
    zIndex: 100 
  },
  floatingBtn: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8
  },
  floatingNope: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  floatingLike: { 
    backgroundColor: 'rgba(255, 27, 107, 0.05)', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 27, 107, 0.25)'
  },
  
  // Empty State
  empty: { flex: 1, padding: 40, alignItems: 'center', gap: 12, justifyContent: 'center', backgroundColor: '#000000' },
  emptyT: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  emptyS: { color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  refreshBtn: { 
    flexDirection: 'row', 
    gap: 6, 
    alignItems: 'center', 
    backgroundColor: '#FF1B6B', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 24, 
    marginTop: 16 
  },
  refreshText: { color: '#FFF', fontWeight: '700' },
  
  // Match Overlay
  matchOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.92)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20,
    zIndex: 200
  },
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
