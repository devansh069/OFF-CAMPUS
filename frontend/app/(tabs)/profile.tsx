import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Profile() {
  const { user, sessionToken, logout, refreshUser, updateUser } = useAuth();
  const router = useRouter();
  const [college, setCollege] = useState<any>(null);

  useEffect(() => {
    if (user?.college_id) {
      fetchCollege();
    }
  }, [user]);

  const fetchCollege = async () => {
    if (sessionToken === 'dummy_token' || !sessionToken) {
      setCollege({
        college_id: 'col_stephens',
        name: "St. Stephen's College",
        short_name: "Stephens",
        location: "University Enclave, Delhi"
      });
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user?.college_id}`);
      const data = await response.json();
      setCollege(data.college);
    } catch (error) {
      console.error('Error fetching college:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const addPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showProfileMockPhotoAlert('Gallery permission denied or not granted.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadPhotoToServer(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else if (!result.canceled) {
        showProfileMockPhotoAlert('Could not read image data.');
      }
    } catch (error) {
      console.warn('addPhoto failed:', error);
      showProfileMockPhotoAlert('Gallery is not available on this simulator/device.');
    }
  };

  const uploadPhotoToServer = async (photoData: string) => {
    if ((sessionToken === 'dummy_token' || !sessionToken) && updateUser) {
      if (!user) return;
      updateUser({ photos: [...(user.photos || []), photoData] });
      return;
    }

    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ photo: photoData }),
      });
      await refreshUser();
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  const showProfileMockPhotoAlert = (message: string) => {
    Alert.alert(
      'Simulator Mode 📸',
      `${message} Would you like to add a mock profile photo instead for testing?`,
      [
        {
          text: 'Add Mock Photo',
          onPress: () => {
            const randomPhotos = [
              'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
            ];
            const randomPhoto = randomPhotos[Math.floor(Math.random() * randomPhotos.length)];
            uploadPhotoToServer(randomPhoto);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const deletePhoto = (index: number) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if ((sessionToken === 'dummy_token' || !sessionToken) && updateUser) {
          if (!user) return;
          const updated = [...(user.photos || [])];
          updated.splice(index, 1);
          updateUser({ photos: updated });
          return;
        }

        try {
          await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/photos/${index}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sessionToken}` },
          });
          await refreshUser();
        } catch (error) {
          console.error('Error:', error);
        }
      }},
    ]);
  };

  const addSpotifyData = async () => {
    Alert.alert(
      'Spotify Vibes',
      'Add your favorite artists to boost your Vibe Score!',
      [
        {
          text: 'Add Sample Data',
          onPress: async () => {
            if ((sessionToken === 'dummy_token' || !sessionToken) && updateUser) {
              updateUser({
                spotify_data: {
                  top_tracks: ['Starboy - The Weeknd', 'Levitating - Dua Lipa', 'Peaches - Justin Bieber'],
                  top_artists: ['Harry Styles', 'Glass Animals', 'The Weeknd'],
                },
                vibe_score: 4.9
              });
              Alert.alert('Success', 'Spotify data added! Vibe Score increased!');
              return;
            }

            try {
              await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/spotify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({
                  top_tracks: ['Starboy - The Weeknd', 'Levitating - Dua Lipa', 'Peaches - Justin Bieber'],
                  top_artists: ['Harry Styles', 'Glass Animals', 'The Weeknd'],
                }),
              });
              await refreshUser();
              Alert.alert('Success', 'Spotify data added! Vibe Score increased!');
            } catch (error) {
              console.error('Error:', error);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Grayscale aesthetic dark portrait background image */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop&q=80' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={Platform.OS === 'android' ? 25 : 0}
      />
      <BlurView intensity={Platform.OS === 'ios' ? 70 : 90} tint="dark" style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* Brand Header */}
            <View style={styles.headerBar}>
              <View style={styles.logoRow}>
                <LinearGradient 
                  colors={['#8B5CF6', '#F43F5E']} 
                  style={styles.logoCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flame" size={16} color="#FFF" />
                </LinearGradient>
                <Text style={styles.brandText}>off campus</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.globalPill} onPress={() => router.push('/premium')}>
                  <MaterialCommunityIcons name="crown" size={14} color="#C2FF3D" style={{ marginRight: 4 }} />
                  <Text style={styles.globalText}>Global</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsIcon} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={22} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Profile Avatar Card */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <LinearGradient 
                  colors={['#C2FF3D', '#8B5CF6', '#F43F5E']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={styles.avatarRing}
                >
                  <View style={styles.avatarInner}>
                    <Image
                      source={{
                        uri: user.picture || user.photos?.[0] || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2662&auto=format&fit=crop'
                      }}
                      style={styles.avatarImage}
                    />
                  </View>
                </LinearGradient>
                <View style={styles.crownBadge}>
                  <MaterialCommunityIcons name="crown" size={12} color="#000" />
                </View>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.name}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#C2FF3D" style={{ marginLeft: 6 }} />
              </View>

              <View style={styles.collegePill}>
                <Text style={styles.collegePillText}>
                  {user.verification_status === 'verified' ? 'Verified' : 'Pending'} {college?.short_name || 'IPU'} Student
                </Text>
              </View>
            </View>

            {/* Stats Dashboard */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.vibeStatCard]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="sparkles" size={20} color="#C2FF3D" />
                </View>
                <Text style={styles.statValue}>{(user.vibe_score || 8.5).toFixed(1)}</Text>
                <Text style={styles.statLabel}>VIBE SCORE</Text>
              </View>

              <View style={[styles.statCard, styles.streakStatCard]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="flame" size={20} color="#FFA500" />
                </View>
                <Text style={styles.statValue}>12d</Text>
                <Text style={styles.statLabel}>APP STREAK</Text>
              </View>
            </View>

            {/* Your Vibe DNA */}
            <View style={styles.dnaCard}>
              <View style={styles.dnaHeader}>
                <Text style={styles.dnaTitle}>Your Vibe DNA</Text>
                <View style={styles.analysisBadge}>
                  <Text style={styles.analysisText}>ANALYSIS COMPLETE</Text>
                </View>
              </View>
              <Text style={styles.dnaSubtitle}>Based on your activity</Text>

              <View style={styles.dnaRow}>
                <LinearGradient 
                  colors={['rgba(74, 144, 226, 0.15)', 'rgba(74, 144, 226, 0.05)']} 
                  style={[styles.dnaPill, { borderColor: 'rgba(74, 144, 226, 0.3)' }]}
                >
                  <Text style={styles.creativeText}>🎨 CREATIVE</Text>
                </LinearGradient>
                <LinearGradient 
                  colors={['rgba(165, 94, 234, 0.15)', 'rgba(165, 94, 234, 0.05)']} 
                  style={[styles.dnaPill, { borderColor: 'rgba(165, 94, 234, 0.3)' }]}
                >
                  <Text style={styles.nightOwlText}>🦉 NIGHT OWL</Text>
                </LinearGradient>
                <LinearGradient 
                  colors={['rgba(245, 166, 35, 0.15)', 'rgba(245, 166, 35, 0.05)']} 
                  style={[styles.dnaPill, { borderColor: 'rgba(245, 166, 35, 0.3)' }]}
                >
                  <Text style={styles.socialiteText}>✨ SOCIALITE</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Integrations Card */}
            <View style={styles.integrationsCard}>
              <Text style={styles.integrationsTitle}>Integrations</Text>
              <Text style={styles.integrationsSubtitle}>Connect accounts to flex your vibe</Text>

              <TouchableOpacity style={styles.spotifyCard} onPress={addSpotifyData}>
                <View style={styles.spotifyHeader}>
                  <Ionicons name="musical-notes" size={20} color="#1DB954" />
                  <Text style={styles.spotifyTitle}>MY CURRENT VIBE</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.4)" style={{ marginLeft: 'auto' }} />
                </View>

                <View style={styles.spotifyTracks}>
                  {user.spotify_data?.top_tracks && user.spotify_data.top_tracks.length > 0 ? (
                    user.spotify_data.top_tracks.slice(0, 3).map((track: string, idx: number) => {
                      const parts = track.split(' - ');
                      const title = parts[0] || track;
                      const artist = parts[1] || 'Connected Spotify Vibe';
                      return (
                        <View key={idx} style={styles.trackRow}>
                          <Text style={styles.trackIndex}>{idx + 1}</Text>
                          <View style={styles.trackArt}>
                            <Ionicons name="musical-note" size={14} color="#1DB954" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.trackTitle}>{title}</Text>
                            <Text style={styles.trackArtist}>{artist}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <>
                      <View style={styles.trackRow}>
                        <Text style={styles.trackIndex}>1</Text>
                        <View style={[styles.trackArt, { backgroundColor: 'rgba(255, 165, 0, 0.1)' }]}>
                          <Ionicons name="musical-note" size={14} color="#FFA500" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackTitle}>Starboy</Text>
                          <Text style={styles.trackArtist}>The Weeknd</Text>
                        </View>
                      </View>
                      <View style={styles.trackRow}>
                        <Text style={styles.trackIndex}>2</Text>
                        <View style={[styles.trackArt, { backgroundColor: 'rgba(29, 185, 84, 0.1)' }]}>
                          <Ionicons name="musical-note" size={14} color="#1DB954" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackTitle}>Levitating</Text>
                          <Text style={styles.trackArtist}>Dua Lipa</Text>
                        </View>
                      </View>
                      <View style={styles.trackRow}>
                        <Text style={styles.trackIndex}>3</Text>
                        <View style={[styles.trackArt, { backgroundColor: 'rgba(238, 77, 77, 0.1)' }]}>
                          <Ionicons name="musical-note" size={14} color="#ee4d4d" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackTitle}>Peaches</Text>
                          <Text style={styles.trackArtist}>Justin Bieber</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Gallery / Photos Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MY GALLERY</Text>
              <View style={styles.photosGrid}>
                {user.photos?.map((photo: string, index: number) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri: photo.startsWith('data:') ? photo : `${EXPO_PUBLIC_BACKEND_URL}${photo}` }} style={styles.photoImg} />
                    <TouchableOpacity style={styles.photoOverlay} onPress={() => deletePhoto(index)}>
                      <Ionicons name="trash-outline" size={14} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>
                ))}
                {(!user.photos || user.photos.length < 6) && (
                  <TouchableOpacity
                    style={[
                      styles.addPhotoBtn,
                      (!user.photos || user.photos.length === 0) && { width: '100%', aspectRatio: undefined, height: 120 }
                    ]}
                    onPress={addPhoto}
                  >
                    <Ionicons name="camera" size={(!user.photos || user.photos.length === 0) ? 32 : 24} color="#C2FF3D" />
                    <Text style={styles.addPhotoText}>
                      {(!user.photos || user.photos.length === 0) ? 'Add your first photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Bio Info Summary */}
            {user.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>BIO</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}

            {/* Interests Tag List */}
            {user.interests && user.interests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>INTERESTS</Text>
                <View style={styles.tagsRow}>
                  {user.interests.map((interest: string) => (
                    <View key={interest} style={styles.tag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Actions List (Redesigned) */}
            <View style={styles.actionsContainer}>
              {!user.is_premium && (
                <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/premium')}>
                  <LinearGradient
                    colors={['#8B5CF6', '#F43F5E']}
                    style={styles.premiumGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="diamond" size={22} color="#FFF" />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={styles.premiumTitle}>Go Premium - ₹99/mo</Text>
                      <Text style={styles.premiumSubtitle}>Access ALL Delhi colleges + perks</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.glassCardButton} onPress={() => router.push('/profile-edit')}>
                <View style={styles.glassButtonContent}>
                  <View style={[styles.cardIconBox, { borderColor: 'rgba(194, 255, 61, 0.3)' }]}>
                    <Ionicons name="create-outline" size={20} color="#C2FF3D" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.cardTitle}>Edit Profile</Text>
                    <Text style={styles.cardSubtitle}>Update bio, interests & academics</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.4)" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.glassCardButton} onPress={() => router.push('/referrals')}>
                <View style={styles.glassButtonContent}>
                  <View style={[styles.cardIconBox, { borderColor: 'rgba(194, 255, 61, 0.3)' }]}>
                    <Ionicons name="gift-outline" size={20} color="#C2FF3D" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.cardTitle}>Refer Friends</Text>
                    <Text style={styles.cardSubtitle}>Earn 7 days premium per referral!</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.4)" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'lowercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  globalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  globalText: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '900',
  },
  settingsIcon: {
    padding: 4,
  },

  avatarSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarContainer: {
    position: 'relative',
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 62,
    backgroundColor: '#050507',
    padding: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  crownBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    backgroundColor: '#C2FF3D',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#050507',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  collegePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  collegePillText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats Dashboard
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.2,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  vibeStatCard: {
    borderColor: 'rgba(194, 255, 61, 0.15)',
  },
  streakStatCard: {
    borderColor: 'rgba(255, 165, 0, 0.15)',
  },
  statIconRow: {
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // DNA Card
  dnaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dnaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dnaTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  analysisBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analysisText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dnaSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  dnaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dnaPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  creativeText: {
    color: '#4A90E2',
    fontSize: 11,
    fontWeight: '900',
  },
  nightOwlText: {
    color: '#A55EEA',
    fontSize: 11,
    fontWeight: '900',
  },
  socialiteText: {
    color: '#F5A623',
    fontSize: 11,
    fontWeight: '900',
  },

  // Spotify Card
  integrationsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  integrationsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  integrationsSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  spotifyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(29, 185, 84, 0.25)', // Subtle green Spotify glow border
    padding: 16,
  },
  spotifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  spotifyTitle: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  spotifyTracks: {
    gap: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackIndex: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontWeight: '900',
    width: 12,
  },
  trackArt: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 1,
  },

  // Gallery
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: '31.2%',
    aspectRatio: 3/4,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addPhotoBtn: {
    width: '31.2%',
    aspectRatio: 3/4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.02)',
    gap: 8,
  },
  addPhotoText: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '700',
  },
  bioText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  tagText: {
    color: '#C2FF3D',
    fontSize: 13,
    fontWeight: '700',
  },

  // Bottom action cards
  actionsContainer: {
    marginVertical: 10,
    gap: 12,
  },
  premiumCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  premiumTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  premiumSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },

  glassCardButton: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
    overflow: 'hidden',
  },
  glassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    marginTop: 2,
  },
});
