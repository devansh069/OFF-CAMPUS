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
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Profile() {
  const { user, sessionToken, logout, refreshUser } = useAuth();
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
                  top_tracks: ['As It Was', 'Heat Waves', 'Stay'],
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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#FF3366', '#FF6B35']} style={styles.header}>
          <View style={styles.headerActions}>
            <View style={{ width: 24 }} />
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={handleLogout} testID="logout-btn">
              <Ionicons name="log-out-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: user.picture || user.photos?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=='
              }}
              style={styles.avatar}
            />
            {user.verification_status === 'verified' && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={28} color="#4FC3F7" />
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
          <Text style={styles.email}>{user.email}</Text>

          <View style={styles.vibeScoreCard}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <View>
              <Text style={styles.vibeLabel}>Vibe Score</Text>
              <Text style={styles.vibeValue}>{user.vibe_score?.toFixed(1)}/5.0</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Ionicons
              name={user.verification_status === 'verified' ? 'checkmark-circle' : 'time'}
              size={20}
              color={user.verification_status === 'verified' ? '#4CAF50' : '#FFA500'}
            />
            <Text style={styles.statusText}>
              {user.verification_status === 'verified' ? 'Verified' : 'Pending'}
            </Text>
          </View>
          {user.is_premium && (
            <View style={styles.statusItem}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.statusText}>Premium</Text>
            </View>
          )}
          {user.is_on_campus && (
            <View style={styles.statusItem}>
              <View style={styles.greenDot} />
              <Text style={styles.statusText}>On Campus</Text>
            </View>
          )}
        </View>

        {college && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>COLLEGE</Text>
            <View style={styles.infoCard}>
              <Ionicons name="school" size={24} color="#FF3366" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>{college.name}</Text>
                <Text style={styles.infoSubtitle}>{college.location}</Text>
              </View>
            </View>
          </View>
        )}

        {user.year && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACADEMICS</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Year</Text>
              <Text style={styles.infoValue}>{user.year}</Text>
            </View>
            {user.course && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Course</Text>
                <Text style={styles.infoValue}>{user.course}</Text>
              </View>
            )}
          </View>
        )}

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

        <TouchableOpacity style={styles.spotifyCard} onPress={addSpotifyData}>
          <View style={styles.spotifyHeader}>
            <Ionicons name="musical-notes" size={28} color="#1DB954" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.spotifyTitle}>Spotify Vibes</Text>
              <Text style={styles.spotifySubtitle}>
                {user.spotify_data?.top_artists?.length
                  ? `${user.spotify_data.top_artists.length} artists added`
                  : 'Connect your music taste'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
          {user.spotify_data?.top_artists?.length > 0 && (
            <View style={[styles.tagsRow, { marginTop: 12 }]}>
              {user.spotify_data.top_artists.slice(0, 3).map((artist: string) => (
                <View key={artist} style={[styles.tag, { backgroundColor: '#1DB95422' }]}>
                  <Text style={[styles.tagText, { color: '#1DB954' }]}>{artist}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {!user.is_premium && (
          <TouchableOpacity style={styles.premiumCard}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.premiumGradient}
            >
              <Ionicons name="star" size={32} color="#FFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.premiumTitle}>Get Premium</Text>
                <Text style={styles.premiumSubtitle}>
                  Access students from all colleges & more!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    padding: 20,
    paddingBottom: 30,
    alignItems: 'center',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 14,
  },
  name: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  email: { fontSize: 14, color: '#FFF', opacity: 0.9 },
  vibeScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
  },
  vibeLabel: { color: '#FFF', fontSize: 12, opacity: 0.9 },
  vibeValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  infoSubtitle: { color: '#999', fontSize: 13, marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    padding: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  infoLabel: { color: '#999', fontSize: 14 },
  infoValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  bioText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#FF336633',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { color: '#FF3366', fontSize: 13, fontWeight: '600' },
  spotifyCard: {
    margin: 16,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  spotifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spotifyTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  spotifySubtitle: { color: '#999', fontSize: 13, marginTop: 2 },
  premiumCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  premiumTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  premiumSubtitle: { color: '#FFF', fontSize: 13, opacity: 0.9 },
});
