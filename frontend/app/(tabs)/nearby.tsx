import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Animated,
  Alert,
  PanResponder,
  Easing
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/src/contexts/AuthContext';
import PremiumUpsellSheet from '@/src/components/PremiumUpsellSheet';

const { width: screenWidth } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const searchTexts = [
  // 'searching nearby gedi friends...',
  // 'searching for gym buddy...',
  // 'searching for clg travels...',
  // 'searching for sham ki gedi...',
  `Game On(Find sports & turf partners)`,
  'Lift Together(Find a gym partner)',
  `⁠Campus Commute (Find someone to commute to college with)`,
  `Shaam Ki Gedi (Find people to go on drives or hang out with)`,
];

const MOCK_NEARBY_PROFILES = [
  {
    user_id: 'mock_nearby_1',
    name: 'Aanya Sharma',
    age: 20,
    college: { name: 'Lady Shri Ram College' },
    picture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    bio: 'Gym enthusiast, coding in Python, looking for a gym buddy! 💪',
    distance: 1.2,
    is_connected: true,
  },
  {
    user_id: 'mock_nearby_2',
    name: 'Rohan Mehta',
    age: 21,
    college: { name: 'St. Stephen\'s College' },
    picture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
    bio: 'Late night gedi and travels around Delhi 🚗 let\'s go!',
    distance: 4.5,
    is_connected: false,
  },
  {
    user_id: 'mock_nearby_3',
    name: 'Gunja Sen',
    age: 19,
    college: { name: 'Miranda House' },
    picture: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&auto=format&fit=crop&q=80',
    bio: 'Looking for college travel companions. Foodie and bibliophile 📚',
    distance: 8.7,
    is_connected: true,
  },
  {
    user_id: 'mock_nearby_4',
    name: 'Kabir Thapar',
    age: 22,
    college: { name: 'Hindu College' },
    picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    bio: 'Always up for a gym session or evening rides.',
    distance: 9.8,
    is_connected: false,
  }
];

