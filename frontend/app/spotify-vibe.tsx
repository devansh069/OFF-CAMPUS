import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';

export default function SpotifyVibe() {
  const { user } = useAuth();
  const router = useRouter();

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  if (!user) return null;

  // Generate top 10 songs
  const topTracks = user.spotify_data?.top_tracks && user.spotify_data.top_tracks.length > 0
    ? user.spotify_data.top_tracks
    : [
        { name: 'Starboy', artist: 'The Weeknd', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
        { name: 'Levitating', artist: 'Dua Lipa', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
        { name: 'Peaches', artist: 'Justin Bieber', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
        { name: 'Blinding Lights', artist: 'The Weeknd', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
        { name: 'Stay', artist: 'Kid LAROI & Justin Bieber', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
        { name: 'Bad Habits', artist: 'Ed Sheeran', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
        { name: 'Industry Baby', artist: 'Lil Nas X & Jack Harlow', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
        { name: 'Save Your Tears', artist: 'The Weeknd', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
        { name: 'Good 4 U', artist: 'Olivia Rodrigo', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
        { name: 'Kiss Me More', artist: 'Doja Cat', preview_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
      ];

  const handlePlayPause = async (track: any) => {
    const previewUrl = track.preview_url;
    if (previewUrl) {
      try {
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }

        if (playingUrl === previewUrl) {
          setPlayingUrl(null);
          return;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: previewUrl },
          { shouldPlay: true }
        );

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
            setPlayingUrl(null);
            setSound(null);
          }
        });

        setSound(newSound);
        setPlayingUrl(previewUrl);
      } catch (e) {
        console.warn('Failed to play preview', e);
      }
    } else {
      // Redirection fallback: Open in Spotify app directly
      const targetUrl = track.spotify_url || track.uri;
      if (targetUrl) {
        try {
          const supported = await Linking.canOpenURL(targetUrl);
          if (supported) {
            await Linking.openURL(targetUrl);
          } else if (track.spotify_url) {
            await Linking.openURL(track.spotify_url);
          } else {
            Alert.alert('Spotify App Not Found', 'Could not open Spotify app.');
          }
        } catch (e) {
          console.warn('Could not open Spotify Link', e);
          if (track.spotify_url) {
            Linking.openURL(track.spotify_url);
          }
        }
      } else {
        Alert.alert('Playback Link Unavailable', 'Spotify playback link is not available for this track.');
      }
    }
  };

  const spotifyUsername = `@${user.name.toLowerCase().replace(/ /g, '_')}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#C2FF3D" />
          </TouchableOpacity>
          <View style={styles.spotifyLogoContainer}>
            <MaterialCommunityIcons name="spotify" size={28} color="#1DB954" style={{ marginRight: 6 }} />
            <Text style={styles.logoText}>Spotify Vibe</Text>
          </View>
          <Text style={styles.username}>{spotifyUsername}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Your Top Songs</Text>
            <Text style={styles.subtitle}>These tracks are boosting your Vibe Score right now</Text>
          </View>

          <View style={styles.tracksList}>
            {topTracks.map((track: any, index: number) => {
              let title = '';
              let artist = 'Spotify Artist';
              let previewUrl = null;

              if (typeof track === 'string') {
                const parts = track.split(' - ');
                title = parts[0] || track;
                artist = parts[1] || 'Spotify Artist';
              } else if (track && typeof track === 'object') {
                title = track.name || '';
                artist = track.artist || '';
                previewUrl = track.preview_url;
              }

              const isPlaying = previewUrl && playingUrl === previewUrl;

              return (
                <TouchableOpacity 
                  key={index} 
                  style={styles.trackItem}
                  onPress={() => handlePlayPause(track)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.trackIndex}>{index + 1}</Text>
                  <View style={styles.trackIconBox}>
                    <Ionicons name="musical-notes" size={16} color="#C2FF3D" />
                  </View>
                  <View style={styles.trackMeta}>
                    <Text style={styles.trackTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>{artist}</Text>
                  </View>
                  <View style={{ padding: 4 }}>
                    {previewUrl ? (
                      <Ionicons
                        name={isPlaying ? 'pause-circle' : 'play-circle'}
                        size={28}
                        color="#C2FF3D"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="spotify"
                        size={26}
                        color="#1DB954"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 4,
  },
  spotifyLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  username: {
    color: '#C2FF3D',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 28,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  tracksList: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 97, 0.1)',
    padding: 12,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
  },
  trackIndex: {
    color: '#C2FF3D',
    fontSize: 14,
    fontWeight: '800',
    width: 24,
  },
  trackIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  trackMeta: {
    flex: 1,
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
});
