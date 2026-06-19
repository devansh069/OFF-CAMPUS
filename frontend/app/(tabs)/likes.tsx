import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Alert, Modal } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// High fidelity mock profiles for received likes fallback/dummy mode
const MOCK_LIKES = [
  {
    user_id: 'usr_mock_priya',
    name: 'Priya Sharma',
    age: 20,
    gender: 'female',
    college_id: 'col_lsr',
    course: 'English Hons',
    year: '2nd Year',
    bio: 'Love reading classics, late-night coffee dates, and indie folk music. Let’s explore Delhi’s best book cafes together! ☕📖',
    interests: ['Reading', 'Coffee', 'Music', 'Cafes', 'Art'],
    looking_for: 'dating',
    height: 162,
    religion: 'Hindu',
    drink: 'no',
    smoke: 'no',
    weed: 'no',
    location: 'Saket',
    state: 'Delhi',
    vibe_score: 4.8,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=600&auto=format&fit=crop'
    ],
    spotify_data: {
      top_tracks: [
        { name: 'Cardigan', artist: 'Taylor Swift' },
        { name: 'Let It Go', artist: 'James Bay' },
        { name: 'Night Changes', artist: 'One Direction' }
      ]
    },
    verification_status: 'verified',
    is_on_campus: true
  },
  {
    user_id: 'usr_mock_aarav',
    name: 'Aarav Mehta',
    age: 21,
    gender: 'male',
    college_id: 'col_stephens',
    course: 'B.Sc. Chemistry',
    year: '3rd Year',
    bio: 'Football enthusiast, guitar player, and amateur stargazer. Down to grab food or play a match anytime! ⚽🎸',
    interests: ['Football', 'Guitar', 'Stargazing', 'Gaming', 'Fitness'],
    looking_for: 'friends',
    height: 182,
    religion: 'Hindu',
    drink: 'yes',
    smoke: 'no',
    weed: 'no',
    location: 'Hauz Khas',
    state: 'Delhi',
    vibe_score: 4.6,
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop'
    ],
    spotify_data: {
      top_tracks: [
        { name: 'Yellow', artist: 'Coldplay' },
        { name: 'Starboy', artist: 'The Weeknd' }
      ]
    },
    verification_status: 'verified',
    is_on_campus: false
  },
  {
    user_id: 'usr_mock_sneha',
    name: 'Sneha Roy',
    age: 19,
    gender: 'female',
    college_id: 'col_vips',
    course: 'BBA',
    year: '1st Year',
    bio: 'Classical dancer, foodie, and dog lover. Always up for food crawls and weekend road trips! 🐕💃',
    interests: ['Dance', 'Foodie', 'Dogs', 'Road trips', 'Travel'],
    looking_for: 'dating',
    height: 158,
    religion: 'Hindu',
    drink: 'no',
    smoke: 'no',
    weed: 'no',
    location: 'Dwarka',
    state: 'Delhi',
    vibe_score: 4.9,
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop'
    ],
    spotify_data: {
      top_tracks: [
        { name: 'Cruel Summer', artist: 'Taylor Swift' },
        { name: 'As It Was', artist: 'Harry Styles' }
      ]
    },
    verification_status: 'verified',
    is_on_campus: true
  }
];

