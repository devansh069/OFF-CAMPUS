import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Alert, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import PremiumUpsellSheet from '@/src/components/PremiumUpsellSheet';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;


const MOCK_PROMPTS = [
  { index: 1, title: "My best side 📸" },
  { index: 3, title: "Typical Sunday look ☀️" },
  { index: 5, title: "My best outfit 👗" }
];

const getProfilePhotos = (profile: any) => {
  let photos = [...(profile.photos || [])];

  const mockFemalePhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
  ];

  const mockMalePhotos = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop',
  ];

  const fallbackPool = profile.gender === 'female' ? mockFemalePhotos : mockMalePhotos;

  while (photos.length < 6) {
    const nextIdx = (photos.length - 1) % fallbackPool.length;
    const photoToPush = fallbackPool[nextIdx >= 0 ? nextIdx : 0];
    photos.push(photoToPush);
  }

  return photos.map(url => {
    if (url && url.includes('sat=-100')) {
      return url.replace('&sat=-100', '').replace('sat=-100', '');
    }
    return url;
  });
};

const getBWPhotoUrl = (url: string) => {
  if (url && url.includes('unsplash.com') && !url.includes('sat=-100')) {
    return url + '&sat=-100';
  }
  return url;
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

  const drinkLabel = drink.toLowerCase() === 'yes' ? 'Drinks' : 'Drink: No';
  const smokeLabel = smoke.toLowerCase() === 'yes' ? 'Smoker' : 'Smoke: No';
  const weedLabel = weed.toLowerCase() === 'yes' ? 'Weed' : 'Weed: No';

  return [
    { icon: (profile.gender === 'female' ? 'female-outline' : profile.gender === 'male' ? 'male-outline' : 'person-outline'), text: genderLabel },
    { icon: 'resize-outline', text: heightVal },
    { icon: 'location-outline', text: locationLabel },
    { icon: 'sparkles-outline', text: religion },
    { icon: 'wine-outline', text: drinkLabel },
    { icon: 'flame-outline', text: smokeLabel },
    { icon: 'leaf-outline', text: weedLabel },
  ];
};

