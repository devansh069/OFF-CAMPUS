import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Discover() {
  const { user, sessionToken } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMatch, setShowMatch] = useState<any>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });
      const data = await response.json();
      setProfiles(data.profiles || []);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ target_user_id: profile.user_id }),
      });

      const data = await response.json();
      if (data.is_match) {
        setShowMatch(profile);
      }
      nextProfile();
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const handlePass = async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ target_user_id: profile.user_id }),
      });
      nextProfile();
    } catch (error) {
      console.error('Error passing:', error);
    }
  };

  const nextProfile = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      fetchProfiles();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  const profile = profiles[currentIndex];

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchProfiles();
            }} tintColor="#FF3366" />
          }
        >
          <Ionicons name="search" size={80} color="#444" />
          <Text style={styles.emptyText}>No more profiles!</Text>
          <Text style={styles.emptySubText}>Pull to refresh or check back later</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Off Campus</Text>
        <View style={styles.headerIcons}>
          <Ionicons name="filter" size={24} color="#FFF" />
        </View>
      </View>

      <ScrollView style={styles.cardContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Image
            source={{ uri: profile.photos?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==' }}
            style={styles.cardImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.cardOverlay}
          >
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.cardName}>{profile.name}, {profile.age}</Text>
                {profile.verification_status === 'verified' && (
                  <Ionicons name="checkmark-circle" size={24} color="#4FC3F7" />
                )}
              </View>
              <View style={styles.vibeRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.vibeScore}>Vibe Score: {profile.vibe_score?.toFixed(1)}</Text>
              </View>
              <Text style={styles.cardCollege}>{profile.year} • {profile.course}</Text>
            </View>
          </LinearGradient>
        </View>

        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{profile.bio}</Text>
          </View>
        )}

        {profile.interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.tagsRow}>
              {profile.interests.map((interest: string) => (
                <View key={interest} style={styles.tag}>
                  <Text style={styles.tagText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {profile.spotify_data?.top_artists?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.spotifyHeader}>
              <Ionicons name="musical-notes" size={20} color="#1DB954" />
              <Text style={styles.sectionTitle}>Spotify Vibes</Text>
            </View>
            <Text style={styles.spotifyLabel}>Top Artists:</Text>
            <View style={styles.tagsRow}>
              {profile.spotify_data.top_artists.map((artist: string) => (
                <View key={artist} style={[styles.tag, { backgroundColor: '#1DB95433' }]}>
                  <Text style={[styles.tagText, { color: '#1DB954' }]}>{artist}</Text>
                </View>
              ))}
            </View>
            {profile.spotify_data.top_tracks?.length > 0 && (
              <>
                <Text style={[styles.spotifyLabel, { marginTop: 12 }]}>Top Tracks:</Text>
                <View style={styles.tagsRow}>
                  {profile.spotify_data.top_tracks.map((track: string) => (
                    <View key={track} style={[styles.tag, { backgroundColor: '#1DB95422' }]}>
                      <Text style={[styles.tagText, { color: '#1DB954' }]}>{track}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.passButton]} onPress={handlePass} testID="pass-btn">
          <Ionicons name="close" size={32} color="#FF3366" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={handleLike} testID="like-btn">
          <Ionicons name="heart" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>

      {showMatch && (
        <View style={styles.matchOverlay}>
          <LinearGradient colors={['#FF3366', '#FF6B35']} style={styles.matchContent}>
            <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
            <Text style={styles.matchSubtitle}>You and {showMatch.name} liked each other</Text>
            <Image source={{ uri: showMatch.photos?.[0] }} style={styles.matchPhoto} />
            <TouchableOpacity
              style={styles.matchButton}
              onPress={() => setShowMatch(null)}
            >
              <Text style={styles.matchButtonText}>Keep Swiping</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF3366',
  },
  headerIcons: { flexDirection: 'row', gap: 16 },
  cardContainer: { flex: 1, paddingHorizontal: 16 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    height: 500,
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardInfo: { gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  vibeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vibeScore: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  cardCollege: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#DDD',
    lineHeight: 20,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#FF336633',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: { color: '#FF3366', fontSize: 13, fontWeight: '600' },
  spotifyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  spotifyLabel: { color: '#999', fontSize: 12, marginBottom: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: 16,
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  passButton: { backgroundColor: '#FFF' },
  likeButton: { backgroundColor: '#FF3366' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubText: { fontSize: 14, color: '#888' },
  matchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  matchContent: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  matchTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  matchSubtitle: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  matchPhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  matchButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  matchButtonText: {
    color: '#FF3366',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
