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
  Animated,
  Modal,
  Switch,
  PanResponder
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

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
    category: 'Default',
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

const MOCK_PROFILES = [
  {
    user_id: 'user_priya',
    name: 'Priya Singh',
    age: 20,
    gender: 'female',
    college_id: 'col_lsr',
    year: '2nd Year',
    course: 'Psychology',
    bio: 'Bookworm and art enthusiast 🎨📚 Let\'s talk about anything from philosophy to sitcoms!',
    interests: ['Reading', 'Art', 'Yoga', 'Music'],
    looking_for: 'friends',
    photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'],
    vibe_score: 4.9,
    is_on_campus: true,
    verification_status: 'verified'
  },
  {
    user_id: 'user_rohan',
    name: 'Rohan Mehta',
    age: 22,
    gender: 'male',
    college_id: 'col_mait',
    year: '4th Year',
    course: 'Computer Science',
    bio: 'Tech geek | Gamer | Meme lord 🎮. Building cool things on the internet.',
    interests: ['Gaming', 'Coding', 'Anime', 'Music'],
    looking_for: 'dating',
    photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop'],
    vibe_score: 4.2,
    is_on_campus: false,
    verification_status: 'verified'
  },
  {
    user_id: 'user_ananya',
    name: 'Ananya Kapoor',
    age: 19,
    gender: 'female',
    college_id: 'col_miranda',
    year: '1st Year',
    course: 'English Literature',
    bio: 'Poet | Dreamer | Coffee addict ☕✨ Always down for bookstore dates.',
    interests: ['Poetry', 'Writing', 'Dance', 'Travel'],
    looking_for: 'dating',
    photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop'],
    vibe_score: 4.6,
    is_on_campus: true,
    verification_status: 'verified'
  },
  {
    user_id: 'user_kabir',
    name: 'Kabir Malhotra',
    age: 23,
    gender: 'male',
    college_id: 'col_iitd',
    year: 'Final Year',
    course: 'Mechanical Engineering',
    bio: 'Gym rat 💪 | Fitness freak | Adventure junkie. Looking for a workout partner.',
    interests: ['Fitness', 'Trekking', 'Sports', 'Photography'],
    looking_for: 'friends',
    photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop'],
    vibe_score: 4.4,
    is_on_campus: false,
    verification_status: 'verified'
  }
];

const MOCK_PROMPTS = [
  { index: 1, title: "My best side 📸" },
  { index: 3, title: "Typical Sunday look ☀️" },
  { index: 5, title: "My best outfit 👗" }
];

const getProfilePhotos = (profile: any) => {
  const photos = [...(profile.photos || [])];

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
    // Prevent duplicate entries of the first photo in fallback array
    const photoToPush = fallbackPool[nextIdx >= 0 ? nextIdx : 0];
    photos.push(photoToPush);
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
  if (inches === 12) {
    return `${feet + 1}' 0"`;
  }
  return `${feet}' ${inches}"`;
};

