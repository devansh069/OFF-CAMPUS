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
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Campus() {
  const { user, sessionToken, refreshUser } = useAuth();
  const [campusUsers, setCampusUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<string>('undetermined');
  const [isOnCampus, setIsOnCampus] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [college, setCollege] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    await fetchCollege();
    await fetchCampusUsers();
    setLoading(false);
  };

  const fetchCollege = async () => {
    if (!user?.college_id) return;
    if (sessionToken === 'dummy_token') {
      setCollege({
        college_id: 'col_stephens',
        name: "St. Stephen's College",
        short_name: "Stephens",
        location: "University Enclave, Delhi",
        latitude: 28.6906,
        longitude: 77.2160
      });
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user.college_id}`);
      if (!response.ok) throw new Error('Failed to fetch college');
      const data = await response.json();
      setCollege(data.college);
    } catch (error: any) {
      console.warn('Error fetching college, using mock:', error.message);
      setCollege({
        college_id: 'col_stephens',
        name: "St. Stephen's College",
        short_name: "Stephens",
        location: "University Enclave, Delhi",
        latitude: 28.6906,
        longitude: 77.2160
      });
    }
  };

  const fetchCampusUsers = async () => {
    if (sessionToken === 'dummy_token') {
      setCampusUsers([
        {
          user_id: 'user_priya',
          name: 'Priya Singh',
          age: 20,
          year: '2nd Year',
          course: 'Psychology',
          vibe_score: 4.9,
          photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'],
          picture: null,
          is_on_campus: true
        },
        {
          user_id: 'user_ananya',
          name: 'Ananya Kapoor',
          age: 19,
          year: '1st Year',
          course: 'English Literature',
          vibe_score: 4.6,
          photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop'],
          picture: null,
          is_on_campus: true
        }
      ]);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/location/campus-users`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch campus users');
      const data = await response.json();
      setCampusUsers(data.users || []);
    } catch (error: any) {
      console.warn('Error fetching campus users, using mock:', error.message);
      setCampusUsers([
        {
          user_id: 'user_priya',
          name: 'Priya Singh',
          age: 20,
          year: '2nd Year',
          course: 'Psychology',
          vibe_score: 4.9,
          photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'],
          picture: null,
          is_on_campus: true
        },
        {
          user_id: 'user_ananya',
          name: 'Ananya Kapoor',
          age: 19,
          year: '1st Year',
          course: 'English Literature',
          vibe_score: 4.6,
          photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop'],
          picture: null,
          is_on_campus: true
        }
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const requestLocationAndCheckIn = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'We need location access to check if you\'re on campus',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Update location on backend
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });

      const data = await response.json();
      setIsOnCampus(data.is_on_campus);
      setDistance(data.distance_km);
      
      await fetchCampusUsers();
      await refreshUser();

      if (data.is_on_campus) {
        Alert.alert('Welcome! 🎉', 'You\'re on campus. Other students can see you now!');
      } else {
        Alert.alert('Off Campus', `You're ${data.distance_km}km away from campus. Get closer to check in!`);
      }
    } catch (error) {
      console.error('Error with location:', error);
      Alert.alert('Error', 'Failed to get your location');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampusUsers();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3366" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Campus</Text>
          <Text style={styles.subtitle}>{college?.name || 'Loading...'}</Text>
        </View>

        <LinearGradient
          colors={isOnCampus ? ['#4FC3F7', '#1E88E5'] : ['#FF3366', '#FF6B35']}
          style={styles.statusCard}
        >
          <View style={styles.statusIcon}>
            <Ionicons
              name={isOnCampus ? 'checkmark-circle' : 'location'}
              size={48}
              color="#FFF"
            />
          </View>
          <Text style={styles.statusTitle}>
            {isOnCampus ? 'You\'re on Campus!' : 'Check In to Campus'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isOnCampus
              ? 'Your profile is now visible to others on campus'
              : 'Share your location to see who\'s here'}
          </Text>
          {distance !== null && !isOnCampus && (
            <Text style={styles.distanceText}>{distance} km away</Text>
          )}
          <TouchableOpacity style={styles.checkInButton} onPress={requestLocationAndCheckIn} testID="checkin-btn">
            <Ionicons name="navigate" size={20} color="#FF3366" />
            <Text style={styles.checkInButtonText}>
              {isOnCampus ? 'Update Location' : 'Check In Now'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>On Campus Now</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{campusUsers.length}</Text>
            </View>
          </View>

          {campusUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#444" />
              <Text style={styles.emptyText}>No one's on campus right now</Text>
              <Text style={styles.emptySubText}>Be the first to check in!</Text>
            </View>
          ) : (
            <View style={styles.usersList}>
              {campusUsers.map((u: any) => (
                <TouchableOpacity key={u.user_id} style={styles.userCard}>
                  <Image
                    source={{ uri: u.photos?.[0] || u.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMzMzIi8+PC9zdmc+' }}
                    style={styles.userImage}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name}, {u.age}</Text>
                    <Text style={styles.userDetails}>{u.year} • {u.course}</Text>
                    <View style={styles.userMeta}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.userVibe}>{u.vibe_score?.toFixed(1)}</Text>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Active</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  header: { padding: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  statusCard: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: { marginBottom: 8 },
  statusTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  statusSubtitle: { fontSize: 14, color: '#FFF', opacity: 0.9, textAlign: 'center' },
  distanceText: { fontSize: 18, color: '#FFF', fontWeight: '600', marginTop: 4 },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginTop: 12,
  },
  checkInButtonText: { color: '#FF3366', fontSize: 16, fontWeight: 'bold' },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  badge: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  usersList: { gap: 12 },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
  },
  userImage: { width: 60, height: 60, borderRadius: 30 },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  userDetails: { fontSize: 13, color: '#999' },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  userVibe: { color: '#FFD700', fontSize: 12, fontWeight: '600', marginRight: 8 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  onlineText: { color: '#4CAF50', fontSize: 12, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 16, color: '#FFF', fontWeight: '600', marginTop: 12 },
  emptySubText: { fontSize: 14, color: '#888' },
});
