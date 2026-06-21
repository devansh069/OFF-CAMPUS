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
  const { user, sessionToken, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [college, setCollege] = useState<any>(null);

  useEffect(() => {
    if (user?.college_id) {
      fetchCollege();
    }
  }, [user]);

  const fetchCollege = async () => {
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
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Brand Header */}
            <View style={styles.headerBar}>
              <View style={styles.logoRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="flame" size={18} color="#C2FF3D" />
                </View>
                <Text style={styles.brandText}>mismatched</Text>
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
            <LinearGradient colors={['#C2FF3D', 'rgba(194, 255, 61, 0.3)', '#C2FF3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Image
                  source={{
                    uri: user.picture || user.photos?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=='
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
            <Ionicons name="checkmark-circle" size={18} color="#2F80ED" style={{ marginLeft: 6 }} />
          </View>

          <View style={styles.collegePill}>
            <Text style={styles.collegePillText}>
              {user.verification_status === 'verified' ? 'Verified' : 'Pending'} {college?.short_name || 'IPU'} Student
            </Text>
          </View>
        </View>

        {/* Stats Dashboard */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <Ionicons name="sparkles" size={20} color="#C2FF3D" />
            </View>
            <Text style={styles.statValue}>{(user.vibe_score || 8.5).toFixed(1)}</Text>
            <Text style={styles.statLabel}>VIBE SCORE</Text>
          </View>

          <View style={styles.statCard}>
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
            <View style={[styles.dnaPill, styles.creativePill]}>
              <Text style={styles.creativeText}>🎨 CREATIVE</Text>
            </View>
            <View style={[styles.dnaPill, styles.nightOwlPill]}>
              <Text style={styles.nightOwlText}>🦉 NIGHT OWL</Text>
            </View>
            <View style={[styles.dnaPill, styles.socialitePill]}>
              <Text style={styles.socialiteText}>✨ SOCIALITE</Text>
            </View>
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
                    <View style={[styles.trackArt, { backgroundColor: '#2a1a08' }]}>
                      <Ionicons name="musical-note" size={14} color="#FFA500" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackTitle}>Starboy</Text>
                      <Text style={styles.trackArtist}>The Weeknd</Text>
                    </View>
                  </View>
                  <View style={styles.trackRow}>
                    <Text style={styles.trackIndex}>2</Text>
                    <View style={[styles.trackArt, { backgroundColor: '#0c2a1c' }]}>
                      <Ionicons name="musical-note" size={14} color="#1DB954" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackTitle}>Levitating</Text>
                      <Text style={styles.trackArtist}>Dua Lipa</Text>
                    </View>
                  </View>
                  <View style={styles.trackRow}>
                    <Text style={styles.trackIndex}>3</Text>
                    <View style={[styles.trackArt, { backgroundColor: '#2a0c1a' }]}>
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
                  <Ionicons name="trash-outline" size={14} color="#FFF" />
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
                <Ionicons name="camera" size={(!user.photos || user.photos.length === 0) ? 32 : 24} color="rgba(255, 255, 255, 0.4)" />
                <Text style={styles.addPhotoText}>
                  {(!user.photos || user.photos.length === 0) ? 'Add your first photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Profile Info Summary */}
        {user.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BIO</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        )}

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

        {/* Quick Links */}
        <View style={{ marginVertical: 8 }}>
          {!user.is_premium && (
            <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/premium')}>
              <LinearGradient
                colors={['#C2FF3D', '#C2FF3D']}
                style={styles.premiumGradient}
              >
                <Ionicons name="diamond" size={24} color="#000" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.premiumTitle}>Go Premium - ₹99/mo</Text>
                  <Text style={styles.premiumSubtitle}>Access ALL Delhi colleges + perks</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/profile-edit')}>
            <LinearGradient colors={['#C2FF3D', '#C2FF3D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.premiumGradient}>
              <Ionicons name="create" size={24} color="#000" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.premiumTitle}>Edit Profile</Text>
                <Text style={styles.premiumSubtitle}>Update bio, interests & academics</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/referrals')}>
            <LinearGradient colors={['#C2FF3D', '#C2FF3D']} style={styles.premiumGradient}>
              <Ionicons name="gift" size={24} color="#000" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.premiumTitle}>Refer Friends</Text>
                <Text style={styles.premiumSubtitle}>Earn 7 days premium per referral!</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </LinearGradient>
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  globalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C2FF3D',
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
    marginVertical: 16,
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
    backgroundColor: '#000',
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
    borderColor: '#000',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
  },
  collegePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  collegePillText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  statIconRow: {
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  dnaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
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
  },
  analysisBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  analysisText: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creativePill: {
    borderColor: '#4A90E2',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  creativeText: {
    color: '#4A90E2',
    fontSize: 11,
    fontWeight: '900',
  },
  nightOwlPill: {
    borderColor: '#9013FE',
    backgroundColor: 'rgba(144, 19, 254, 0.1)',
  },
  nightOwlText: {
    color: '#A55EEA',
    fontSize: 11,
    fontWeight: '900',
  },
  socialitePill: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
  },
  socialiteText: {
    color: '#F5A623',
    fontSize: 11,
    fontWeight: '900',
  },

  integrationsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  integrationsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  integrationsSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  spotifyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
  },
  spotifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  spotifyTitle: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
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
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 1,
  },

  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: '31%',
    aspectRatio: 3/4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
  },
  addPhotoBtn: {
    width: '31%',
    aspectRatio: 3/4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 6,
  },
  addPhotoText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  bioText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  tagText: {
    color: '#C2FF3D',
    fontSize: 13,
    fontWeight: '600',
  },

  premiumCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  premiumTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  premiumSubtitle: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
});