const getScrollableItems = (profile: any) => {
  let height = profile.height;
  let religion = profile.religion;
  let looking = profile.looking_for;
  let drink = profile.drink;
  let smoke = profile.smoke;
  let weed = profile.weed;
  let location = profile.location;
  let state = profile.state;

  // Generate deterministic mock values based on name/ID if not present
  const hash = (profile.name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  
  if (!height) {
    height = profile.gender === 'female' ? 155 + (hash % 15) : 170 + (hash % 18);
  }
  if (!religion) {
    const religions = ['Hindu', 'Sikh', 'Christian', 'Muslim', 'Jain'];
    religion = religions[hash % religions.length];
  }
  if (!looking) {
    looking = (hash % 2 === 0) ? 'dating' : 'friends';
  }
  if (!drink) {
    drink = (hash % 3 === 0) ? 'yes' : 'no';
  }
  if (!smoke) {
    smoke = (hash % 4 === 0) ? 'yes' : 'no';
  }
  if (!weed) {
    weed = (hash % 5 === 0) ? 'yes' : 'no';
  }
  if (!location) {
    const locations = ['Saket', 'Karol Bagh', 'Dwarka', 'Hauz Khas', 'Noida', 'Gurgaon', 'GK-2', 'Vasant Kunj'];
    location = locations[hash % locations.length];
  }
  if (!state) {
    state = (location === 'Noida') ? 'UP' : (location === 'Gurgaon') ? 'Haryana' : 'Delhi';
  }

  const genderLabel = profile.gender 
    ? (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)) 
    : 'Man';

  const heightVal = cmToFeetInches(height);
  const locationLabel = `${location}, ${state}`;
  const religionLabel = religion;
  
  const lookingLabel = looking === 'friends' ? 'Friends' : looking === 'dating' ? 'Dating' : looking === 'all' ? 'Dating/Friends' : looking;
  
  const drinkLabel = drink.toLowerCase() === 'yes' ? 'Drinks' : 'Drink: No';
  const smokeLabel = smoke.toLowerCase() === 'yes' ? 'Smoker' : 'Smoke: No';
  const weedLabel = weed.toLowerCase() === 'yes' ? 'Weed' : 'Weed: No';

  return [
    { icon: (profile.gender === 'female' ? 'female-outline' : profile.gender === 'male' ? 'male-outline' : 'person-outline'), text: genderLabel },
    { icon: 'resize-outline', text: heightVal },
    { icon: 'location-outline', text: locationLabel },
    { icon: 'heart-outline', text: lookingLabel },
    { icon: 'sparkles-outline', text: religionLabel },
    { icon: 'wine-outline', text: drinkLabel },
    { icon: 'flame-outline', text: smokeLabel },
    { icon: 'leaf-outline', text: weedLabel },
  ];
};