// Helper methods mirroring discover.tsx formatting
const getProfilePhotos = (profile: any) => {
  const photos = [...(profile.photos || [])];
  if (photos.length === 0) {
    photos.push(profile.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop');
  }
  return photos;
};

const getCollegeName = (profile: any) => {
  if (profile.college?.short_name) return profile.college.short_name;
  if (profile.college_id) {
    const parts = profile.college_id.split('_');
    if (parts.length > 1) {
      const name = parts[1];
      if (name === 'lsr') return 'LSR';
      if (name === 'mait') return 'MAIT';
      if (name === 'iitd') return 'IITD';
      if (name === 'stephens') return 'Stephens';
      if (name === 'vips') return 'VIPS';
      if (name === 'nsut') return 'NSUT';
      if (name === 'hansraj') return 'Hansraj';
      if (name === 'dtu') return 'DTU';
      if (name === 'miranda') return 'Miranda';
      return name.toUpperCase();
    }
  }
  return 'VIPS';
};

const cmToFeetInches = (cm: number) => {
  const inchesTotal = cm / 2.54;
  const feet = Math.floor(inchesTotal / 12);
  const inches = Math.round(inchesTotal % 12);
  if (inches === 12) return `${feet + 1}' 0"`;
  return `${feet}' ${inches}"`;
};

const getScrollableItems = (profile: any) => {
  const height = profile.height || 165;
  const religion = profile.religion || 'Hindu';
  const looking = profile.looking_for || 'dating';
  const drink = profile.drink || 'no';
  const smoke = profile.smoke || 'no';
  const weed = profile.weed || 'no';
  const location = profile.location || 'Saket';
  const state = profile.state || 'Delhi';

  const genderLabel = profile.gender 
    ? (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)) 
    : 'Man';

  const heightVal = cmToFeetInches(height);
  const locationLabel = `${location}, ${state}`;
  
  const lookingLabel = looking === 'friends' ? 'Friends' : looking === 'dating' ? 'Dating' : looking === 'all' ? 'Dating/Friends' : looking;
  const drinkLabel = drink.toLowerCase() === 'yes' ? 'Drinks' : 'Drink: No';
  const smokeLabel = smoke.toLowerCase() === 'yes' ? 'Smoker' : 'Smoke: No';
  const weedLabel = weed.toLowerCase() === 'yes' ? 'Weed' : 'Weed: No';

  return [
    { icon: (profile.gender === 'female' ? 'female-outline' : profile.gender === 'male' ? 'male-outline' : 'person-outline'), text: genderLabel },
    { icon: 'resize-outline', text: heightVal },
    { icon: 'location-outline', text: locationLabel },
    { icon: 'heart-outline', text: lookingLabel },
    { icon: 'sparkles-outline', text: religion },
    { icon: 'wine-outline', text: drinkLabel },
    { icon: 'flame-outline', text: smokeLabel },
    { icon: 'leaf-outline', text: weedLabel },
  ];
};