export default function Likes() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  const [incomingLikes, setIncomingLikes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'likes' | 'handshakes'>('handshakes');
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState<any | null>(null);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [activeProfileIndex, setActiveProfileIndex] = useState<number>(0);
  const [upsellVisible, setUpsellVisible] = useState(false);

  const likes = incomingLikes.filter(p => activeTab === 'handshakes' ? p.is_handshake : !p.is_handshake);

  useEffect(() => {
    fetchLikes();
  }, [sessionToken]);

  const fetchLikes = async () => {
    if (sessionToken === 'dummy_token') {
      setIncomingLikes([]);
      setLoading(false);
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/likes-received`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (!r.ok) throw new Error('Failed to fetch incoming likes');
      const d = await r.json();
      setIncomingLikes(d.likes || []);
    } catch (e: any) {
      console.warn('fetchLikes failed:', e.message);
      setIncomingLikes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (targetUserId: string) => {
    if (sessionToken === 'dummy_token') {
      const targetProfile = incomingLikes.find(p => p.user_id === targetUserId);
      setIncomingLikes(prev => {
        const nextList = prev.filter(p => p.user_id !== targetUserId);
        if (nextList.filter(p => activeTab === 'handshakes' ? p.is_handshake : !p.is_handshake).length === 0) {
          setShowFullProfile(false);
        }
        return nextList;
      });
      if (targetProfile) {
        setShowMatch(targetProfile);
      }
      return;
    }

    try {
      const targetProfile = incomingLikes.find(p => p.user_id === targetUserId);
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const d = await r.json();

      // Filter out the resolved profile immediately
      setIncomingLikes(prev => {
        const nextList = prev.filter(p => p.user_id !== targetUserId);
        if (nextList.filter(p => activeTab === 'handshakes' ? p.is_handshake : !p.is_handshake).length === 0) {
          setShowFullProfile(false);
        }
        return nextList;
      });
      setActiveProfileIndex(0);

      if (d.is_match && targetProfile) {
        setShowMatch(targetProfile);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to accept like');
    }
  };

  const handleReject = async (targetUserId: string) => {
    if (sessionToken === 'dummy_token') {
      setIncomingLikes(prev => {
        const nextList = prev.filter(p => p.user_id !== targetUserId);
        if (nextList.filter(p => activeTab === 'handshakes' ? p.is_handshake : !p.is_handshake).length === 0) {
          setShowFullProfile(false);
        }
        return nextList;
      });
      return;
    }

    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      // Filter out the resolved profile immediately
      setIncomingLikes(prev => {
        const nextList = prev.filter(p => p.user_id !== targetUserId);
        if (nextList.filter(p => activeTab === 'handshakes' ? p.is_handshake : !p.is_handshake).length === 0) {
          setShowFullProfile(false);
        }
        return nextList;
      });
      setActiveProfileIndex(0);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pass profile');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ee4d4d" />
        </View>
      </SafeAreaView>
    );
  }

  // Create grid data showing all likes, with a minimum of 9 cubes to fill the grid area
  const totalCubesCount = Math.max(9, likes.length);
  const gridData = Array.from({ length: totalCubesCount }).map((_, index) => {
    if (index < likes.length) {
      return likes[index];
    }
    return null;
  });

  return (
    <View style={styles.container}>
      {/* Top-Left Dark Purple Glow Ball */}
      <View style={styles.glowBallContainer}>
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.bg}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.greet}>People Who</Text>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Liked You 💖</Text>
              </View>
            </View>

            {/* Custom Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'handshakes' && styles.tabButtonActive]}
                onPress={() => setActiveTab('handshakes')}
              >
                <MaterialCommunityIcons name="handshake" size={18} color={activeTab === 'handshakes' ? '#000' : '#FFF'} />
                <Text style={[styles.tabText, activeTab === 'handshakes' && styles.tabTextActive]}>
                  Handshakes ({incomingLikes.filter(p => p.is_handshake).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'likes' && styles.tabButtonActive]}
                onPress={() => setActiveTab('likes')}
              >
                <Ionicons name="heart" size={16} color={activeTab === 'likes' ? '#000' : '#FFF'} style={{ marginRight: 2 }} />
                <Text style={[styles.tabText, activeTab === 'likes' && styles.tabTextActive]}>
                  Likes ({incomingLikes.filter(p => !p.is_handshake).length})
                </Text>
              </TouchableOpacity>
            </View>

            {likes.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyHeartGlow}>
                  <Text style={styles.oopsIconText}>!</Text>
                </View>
                <Text style={styles.emptyT}>No {activeTab} for now.</Text>
                <Text style={styles.emptyS}>
                  {activeTab === 'handshakes' 
                    ? "Verify your profile and update your current location to connect with students around you!" 
                    : "Go to start vibing with other students and build up matches!"}
                </Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.replace(activeTab === 'handshakes' ? '/nearby' : '/discover')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreText}>
                    {activeTab === 'handshakes' ? "Explore Nearby" : "Start Vibing"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {/* 3x3 Photo Cubes Grid */}
                <View style={styles.gridContainer}>
                  {gridData.map((profile, index) => {
                    if (profile) {
                      const isLockedForFree = !user?.is_premium && index > 0;

                      if (isLockedForFree) {
                        return (
                          <TouchableOpacity
                            key={profile.user_id || index}
                            style={styles.gridCellActive}
                            onPress={() => setUpsellVisible(true)}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: getProfilePhotos(profile)[0] }}
                              style={[styles.gridPhoto, { opacity: 0.15 }]}
                              blurRadius={Platform.OS === 'ios' ? 30 : 20}
                            />
                            <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject}>
                              <View style={styles.lockedCellOverlay}>
                                <View style={styles.lockIconCircle}>
                                  <Ionicons name="lock-closed" size={16} color="#C2FF3D" />
                                </View>
                                <Text style={styles.lockedCellText}>Unlock Likes</Text>
                              </View>
                            </BlurView>
                          </TouchableOpacity>
                        );
                      }

                      // Active Profile, color, clickable, overlay cross/handshake buttons
                      return (
                        <TouchableOpacity
                          key={profile.user_id || index}
                          style={styles.gridCellActive}
                          onPress={() => {
                            setActiveProfileIndex(index);
                            setShowFullProfile(true);
                          }}
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{ uri: getProfilePhotos(profile)[0] }}
                            style={styles.gridPhoto}
                          />

                          {/* Glass shine reflection overlay */}
                          <LinearGradient
                            colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)']}
                            locations={[0.0, 0.25, 0.5, 0.75, 1.0]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                            pointerEvents="none"
                          />

                          {/* Symmetrical small bottom-corner action overlay buttons */}
                          <TouchableOpacity
                            style={[styles.smallActionBtn, styles.smallNopeBtn]}
                            onPress={() => handleReject(profile.user_id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close" size={16} color="#FF453A" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.smallActionBtn, styles.smallLikeBtn]}
                            onPress={() => handleAccept(profile.user_id)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="handshake" size={16} color="#C2FF3D" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    } else {
                      // Empty cell placeholder
                      return (
                        <View
                          key={`empty-${index}`}
                          style={styles.gridCellLocked}
                        >
                          <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFillObject}>
                            <View style={styles.lockedOverlay}>
                              <Ionicons name="heart-outline" size={20} color="rgba(255,255,255,0.15)" />
                            </View>
                          </BlurView>
                        </View>
                      );
                    }
                  })}
                </View>
              </ScrollView>
            )}

            {/* Match Screen Overlay */}
            {showMatch && (
              <Modal transparent={true} visible={showMatch !== null} animationType="fade">
                <View style={styles.matchOverlay}>
                  <LinearGradient
                    colors={['#1F1D2B', '#0F0E17']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
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

      {/* Fullscreen Profile Detail Modal (Discover/Vibe style) */}
      <Modal
        visible={showFullProfile && likes.length > 0}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFullProfile(false)}
      >
        <View style={styles.modalContainer}>
          {/* Grayscale aesthetic dark portrait background image */}
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop&q=80&sat=-100' }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            blurRadius={Platform.OS === 'android' ? 25 : 0}
          />
          <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject}>
            {likes.length > 0 && likes[activeProfileIndex] && (
              <View style={styles.cardWrapper}>
                {/* Floating Header Overlay at the top */}
                <SafeAreaView style={styles.modalHeaderFloatingOverlay} pointerEvents="box-none">
                  <BlurView intensity={Platform.OS === 'ios' ? 70 : 90} tint="dark" style={styles.modalHeaderBar}>
                    <TouchableOpacity
                      style={styles.modalHeaderBackBtn}
                      onPress={() => setShowFullProfile(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.modalHeaderTitleContainer}>
                      <Text style={styles.modalHeaderTitle}>This person liked you ✨</Text>
                    </View>
                    <View style={{ width: 40 }} />
                  </BlurView>
                </SafeAreaView>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  {/* 1. Standalone Fullscreen Photo Card */}
                  <View style={styles.mainPhotoCard}>
                    <Image
                      source={{ uri: getBWPhotoUrl(getProfilePhotos(likes[activeProfileIndex])[0]) }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />

                    {/* Glass Details Card Overlay */}
                    <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassDetailsCard}>
                      <View style={styles.profileDetails}>
                        {/* Name & Age */}
                        <View style={styles.cardNameRow}>
                          <Text style={styles.cardName}>{likes[activeProfileIndex].name}, {likes[activeProfileIndex].age}</Text>
                          {likes[activeProfileIndex].verification_status === 'verified' && (
                            <Ionicons name="checkmark-circle" size={18} color="#00B0FF" style={{ marginLeft: 6 }} />
                          )}
                          <View style={{ flex: 1 }} />
                          <View style={styles.innovativeVibeBadge}>
                            <Ionicons name="sparkles" size={13} color="#FFD700" />
                            <Text style={styles.innovativeVibeText}>{likes[activeProfileIndex].vibe_score?.toFixed(1)}</Text>
                          </View>
                        </View>

                        {/* College / Course / Year */}
                        <View style={styles.cardCollegeRow}>
                          <Ionicons name="school-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
                          <Text style={styles.cardCollegeText}>
                            {[
                              getCollegeName(likes[activeProfileIndex]),
                              likes[activeProfileIndex].course,
                              likes[activeProfileIndex].year
                            ].filter(Boolean).join(' • ')}
                          </Text>
                        </View>

                        {/* Bio */}
                        {likes[activeProfileIndex].bio && <Text style={styles.cardBio}>{likes[activeProfileIndex].bio}</Text>}

                        {/* Characteristics Scrollable Row */}
                        <View style={styles.scrollWrapper}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContentContainer}
                          >
                            {getScrollableItems(likes[activeProfileIndex]).map((item, idx) => (
                              <React.Fragment key={idx}>
                                <View style={styles.scrollItem}>
                                  <Ionicons name={item.icon as any} size={15} color="rgba(255, 255, 255, 0.7)" />
                                  <Text style={styles.scrollItemText}>{item.text}</Text>
                                </View>
                                {idx < getScrollableItems(likes[activeProfileIndex]).length - 1 && (
                                  <View style={styles.scrollSeparator} />
                                )}
                              </React.Fragment>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Interests / Tags */}
                        {likes[activeProfileIndex].interests?.length > 0 && (
                          <View style={styles.cardTagsRow}>
                            {likes[activeProfileIndex].interests.map((i: string) => (
                              <View key={i} style={styles.cardTag}>
                                <Text style={styles.cardTagText}>{i}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </BlurView>
                  </View>

                  {/* 2. Standalone Spotify Card */}
                  {likes[activeProfileIndex].spotify_data?.top_tracks?.length > 0 && (
                    <View style={styles.spotifyCard}>
                      <Text style={styles.sectionTitle}>Top Spotify Tracks 🎵</Text>
                      {likes[activeProfileIndex].spotify_data.top_tracks.slice(0, 3).map((track: any, idx: number) => (
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

                  {/* 3. Secondary Photos */}
                  <View style={styles.secondaryPhotosSection}>
                    {getProfilePhotos(likes[activeProfileIndex]).slice(1).map((photoUri, index) => {
                      const photoIndex = index + 1;
                      const prompt = MOCK_PROMPTS.find(p => p.index === photoIndex);

                      return (
                        <BlurView intensity={35} tint="dark" key={photoIndex} style={styles.secondaryPhotoCard}>
                          {prompt && (
                            <View style={styles.promptHeader}>
                              <Text style={styles.promptQuestion}>MY PROMPT</Text>
                              <Text style={styles.promptTitle}>{prompt.title}</Text>
                            </View>
                          )}
                          <View style={styles.secondaryPhotoContainer}>
                            <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
                            {/* Glass shine reflection overlay */}
                            <LinearGradient
                              colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)']}
                              locations={[0.0, 0.25, 0.5, 0.75, 1.0]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFillObject}
                              pointerEvents="none"
                            />
                          </View>
                        </BlurView>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Floating Action Overlay Buttons */}
                <View style={styles.floatingActionsContainer}>
                  <TouchableOpacity
                    style={[styles.floatingBtn, styles.floatingNope]}
                    onPress={() => handleReject(likes[activeProfileIndex].user_id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={24} color="#FF453A" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.floatingBtn, styles.floatingLike]}
                    onPress={() => handleAccept(likes[activeProfileIndex].user_id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="handshake" size={24} color="#C2FF3D" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </BlurView>
        </View>
      </Modal>

      {/* Premium Upsell Bottom Sheet */}
      <PremiumUpsellSheet
        visible={upsellVisible}
        onClose={() => setUpsellVisible(false)}
        title="See Everyone Who Liked You 💖"
        featureName="Unlock All Incoming Likes"
      />
    </View>
  );
}

const cellWidth = (screenWidth - 64) / 3;
const cellHeight = (screenHeight - 250) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  lockedCellOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 6,
  },
  lockIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(194, 255, 61, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  lockedCellText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  bg: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header styles
  header: { paddingVertical: 16 },
  greet: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  countBadge: { backgroundColor: '#C2FF3D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#000', fontSize: 12, fontWeight: '900' },

  // Empty State styles
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 18, paddingBottom: 80 },
  emptyHeartGlow: {
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3
  },
  oopsIconText: {
    fontSize: 74,
    fontWeight: '900',
    color: '#C2FF3D',
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 84 : 74,
  },
  emptyT: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  emptyS: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 15 },
  exploreBtn: {
    marginTop: 20,
    backgroundColor: '#C2FF3D',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#C2FF3D',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  exploreText: { color: '#000000', fontWeight: '900', fontSize: 15 },

  scrollContainer: { paddingBottom: 100 },

  // Grid Container & Cells
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  gridCellActive: {
    width: cellWidth,
    height: cellHeight,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.45)', // Translucent lime-neon glass border
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  gridCellLocked: {
    width: cellWidth,
    height: cellHeight,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)', // Sleek white-translucent glass border
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // Frosted glass badge bg
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)', // Polished glass edge
  },

  // Symmetrical small grid overlay action buttons
  smallActionBtn: {
    position: 'absolute',
    bottom: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0A0B14',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  smallNopeBtn: {
    left: 8,
    borderColor: '#FF453A',
  },
  smallLikeBtn: {
    right: 8,
    borderColor: '#C2FF3D',
  },

  // Modal Fullscreen Profile Preview styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cardWrapper: {
    flex: 1,
    position: 'relative',
  },
  modalHeaderFloatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(10, 11, 20, 0.55)',
  },
  modalHeaderBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalHeaderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalScrollContent: {
    paddingBottom: 160,
  },
  mainPhotoCard: {
    width: screenWidth,
    height: screenHeight,
    overflow: 'hidden',
    position: 'relative',
  },
  glassDetailsCard: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    right: 16,
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(10, 11, 20, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  profileDetails: {
    gap: 8
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  innovativeVibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  innovativeVibeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
  },
  cardCollegeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardCollegeText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 14, fontWeight: '600' },
  cardBio: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, lineHeight: 20, marginTop: 4 },
  scrollWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    overflow: 'hidden',
  },
  scrollContentContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollItemText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollSeparator: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 12,
  },
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

  // Sections inside ScrollView
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2
  },
  spotifyCard: {
    backgroundColor: 'rgba(29, 185, 84, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.15)',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
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

  secondaryPhotosSection: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 20,
  },
  secondaryPhotoCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  secondaryPhotoContainer: {
    width: '100%',
    aspectRatio: 0.85,
    position: 'relative',
  },
  promptHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptQuestion: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  promptTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  profilePhoto: { width: '100%', height: '100%' },

  // Symmetrical Discover-Style Action Buttons Overlay
  floatingActionsContainer: {
    position: 'absolute',
    bottom: 96,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 999,
    elevation: 20,
  },
  floatingBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#0A0B14',
    borderWidth: 2,
  },
  floatingNope: {
    borderColor: '#FF453A',
  },
  floatingLike: {
    borderColor: '#C2FF3D',
  },

  // Match Screen Overlay
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
    zIndex: 999
  },
  matchInner: { padding: 30, borderRadius: 24, alignItems: 'center', gap: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(194, 255, 61, 0.25)' },
  matchTitle: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  matchSub: { color: '#FFF', fontSize: 14, opacity: 0.95 },
  matchPic: { width: 180, height: 180, borderRadius: 90, borderWidth: 5, borderColor: '#FFF' },
  matchActions: { gap: 12, width: '100%', marginTop: 8 },
  matchBtn: { backgroundColor: '#C2FF3D', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  matchBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  matchBtnSecondary: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  matchBtnTextSecondary: { color: '#FFF', fontWeight: '700' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#C2FF3D',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '900',
  },
});