interface RangeSliderProps {
  min: number;
  max: number;
  minVal: number;
  maxVal: number;
  onChange: (minVal: number, maxVal: number) => void;
  suffix?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, minVal, maxVal, onChange, suffix = '' }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const startMinVal = useRef(minVal);
  const startMaxVal = useRef(maxVal);

  const minPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMinVal.current = minVal;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidth === 0) return;
        const change = (gestureState.dx / trackWidth) * (max - min);
        let newVal = Math.round(startMinVal.current + change);
        newVal = Math.max(min, Math.min(newVal, maxVal - 1));
        onChange(newVal, maxVal);
      },
    })
  ).current;

  const maxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMaxVal.current = maxVal;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidth === 0) return;
        const change = (gestureState.dx / trackWidth) * (max - min);
        let newVal = Math.round(startMaxVal.current + change);
        newVal = Math.max(minVal + 1, Math.min(newVal, max));
        onChange(minVal, newVal);
      },
    })
  ).current;

  const getPercent = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  const leftPercent = getPercent(minVal);
  const rightPercent = getPercent(maxVal);

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.valueText}>
          {minVal}{suffix} - {maxVal}{suffix}
        </Text>
      </View>
      <View 
        style={sliderStyles.trackContainer}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={sliderStyles.inactiveTrack} />
        <View 
          style={[
            sliderStyles.activeTrack, 
            { 
              left: `${leftPercent}%`, 
              right: `${100 - rightPercent}%` 
            }
          ]} 
        />
        <View 
          {...minPanResponder.panHandlers}
          style={[
            sliderStyles.handle, 
            { left: `${leftPercent}%`, marginLeft: -12 }
          ]} 
        />
        <View 
          {...maxPanResponder.panHandlers}
          style={[
            sliderStyles.handle, 
            { left: `${rightPercent}%`, marginLeft: -12 }
          ]} 
        />
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  valueText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  trackContainer: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  inactiveTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    width: '100%',
  },
  activeTrack: {
    height: 4,
    backgroundColor: '#FF1B6B',
    borderRadius: 2,
    position: 'absolute',
  },
  handle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF1B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

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

  // Premium Custom Filters
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterGender, setFilterGender] = useState<'male' | 'female' | 'both'>('both');
  const [filterAgeMin, setFilterAgeMin] = useState(18);
  const [filterAgeMax, setFilterAgeMax] = useState(25);
  const [filterHeightMin, setFilterHeightMin] = useState(150);
  const [filterHeightMax, setFilterHeightMax] = useState(190);
  const [filterDistanceMin, setFilterDistanceMin] = useState(1);
  const [filterDistanceMax, setFilterDistanceMax] = useState(50);
  const [filterLookingFor, setFilterLookingFor] = useState<'friends' | 'dating' | 'both'>('both');
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);

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
    if (sessionToken === 'dummy_token') {
      setProfiles(MOCK_PROFILES);
      setLoading(false);
      return;
    }

    try {
      console.log('fetchProfiles (frontend): Fetching profiles...');
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles`, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      if (!r.ok) throw new Error('Failed to fetch from backend');
      const d = await r.json();
      console.log('fetchProfiles (frontend): Response count:', d.profiles ? d.profiles.length : 0);
      setProfiles(d.profiles || MOCK_PROFILES);
    } catch (e: any) {
      console.warn('fetchProfiles failed, using mock profiles instead:', e.message);
      setProfiles(MOCK_PROFILES);
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

  const handleGlobalToggle = (enableGlobal: boolean) => {
    if (enableGlobal) {
      if (user?.is_premium) {
        setGlobalMode(true);
        setCurrentIndex(0);
      } else {
        router.push('/premium');
      }
    } else {
      setGlobalMode(false);
      setCurrentIndex(0);
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

    // Global Mode (In Campus vs Go Global)
    if (!globalMode) {
      result = result.filter(p => p.college_id === user?.college_id);
    }

    // Gender filter
    if (genderFilter !== 'both') {
      result = result.filter(p => p.gender === genderFilter);
    }

    // Age filter
    result = result.filter(p => p.age >= filterAgeMin && p.age <= filterAgeMax);

    // Looking For filter
    if (filterLookingFor !== 'both') {
      result = result.filter(p => p.looking_for === filterLookingFor);
    }

    // Verified accounts only filter
    if (filterVerifiedOnly) {
      result = result.filter(p => p.verification_status === 'verified');
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
  const profilePhotos = hasProfile ? getProfilePhotos(currentProfile) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>

        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>off campus</Text>
          </View>
          <TouchableOpacity
            style={styles.modeBtn}
            onPress={() => router.push('/premium')}
            activeOpacity={0.8}
          >
            <Ionicons name="diamond" size={12} color="#FFD700" />
            <Text style={styles.modeText}>VIPS</Text>
          </TouchableOpacity>
        </View>

        {/* Top Controls Row (Filter & Campus/Global Toggle) */}
        <View style={styles.topControlsRow}>
          <TouchableOpacity
            style={styles.filterMainBtn}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={16} color="#FFD700" />
            <Text style={styles.filterMainBtnText}>Filter</Text>
          </TouchableOpacity>

          <View style={styles.globalToggleContainer}>
            <TouchableOpacity
              style={[
                styles.globalToggleOption,
                !globalMode && styles.globalToggleActive
              ]}
              onPress={() => handleGlobalToggle(false)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.globalToggleText,
                !globalMode && styles.globalToggleTextActive
              ]}>In Campus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.globalToggleOption,
                globalMode && styles.globalToggleActive
              ]}
              onPress={() => handleGlobalToggle(true)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.globalToggleText,
                globalMode && styles.globalToggleTextActive
              ]}>Go Global</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Modal Overlay */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFilterModal}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <BlurView intensity={70} tint="dark" style={styles.modalBlurContainer}>
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalContent}>

                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="options-outline" size={20} color="#FF1B6B" />
                    <Text style={styles.modalTitle}>Discovery Filters</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowFilterModal(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  {/* Gender Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Gender Preferred</Text>
                    <View style={styles.genderOptions}>
                      {(['male', 'female', 'both'] as const).map((option) => {
                        const isActive = filterGender === option;
                        const label = option === 'male' ? 'Male' : option === 'female' ? 'Female' : 'Both';
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[styles.genderBtn, isActive && styles.genderBtnActive]}
                            onPress={() => setFilterGender(option)}
                          >
                            {isActive ? (
                              <LinearGradient
                                colors={['#eb3939', '#890909']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.genderBtnGrad}
                              >
                                <Text style={styles.genderBtnTextActive}>{label}</Text>
                              </LinearGradient>
                            ) : (
                              <Text style={styles.genderBtnText}>{label}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Age Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Age Range</Text>
                    <RangeSlider
                      min={18}
                      max={100}
                      minVal={filterAgeMin}
                      maxVal={filterAgeMax}
                      onChange={(minVal, maxVal) => {
                        setFilterAgeMin(minVal);
                        setFilterAgeMax(maxVal);
                      }}
                      suffix=" yrs"
                    />
                  </View>

                  {/* Height Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Height Range</Text>
                    <RangeSlider
                      min={120}
                      max={220}
                      minVal={filterHeightMin}
                      maxVal={filterHeightMax}
                      onChange={(minVal, maxVal) => {
                        setFilterHeightMin(minVal);
                        setFilterHeightMax(maxVal);
                      }}
                      suffix=" cm"
                    />
                  </View>

                  {/* Max Distance */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Distance Range</Text>
                    <RangeSlider
                      min={1}
                      max={100}
                      minVal={filterDistanceMin}
                      maxVal={filterDistanceMax}
                      onChange={(minVal, maxVal) => {
                        setFilterDistanceMin(minVal);
                        setFilterDistanceMax(maxVal);
                      }}
                      suffix=" km"
                    />
                  </View>

                  {/* Looking For */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Looking For</Text>
                    <View style={styles.genderOptions}>
                      {(['friends', 'dating', 'both'] as const).map((option) => {
                        const isActive = filterLookingFor === option;
                        const label = option === 'friends' ? 'Friends' : option === 'dating' ? 'Dating' : 'Both';
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[styles.genderBtn, isActive && styles.genderBtnActive]}
                            onPress={() => setFilterLookingFor(option)}
                          >
                            {isActive ? (
                              <LinearGradient
                                colors={['#ee4d4d', '#780505']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.genderBtnGrad}
                              >
                                <Text style={styles.genderBtnTextActive}>{label}</Text>
                              </LinearGradient>
                            ) : (
                              <Text style={styles.genderBtnText}>{label}</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Verified Accounts Switch */}
                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchTitle}>Verified Members Only</Text>
                      <Text style={styles.switchSub}>Show only verified student profiles</Text>
                    </View>
                    <Switch
                      value={filterVerifiedOnly}
                      onValueChange={setFilterVerifiedOnly}
                      trackColor={{ false: '#2C2C2E', true: '#FF1B6B' }}
                      thumbColor="#FFF"
                    />
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                      setFilterGender('both');
                      setFilterAgeMin(18);
                      setFilterAgeMax(25);
                      setFilterHeightMin(150);
                      setFilterHeightMax(190);
                      setFilterDistanceMin(1);
                      setFilterDistanceMax(50);
                      setFilterLookingFor('both');
                      setFilterVerifiedOnly(false);
                    }}
                  >
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => {
                      setGenderFilter(filterGender); // Sync gender filter
                      setCurrentIndex(0);
                      setShowFilterModal(false);
                    }}
                  >
                    <LinearGradient
                     colors={['#ee4d4d', '#780505']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.applyBtnGrad}
                    >
                      <Text style={styles.applyBtnText}>Apply Filters</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              </View>
            </SafeAreaView>
          </BlurView>
        </Modal>

        {/* Profiles Container / Card stack */}
        {hasProfile ? (
          <View style={styles.cardWrapper}>
            <Animated.View style={[styles.cardContainer, { transform: [{ translateX: slideAnim }] }]}>
              <View style={styles.profileCard}>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.profileScrollView}
                  contentContainerStyle={styles.profileScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* 1. Standalone Photo Card */}
                  <View style={styles.mainPhotoCard}>
                    <View style={styles.photoContainer}>
                      <Image
                        source={{ uri: profilePhotos[0] }}
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

                      {/* Handshake button on main photo */}
                      <TouchableOpacity
                        style={styles.photoHandshakeBtn}
                        onPress={() => handleLikeAndNext(currentProfile.user_id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#FF1B6B', '#9D4EDD']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.photoHandshakeGrad}
                        >
                          <MaterialCommunityIcons name="handshake" size={24} color="#FFF" />
                        </LinearGradient>
                      </TouchableOpacity>
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

                      {/* College / Course / Year */}
                      <View style={styles.cardCollegeRow}>
                        <Ionicons name="school-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
                        <Text style={styles.cardCollegeText}>
                          {[
                            getCollegeName(currentProfile),
                            currentProfile.course,
                            currentProfile.year
                          ].filter(Boolean).join(' • ')}
                        </Text>
                      </View>

                      {/* Bio */}
                      {currentProfile.bio && <Text style={styles.cardBio}>{currentProfile.bio}</Text>}

                      {/* Characteristics Scrollable Row */}
                      <View style={styles.scrollWrapper}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.scrollContentContainer}
                        >
                          {getScrollableItems(currentProfile).map((item, idx) => (
                            <React.Fragment key={idx}>
                              <View style={styles.scrollItem}>
                                <Ionicons name={item.icon as any} size={15} color="rgba(255, 255, 255, 0.7)" />
                                <Text style={styles.scrollItemText}>{item.text}</Text>
                              </View>
                              {idx < getScrollableItems(currentProfile).length - 1 && (
                                <View style={styles.scrollSeparator} />
                              )}
                            </React.Fragment>
                          ))}
                        </ScrollView>
                      </View>

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

                  {/* 4. Secondary Photos (Main Photo + 5 Secondary Photos) */}
                  <View style={styles.secondaryPhotosSection}>
                    {profilePhotos.slice(1).map((photoUri, index) => {
                      const photoIndex = index + 1; // 1 to 5
                      const prompt = MOCK_PROMPTS.find(p => p.index === photoIndex);

                      return (
                        <View key={photoIndex} style={styles.secondaryPhotoCard}>
                          {prompt && (
                            <View style={styles.promptHeader}>
                              <Text style={styles.promptQuestion}>MY PROMPT</Text>
                              <Text style={styles.promptTitle}>{prompt.title}</Text>
                            </View>
                          )}
                          <View style={styles.secondaryPhotoContainer}>
                            <Image source={{ uri: photoUri }} style={styles.profilePhoto} />

                            {/* Handshake button on secondary photo */}
                            <TouchableOpacity
                              style={styles.photoHandshakeBtn}
                              onPress={() => handleLikeAndNext(currentProfile.user_id)}
                              activeOpacity={0.8}
                            >
                              <LinearGradient
                                colors={['#FF1B6B', '#9D4EDD']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.photoHandshakeGrad}
                              >
                                <MaterialCommunityIcons name="handshake" size={24} color="#FFF" />
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
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
              <Text style={styles.matchTitle}>{"IT'S A MATCH! 💥"}</Text>
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
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    textTransform: 'lowercase',
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

  logoImage: {
    width: 130,
    height: 30,
  },
  topControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 10,
    marginHorizontal: 12,
  },
  globalToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  globalToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  globalToggleActive: {
    backgroundColor: '#FF1B6B',
  },
  globalToggleText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  globalToggleTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  filterMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  filterMainBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalBlurContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 24,
  },
  filterSection: {
    gap: 12,
  },
  filterSectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    height: 48,
    justifyContent: 'center',
  },
  genderBtnActive: {
    borderColor: 'transparent',
    borderWidth: 0,
  },
  genderBtnGrad: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  genderBtnTextActive: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stepperSub: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  stepperLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepperButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  distanceBtnActive: {
    backgroundColor: '#FF1B6B',
    borderColor: '#FF1B6B',
  },
  distanceText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  distanceTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  switchTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
    backgroundColor: '#0F0E17',
  },
  resetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 2,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  applyBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Card Structure
  cardWrapper: {
    flex: 1,
    position: 'relative',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  profileCard: {
    flex: 1,
    backgroundColor: '#0A0B14',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingBottom: 30, // Space for floating button overlay
  },
  mainPhotoCard: {
    width: '100%',
    aspectRatio: 0.85,
    overflow: 'hidden',
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
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  profileDetails: {
    gap: 8
  },
  cardNameRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
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

  // Secondary photos layout
  secondaryPhotosSection: {
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 20,
  },
  secondaryPhotoCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0B0A11',
  },
  secondaryPhotoContainer: {
    width: '100%',
    aspectRatio: 0.85,
    position: 'relative',
  },
  promptHeader: {
    backgroundColor: '#0B0A11',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  photoHandshakeBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  photoHandshakeGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Floating Actions Row Overlay
  floatingActions: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    zIndex: 999,
    elevation: 20,
  },
  floatingBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: '#0A0B14',
    borderWidth: 2,
  },
  floatingNope: {
    borderColor: '#FF453A',
  },
  floatingLike: {
    borderColor: '#FF1B6B',
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