export default function Likes() {
  const { sessionToken } = useAuth();
  const router = useRouter();
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState<any | null>(null);

  useEffect(() => {
    fetchLikes();
  }, [sessionToken]);

  const fetchLikes = async () => {
    if (sessionToken === 'dummy_token') {
      setLikes(MOCK_LIKES);
      setLoading(false);
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/likes-received`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (!r.ok) throw new Error('Failed to fetch incoming likes');
      const d = await r.json();
      setLikes(d.likes && d.likes.length > 0 ? d.likes : MOCK_LIKES);
    } catch (e: any) {
      console.warn('fetchLikes failed, using mock likes instead:', e.message);
      setLikes(MOCK_LIKES);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (targetUserId: string) => {
    try {
      const targetProfile = likes.find(p => p.user_id === targetUserId);
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const d = await r.json();
      
      // Filter out the resolved profile immediately
      setLikes(prev => prev.filter(p => p.user_id !== targetUserId));

      if (d.is_match && targetProfile) {
        setShowMatch(targetProfile);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to accept like');
    }
  };

  const handleReject = async (targetUserId: string) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      
      // Filter out the resolved profile immediately
      setLikes(prev => prev.filter(p => p.user_id !== targetUserId));
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pass profile');
    }
  };

  const showLockedAlert = () => {
    Alert.alert(
      'Locked Profile 🔒',
      'Decide on the current profile (Accept or Reject) to reveal this one!',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F43F5E" />
        </View>
      </SafeAreaView>
    );
  }

  const activeProfile = likes.length > 0 ? likes[0] : null;
  const remainingLikes = likes.slice(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greet}>People Who</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Liked You 💖</Text>
            {likes.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{likes.length}</Text>
              </View>
            )}
          </View>
        </View>

        {likes.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyHeartGlow}>
              <Ionicons name="heart-dislike-outline" size={80} color="rgba(244, 63, 94, 0.4)" />
            </View>
            <Text style={styles.emptyT}>No Likes Yet</Text>
            <Text style={styles.emptyS}>
              Swipe on the Vibe tab and keep your profile verified to stand out and attract more campus mates!
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.replace('/discover')}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreText}>Start Swiping 🚀</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
            {/* 1. ACTIVE PROFILE SECTION (INDEX 0) */}
            {activeProfile && (
              <View style={styles.activeSection}>
                <Text style={styles.sectionHeading}>Current Profile</Text>
                
                {/* Active User Main Photo Card */}
                <View style={styles.activeCard}>
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: getProfilePhotos(activeProfile)[0] }}
                      style={styles.mainPhoto}
                    />
                    
                    {/* On Campus Indicator */}
                    {activeProfile.is_on_campus && (
                      <View style={styles.campusBadge}>
                        <Text style={styles.campusText}>ON CAMPUS</Text>
                      </View>
                    )}
                  </View>

                  {/* Active User Details */}
                  <View style={styles.detailsCard}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{activeProfile.name}, {activeProfile.age}</Text>
                      {activeProfile.verification_status === 'verified' && (
                        <Ionicons name="checkmark-circle" size={18} color="#00B0FF" style={{ marginLeft: 6 }} />
                      )}
                    </View>

                    {/* College & Course Info */}
                    <View style={styles.collegeRow}>
                      <Ionicons name="school-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
                      <Text style={styles.collegeText}>
                        {[
                          getCollegeName(activeProfile),
                          activeProfile.course,
                          activeProfile.year
                        ].filter(Boolean).join(' • ')}
                      </Text>
                    </View>

                    {/* Bio */}
                    {activeProfile.bio && <Text style={styles.bio}>{activeProfile.bio}</Text>}

                    {/* Horizontal Characteristics Row */}
                    <View style={styles.characteristicsContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {getScrollableItems(activeProfile).map((item, idx) => (
                          <View key={idx} style={styles.charChip}>
                            <Ionicons name={item.icon as any} size={13} color="rgba(255, 255, 255, 0.7)" />
                            <Text style={styles.charText}>{item.text}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>

                    {/* Interests tags */}
                    {activeProfile.interests?.length > 0 && (
                      <View style={styles.tagsRow}>
                        {activeProfile.interests.map((interest: string) => (
                          <View key={interest} style={styles.tag}>
                            <Text style={styles.tagText}>{interest}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Standalone Spotify Card */}
                  {activeProfile.spotify_data?.top_tracks?.length > 0 && (
                    <View style={styles.spotifyCard}>
                      <Text style={styles.spotifyTitle}>Top Spotify Tracks 🎵</Text>
                      {activeProfile.spotify_data.top_tracks.slice(0, 3).map((track: any, idx: number) => (
                        <View key={idx} style={styles.spotifyTrackRow}>
                          <Ionicons name="play" size={14} color="#1DB954" />
                          <View style={styles.spotifyTrackInfo}>
                            <Text style={styles.spotifyTrackName} numberOfLines={1}>{track.name}</Text>
                            <Text style={styles.spotifyArtistName} numberOfLines={1}>{track.artist}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Secondary Photos */}
                  {getProfilePhotos(activeProfile).slice(1).length > 0 && (
                    <View style={styles.secondaryPhotosContainer}>
                      <Text style={styles.spotifyTitle}>More Photos 📸</Text>
                      <View style={styles.secondaryPhotosGrid}>
                        {getProfilePhotos(activeProfile).slice(1).map((photoUri: string, idx: number) => (
                          <Image key={idx} source={{ uri: photoUri }} style={styles.secondaryPhoto} />
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Resolve Action Buttons Row */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnPass]}
                      onPress={() => handleReject(activeProfile.user_id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={30} color="#FF453A" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnLike]}
                      onPress={() => handleAccept(activeProfile.user_id)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#FF1B6B', '#9D4EDD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.likeGradient}
                      >
                        <MaterialCommunityIcons name="handshake" size={32} color="#FFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* 2. BLURRED QUEUE LIST */}
            {remainingLikes.length > 0 && (
              <View style={styles.queueSection}>
                <Text style={styles.sectionHeading}>Upcoming Likes</Text>
                <View style={styles.queueGrid}>
                  {remainingLikes.map((profile, idx) => (
                    <TouchableOpacity
                      key={profile.user_id || idx}
                      style={styles.blurredCard}
                      onPress={showLockedAlert}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: getProfilePhotos(profile)[0] }}
                        style={styles.blurredPhoto}
                        blurRadius={30}
                      />
                      <View style={styles.blurredOverlay}>
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={16} color="#FFF" />
                        </View>
                        <Text style={styles.blurredName}>Someone, ??</Text>
                        <Text style={styles.blurredCollege}>Locked Profile</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Match Overlay */}
        {showMatch && (
          <Modal transparent={true} visible={showMatch !== null} animationType="fade">
            <View style={styles.matchOverlay}>
              <LinearGradient
                colors={['#FF1B6B', '#9D4EDD']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.matchInner}
              >
                <Text style={styles.matchTitle}>{"IT'S A MATCH! 💥"}</Text>
                <Text style={styles.matchSub}>You and {showMatch.name} liked each other</Text>
                <Image source={{ uri: getProfilePhotos(showMatch)[0] }} style={styles.matchPic} />
                <View style={styles.matchActions}>
                  <TouchableOpacity
                    style={styles.matchBtn}
                    onPress={() => {
                      const uid = showMatch.user_id;
                      setShowMatch(null);
                      router.push(`/chat/${uid}`);
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
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header styles
  header: { paddingVertical: 16 },
  greet: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: { backgroundColor: '#F43F5E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  
  // Empty State styles
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16, marginTop: 40 },
  emptyHeartGlow: { backgroundColor: 'rgba(244, 63, 94, 0.05)', padding: 24, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.15)' },
  emptyT: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  emptyS: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  exploreBtn: { marginTop: 12, backgroundColor: '#1E2030', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  exploreText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  scrollContainer: { paddingBottom: 60 },
  sectionHeading: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  
  // Active card styles
  activeSection: { marginBottom: 24 },
  activeCard: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden', padding: 12 },
  photoContainer: { width: '100%', height: width * 1.05, borderRadius: 20, overflow: 'hidden' },
  mainPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  campusBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#00B0FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  campusText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  // Active User Info Details style
  detailsCard: { padding: 12, marginTop: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  collegeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  collegeText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: '600' },
  bio: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, lineHeight: 20, marginTop: 12 },
  
  characteristicsContainer: { marginVertical: 14 },
  charChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  charText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: '600' },
  
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tag: { backgroundColor: 'rgba(244, 63, 94, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)' },
  tagText: { color: '#F43F5E', fontSize: 12, fontWeight: '700' },

  // Spotify integration styles
  spotifyCard: { backgroundColor: '#102A18', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1DB95433', marginTop: 12, gap: 10 },
  spotifyTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  spotifyTrackRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spotifyTrackInfo: { flex: 1 },
  spotifyTrackName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  spotifyArtistName: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, marginTop: 1 },

  // Secondary photos styles
  secondaryPhotosContainer: { marginTop: 16, padding: 4 },
  secondaryPhotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  secondaryPhoto: { width: (width - 64) / 2, height: (width - 64) / 2, borderRadius: 16, resizeMode: 'cover' },

  // Action buttons
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 20, marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  btnPass: { backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  btnLike: { overflow: 'hidden' },
  likeGradient: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  // Queue Section
  queueSection: { marginTop: 8 },
  queueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  blurredCard: { width: (width - 44) / 2, height: width * 0.65, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  blurredPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  blurredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  lockBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  blurredName: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '800' },
  blurredCollege: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, fontWeight: '600' },

  // Match Screen Overlay
  matchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 999 },
  matchInner: { padding: 30, borderRadius: 24, alignItems: 'center', gap: 16, width: '100%' },
  matchTitle: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  matchSub: { color: '#FFF', fontSize: 14, opacity: 0.95 },
  matchPic: { width: 180, height: 180, borderRadius: 90, borderWidth: 5, borderColor: '#FFF' },
  matchActions: { gap: 12, width: '100%', marginTop: 8 },
  matchBtn: { backgroundColor: '#FFF', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  matchBtnText: { color: '#FF1B6B', fontWeight: '900', fontSize: 16 },
  matchBtnSecondary: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  matchBtnTextSecondary: { color: '#FFF', fontWeight: '700' },
});