export default function NearbyScreen() {
  const router = useRouter();
  const { user, sessionToken } = useAuth();
  const [upsellVisible, setUpsellVisible] = useState(false);

  // Location state
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [readableLocation, setReadableLocation] = useState<string | null>(null);
  const [updatingLoc, setUpdatingLoc] = useState(false);

  // Search states
  const [range, setRange] = useState(5.0); // Default 5.0 km (0-10 km range)
  const [isSearching, setIsSearching] = useState(false);
  const [searchTextIndex, setSearchTextIndex] = useState(0);
  const [nearbyProfiles, setNearbyProfiles] = useState<any[]>([]);
  const [handshakesRemaining, setHandshakesRemaining] = useState(user?.is_premium ? 5 : 1);
  // Track per-profile actions: 'handshake_sent' | 'rejected' | 'connected'
  const [profileStatuses, setProfileStatuses] = useState<Record<string, string>>({});

  // Initialize handshakes from user profile data
  useEffect(() => {
    if (user?.handshakes_remaining !== undefined) {
      setHandshakesRemaining(user.handshakes_remaining);
    }
  }, [user]);

  // Animation values
  const radarAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Custom slider touch mapping for 0 - 10 km with decimal precision (e.g. 9.5 km, 7.6 km)
  const rangeRef = useRef(5.0);
  const startRange = useRef(5.0);
  const sliderWidth = screenWidth - 64; // bounds for touch offset
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: any) => {
        const pageX = evt.nativeEvent.pageX;
        const paddingOffset = 32; // estimation of left padding/margins
        const rawRatio = Math.max(0, Math.min(1, (pageX - paddingOffset) / sliderWidth));
        const newKm = Math.max(0.1, Math.min(10, Math.round(rawRatio * 10 * 10) / 10));
        setRange(newKm);
        rangeRef.current = newKm;
        startRange.current = newKm;
      },
      onPanResponderMove: (evt: any, gestureState: any) => {
        const deltaKm = (gestureState.dx / sliderWidth) * 10;
        const rawKm = startRange.current + deltaKm;
        const newKm = Math.max(0.1, Math.min(10, Math.round(rawKm * 10 * 10) / 10));
        setRange(newKm);
        rangeRef.current = newKm;
      },
    })
  ).current;

  // Pulse effect for the location page logo
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleGetLocation = async () => {
    setUpdatingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to find nearby students.');
        setUpdatingLoc(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      // Save to database
      if (sessionToken && sessionToken !== 'dummy_token') {
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/update-current-location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          })
        });
      }

      // Reverse geocode
      try {
        let geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        if (geocode && geocode[0]) {
          const area = geocode[0].district || geocode[0].city || geocode[0].region || 'Nearby Area';
          setReadableLocation(area);
        } else {
          setReadableLocation('Current Location');
        }
      } catch (e) {
        setReadableLocation('Current Location');
      }

      setLocationEnabled(true);
    } catch (e: any) {
      console.warn('Failed to retrieve device location:', e);
      Alert.alert('Error', 'Could not access device location coordinates.');
    } finally {
      setUpdatingLoc(false);
    }
  };

  const startSearching = () => {
    if (!latitude || !longitude) {
      Alert.alert('Location Required', 'Please authorize and acquire your current location coordinates.');
      return;
    }

    setIsSearching(true);
    setSearchTextIndex(0);

    // Radar sweep rotation loop
    rotationAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();

    // Loop through search texts
    const intervalId = setInterval(() => {
      setSearchTextIndex(prev => (prev + 1) % searchTexts.length);
    }, 850);

    setTimeout(async () => {
      clearInterval(intervalId);
      await fetchNearby();
      setIsSearching(false);
    }, 3400); // 3.4 seconds total search animation loop
  };

  const fetchNearby = async () => {
    if (sessionToken === 'dummy_token') {
      // Mock and filter by mock distance
      const filtered = MOCK_NEARBY_PROFILES.filter(p => p.distance <= range);
      setNearbyProfiles(filtered);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/nearby?range=${range}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNearbyProfiles(data.profiles || []);
        if (data.handshakes_remaining !== undefined) {
          setHandshakesRemaining(data.handshakes_remaining);
        }
      } else {
        throw new Error('Failed to retrieve nearby list');
      }
    } catch (err: any) {
      console.error('[fetchNearby Error]:', err);
      Alert.alert('Search Error', 'Unable to retrieve nearby coordinates profile matches.');
    }
  };

  const handleProfileClick = (userItem: any) => {
    const status = userItem.nearby_status || (userItem.is_connected ? 'connected' : 'none');

    if (status === 'connected') {
      // Redirect directly to the user chat inbox page
      router.push(`/chat/${userItem.user_id}`);
    } else if (status === 'handshake_sent' || status === 'rejected') {
      Alert.alert(
        status === 'handshake_sent' ? 'Handshake Sent 🤝' : 'Pass / Rejected ❌',
        status === 'handshake_sent'
          ? `You have already sent a handshake to ${userItem.name}. Wait for them to match with you!`
          : `You passed on ${userItem.name}. You cannot view their profile right now.`
      );
    } else {
      // Check if handshakes remaining
      if (handshakesRemaining <= 0) {
        setUpsellVisible(true);
        return;
      }
      // Redirect to the vibe page with specific focus on this profile
      router.push({
        pathname: '/(tabs)/discover',
        params: {
          targetUserId: userItem.user_id,
          fromNearby: 'true'
        }
      });
    }
  };

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
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

      <SafeAreaView style={styles.safeContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.titleRow}>
              <Ionicons name="location" size={24} color="#C2FF3D" />
              <Text style={styles.headerTitle}>nearby</Text>
            </View>

            <TouchableOpacity
              style={styles.handshakeCountPill}
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert(
                  'Weekly Handshakes ',
                  `You have ${handshakesRemaining} handshake${handshakesRemaining === 1 ? '' : 's'} remaining this week. Handshakes allow you to connect directly with students nearby!\n\nLimits: 1/week for free members, 5/week for Premium members. Resets every Sunday at 4 AM.`
                );
              }}
            >
              <MaterialCommunityIcons name="handshake" size={18} color="#C2FF3D" style={{ marginRight: 4 }} />
              <Text style={styles.handshakeCountText}>{handshakesRemaining}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Connect with campus students around you</Text>
        </View>

        {/* 1. INITIAL ENABLE LOCATION STATE */}
        {!locationEnabled ? (
          <View style={styles.centerContainer}>
            <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="compass-outline" size={48} color="#C2FF3D" />
            </Animated.View>
            <Text style={styles.mainTitle}>Discover Campus Connections</Text>
            <Text style={styles.mainDesc}>
              Allow Off-Campus to read your current location to connect you with nearby matches, gedi friends, and gym buddies.
            </Text>

            <TouchableOpacity style={styles.mainActionBtn} onPress={handleGetLocation} activeOpacity={0.8} disabled={updatingLoc}>
              <LinearGradient colors={['#C2FF3D', '#9BC72B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                {updatingLoc ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={18} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.btnText}>Use Current Location</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          /* 2. RADAR SEARCH LOADER ANIMATION STATE */
          isSearching ? (
            <View style={styles.radarContainer}>
              <View style={styles.radarOuterCircle}>
                {/* Grid Lines */}
                <View style={[styles.radarGridRing, { width: '80%', height: '80%', borderRadius: 130 }]} />
                <View style={[styles.radarGridRing, { width: '55%', height: '55%', borderRadius: 90 }]} />
                <View style={[styles.radarGridRing, { width: '30%', height: '30%', borderRadius: 50 }]} />
                
                {/* Crosshair Axes */}
                <View style={styles.radarCrosshairH} />
                <View style={styles.radarCrosshairV} />

                {/* Rotating Sweep Beam */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      transform: [{ rotate: spin }],
                    }
                  ]}
                >
                  {/* Glowing Beam line */}
                  <View style={styles.radarSweepLine} />
                  {/* Fade tail wedge */}
                  <LinearGradient
                    colors={['rgba(194, 255, 61, 0.15)', 'rgba(194, 255, 61, 0)']}
                    start={{ x: 1, y: 1 }}
                    end={{ x: 0, y: 0 }}
                    style={styles.radarSweepTail}
                  />
                </Animated.View>

                {/* Glowing Target Dots representing nearby students */}
                <View style={[styles.radarTargetDot, { top: '25%', left: '30%' }]} />
                <View style={[styles.radarTargetDot, { top: '35%', left: '72%' }]} />
                <View style={[styles.radarTargetDot, { top: '65%', left: '22%' }]} />
                <View style={[styles.radarTargetDot, { top: '55%', left: '62%' }]} />
                <View style={[styles.radarTargetDot, { top: '78%', left: '46%' }]} />

                {/* Center User Pin */}
                <View style={styles.radarCenterPin}>
                  <Image
                    source={{ uri: user?.photos?.[0] || user?.picture || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2662&auto=format&fit=crop' }}
                    style={styles.radarCenterPfp}
                  />
                  <View style={styles.radarCenterPulse} />
                </View>
              </View>

              <Text style={styles.searchingLabel}>
                {searchTexts[searchTextIndex]}
              </Text>
              <Text style={styles.radarRangeIndicator}>radius: {range.toFixed(1)} km</Text>
            </View>
          ) : (
            /* 3. SETTINGS & PROFILE MATCHES LIST VIEW */
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

              {/* Location display + Range selection card */}
              <BlurView intensity={25} tint="dark" style={styles.controlsCard}>
                <View style={styles.locStatusRow}>
                  <View style={styles.locStatusPoint}>
                    <Ionicons name="checkmark-circle" size={16} color="#C2FF3D" style={{ marginRight: 4 }} />
                    <Text style={styles.locStatusLabel}>Linked Location:</Text>
                  </View>
                  <Text style={styles.locStatusValue}>{readableLocation || 'Acquired Coordinate'}</Text>
                </View>

                {/* Range Selector */}
                <Text style={styles.rangeTitle}>Search Range Radius</Text>
                <View style={styles.sliderWrapper}>
                  <View style={styles.sliderTrackContainer} {...panResponder.panHandlers}>
                    <View style={styles.sliderTrackBg} />
                    <View style={[styles.sliderTrackActive, { width: `${(range / 10) * 100}%` }]} />
                    <View style={[styles.sliderThumb, { left: `${(range / 10) * 100}%` }]} />
                  </View>
                  <View style={styles.sliderLabelsRow}>
                    <Text style={styles.sliderLimitText}>0 km</Text>
                    <Text style={styles.sliderValueText}>{range.toFixed(1)} km</Text>
                    <Text style={styles.sliderLimitText}>10 km</Text>
                  </View>
                </View>

                {/* Start Search & Change Location Buttons */}
                <View style={styles.searchBtnsRow}>
                  <TouchableOpacity style={styles.searchBtn} onPress={startSearching} activeOpacity={0.8}>
                    <LinearGradient colors={['#C2FF3D', '#9BC72B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.searchBtnGradient}>
                      <Text style={styles.searchBtnText}>Start Search</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetLocBtn}
                    onPress={() => {
                      setLocationEnabled(false);
                      setLatitude(null);
                      setLongitude(null);
                      setReadableLocation(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetLocBtnText}>Change Location</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>

              {/* Profiles List */}
              <View style={styles.resultsHeaderRow}>
                <Text style={styles.resultsTitle}>Nearby Students</Text>
                <Text style={styles.resultsCount}>{nearbyProfiles.length} found</Text>
              </View>

              {nearbyProfiles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={44} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyText}>no nearby profiles sorry try at a different location</Text>
                  <Text style={styles.emptySubtext}>Try changing your location or increasing the range.</Text>
                </View>
              ) : (
                <View style={styles.profilesGrid}>
                  {nearbyProfiles.map((userItem) => (
                    <TouchableOpacity
                      key={userItem.user_id}
                      style={styles.profileCard}
                      onPress={() => handleProfileClick(userItem)}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: userItem.picture || userItem.photos?.[0] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }} style={styles.profileImage} />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.cardGradient} />

                      {/* Connection/Action Badge */}
                      {userItem.nearby_status === 'connected' || userItem.is_connected ? (
                        <View style={styles.connectedBadge}>
                          <Text style={styles.connectedBadgeText}>CONNECTED 💬</Text>
                        </View>
                      ) : userItem.nearby_status === 'handshake_sent' ? (
                        <View style={[styles.connectedBadge, { backgroundColor: '#3B82F6' }]}>
                          <Text style={styles.connectedBadgeText}>HANDSHAKE SENT 🤝</Text>
                        </View>
                      ) : userItem.nearby_status === 'rejected' ? (
                        <View style={[styles.connectedBadge, { backgroundColor: '#EF4444' }]}>
                          <Text style={styles.connectedBadgeText}>REJECTED ❌</Text>
                        </View>
                      ) : (
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceBadgeText}>{userItem.distance} km away</Text>
                        </View>
                      )}

                      {/* User Info Overlay */}
                      <View style={styles.profileInfo}>
                        <Text style={styles.profileName} numberOfLines={1}>
                          {userItem.name}, {userItem.age}
                        </Text>
                        <Text style={styles.profileCollege} numberOfLines={1}>
                          {userItem.college?.name || 'College Member'}
                        </Text>
                        {userItem.bio ? (
                          <Text style={styles.profileBio} numberOfLines={1}>
                            {userItem.bio}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Extra spacing for Bottom Tab Bar overlap */}
              <View style={{ height: 100 }} />
            </ScrollView>
          )
        )}
      </SafeAreaView>

      <PremiumUpsellSheet
        visible={upsellVisible}
        onClose={() => setUpsellVisible(false)}
        title="Weekly Handshakes Used! 🤝"
        featureName="5 Weekly Handshakes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  safeContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  handshakeCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  handshakeCountText: {
    color: '#C2FF3D',
    fontSize: 15,
    fontWeight: '900',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.2)',
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  mainDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  mainActionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  btnGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  radarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCenter: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  radarPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
  },
  radarCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C2FF3D',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  radarOuterCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(194, 255, 61, 0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  radarGridRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.12)',
    borderStyle: 'dashed',
  },
  radarCrosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  radarCrosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  radarSweepLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2.5,
    height: '50%',
    backgroundColor: '#C2FF3D',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  radarSweepTail: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: '50%',
    height: '50%',
    borderTopRightRadius: 140,
  },
  radarTargetDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C2FF3D',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  radarCenterPin: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F061A',
    borderWidth: 2,
    borderColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  radarCenterPfp: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  radarCenterPulse: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#C2FF3D',
    opacity: 0.35,
  },
  searchingLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  radarRangeIndicator: {
    color: 'rgba(194, 255, 61, 0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  controlsCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  locStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  locStatusPoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locStatusLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  locStatusValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  rangeTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 12,
  },
  sliderWrapper: {
    marginBottom: 20,
  },
  sliderTrackContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrackBg: {
    position: 'absolute',
    height: 5,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
  },
  sliderTrackActive: {
    position: 'absolute',
    height: 5,
    backgroundColor: '#C2FF3D',
    borderRadius: 3,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#C2FF3D',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sliderLimitText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  sliderValueText: {
    color: '#C2FF3D',
    fontSize: 15,
    fontWeight: '900',
  },
  searchBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  searchBtnGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  searchBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  resetLocBtn: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resetLocBtnText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  resultsCount: {
    color: 'rgba(194, 255, 61, 0.8)',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileCard: {
    width: (screenWidth - 44) / 2,
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#151221',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  distanceBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  connectedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(194, 255, 61, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#C2FF3D',
  },
  connectedBadgeText: {
    color: '#C2FF3D',
    fontSize: 9,
    fontWeight: '900',
  },
  profileInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  profileName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  profileCollege: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  profileBio: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
