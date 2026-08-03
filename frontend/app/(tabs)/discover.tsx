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
  PanResponder,
  Platform,
  Alert
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import PremiumUpsellSheet from '@/src/components/PremiumUpsellSheet';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  if (inches === 12) {
    return `${feet + 1}' 0"`;
  }
  return `${feet}' ${inches}"`;
};

const getScrollableItems = (profile: any) => {
  let height = profile.height;
  let religion = profile.religion;
  let drink = profile.drink;
  let smoke = profile.smoke;
  let weed = profile.weed;
  let location = profile.location;
  let state = profile.state;

  const hash = (profile.name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

  if (!height) {
    height = profile.gender === 'female' ? 155 + (hash % 15) : 170 + (hash % 18);
  }
  if (!religion) {
    const religions = ['Hindu', 'Sikh', 'Christian', 'Muslim', 'Jain'];
    religion = religions[hash % religions.length];
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

  const drinkLabel = drink.toLowerCase() === 'yes' ? 'Drinks' : 'Drink: No';
  const smokeLabel = smoke.toLowerCase() === 'yes' ? 'Smoker' : 'Smoke: No';
  const weedLabel = weed.toLowerCase() === 'yes' ? 'Weed' : 'Weed: No';

  return [
    { icon: (profile.gender === 'female' ? 'female-outline' : profile.gender === 'male' ? 'male-outline' : 'person-outline'), text: genderLabel },
    { icon: 'resize-outline', text: heightVal },
    { icon: 'location-outline', text: locationLabel },
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
  formatLabel?: (val: number) => string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, minVal, maxVal, onChange, suffix = '', formatLabel }) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const currentMinVal = useRef(minVal);
  const currentMaxVal = useRef(maxVal);
  const currentTrackWidth = useRef(trackWidth);
  const currentOnChange = useRef(onChange);

  useEffect(() => { currentMinVal.current = minVal; }, [minVal]);
  useEffect(() => { currentMaxVal.current = maxVal; }, [maxVal]);
  useEffect(() => { currentTrackWidth.current = trackWidth; }, [trackWidth]);
  useEffect(() => { currentOnChange.current = onChange; }, [onChange]);

  const startMinVal = useRef(minVal);
  const startMaxVal = useRef(maxVal);

  const minPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMinVal.current = currentMinVal.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (currentTrackWidth.current === 0) return;
        const change = (gestureState.dx / currentTrackWidth.current) * (max - min);
        let newVal = Math.round(startMinVal.current + change);
        newVal = Math.max(min, Math.min(newVal, currentMaxVal.current - 1));
        currentOnChange.current(newVal, currentMaxVal.current);
      },
    })
  ).current;

  const maxPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startMaxVal.current = currentMaxVal.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (currentTrackWidth.current === 0) return;
        const change = (gestureState.dx / currentTrackWidth.current) * (max - min);
        let newVal = Math.round(startMaxVal.current + change);
        newVal = Math.max(currentMinVal.current + 1, Math.min(newVal, max));
        currentOnChange.current(currentMinVal.current, newVal);
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
          {formatLabel ? formatLabel(minVal) : `${minVal}${suffix}`} - {formatLabel ? formatLabel(maxVal) : `${maxVal}${suffix}`}
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
    backgroundColor: '#C2FF3D',
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
    borderColor: '#C2FF3D',
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
  const [showRejectWarning, setShowRejectWarning] = useState(true);
  const [rejectExpanded, setRejectExpanded] = useState(false);
  const params = useLocalSearchParams();
  const targetUserId = params.targetUserId as string | undefined;
  const fromNearby = params.fromNearby === 'true';

  // Data state
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState<any>(null);
  const [college, setCollege] = useState<any>(user?.college || null);

  // Navigation & Filter state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [globalMode, setGlobalMode] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'both'>(user?.gender_preference || 'both');

  // Premium Custom Filters
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterGender, setFilterGender] = useState<'male' | 'female' | 'both'>(user?.gender_preference || 'both');
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const [cardHeight, setCardHeight] = useState(Dimensions.get('window').height - 180);
  const scrollViewRef = useRef<ScrollView>(null);

  // Premium & Daily Limits State
  const [likesRemaining, setLikesRemaining] = useState<number>(6);
  const [upsellVisible, setUpsellVisible] = useState(false);
  const [upsellTitle, setUpsellTitle] = useState("Unlock Premium Access 👑");
  const [upsellFeature, setUpsellFeature] = useState("6 Likes Daily Limit");
  const [canRewind, setCanRewind] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const fetchLikesCount = async () => {
    if (sessionToken === 'dummy_token' || !sessionToken) {
      setLikesCount(3); // Mock
      return;
    }
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/likes-received`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLikesCount(data.likes ? data.likes.length : 0);
      }
    } catch (e) {
      console.warn('fetchLikesCount failed:', e);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchDailyLikesStatus();
    fetchLikesCount();
    setCurrentIndex(0);
    scrollY.setValue(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
    if (user?.college) {
      setCollege(user.college);
    } else if (user?.college_id) {
      fetchCollege();
    }

    if (user?.gender_preference) {
      setGenderFilter(user.gender_preference);
      setFilterGender(user.gender_preference);
    }
  }, [user, targetUserId]);

  const fetchDailyLikesStatus = async () => {
    if (sessionToken === 'dummy_token' || !sessionToken) return;
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/daily-likes`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (r.ok) {
        const d = await r.json();
        if (d.is_premium) {
          setLikesRemaining(999);
        } else {
          setLikesRemaining(d.likes_remaining !== undefined ? d.likes_remaining : 6);
        }
      }
    } catch (e) {
      console.warn('fetchDailyLikesStatus failed:', e);
    }
  };

  const fetchProfiles = async () => {
    if (sessionToken === 'dummy_token') {
      setProfiles(MOCK_PROFILES);
      setLoading(false);
      return;
    }

    try {
      console.log('fetchProfiles (frontend): Fetching profiles, targetUserId:', targetUserId);
      let url = `${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles`;
      if (targetUserId) {
        url += `?targetUserId=${targetUserId}`;
      }
      const r = await fetch(url, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      if (!r.ok) throw new Error('Failed to fetch from backend');
      const d = await r.json();
      console.log('fetchProfiles (frontend): Response count:', d.profiles ? d.profiles.length : 0);
      setProfiles(d.profiles || []);
    } catch (e: any) {
      console.warn('fetchProfiles failed:', e.message);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollege = async () => {
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
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user?.college_id}`);
      const data = await response.json();
      setCollege(data.college);
    } catch (error) {
      console.error('Error fetching college:', error);
    }
  };

  const handleGlobalToggle = (enableGlobal: boolean) => {
    setGlobalMode(enableGlobal);
    setCurrentIndex(0);
  };

  const handleLike = async (targetUserId: string) => {
    const targetProfile = profiles.find(p => p.user_id === targetUserId);
    if (sessionToken === 'dummy_token') {
      if (!user?.is_premium) {
        setLikesRemaining(prev => Math.max(0, prev - 1));
      }
      if (Math.random() < 0.4 && targetProfile) {
        setShowMatch(targetProfile);
      }
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      if (r.status === 403) {
        const errData = await r.json();
        if (errData.error === 'daily_limit_reached') {
          setLikesRemaining(0);
          setUpsellTitle('Daily Free Likes Limit Reached! ⚡');
          setUpsellFeature('6 Likes Daily Limit');
          setUpsellVisible(true);
          return;
        }
      }

      const d = await r.json();
      if (d.likes_remaining !== undefined && d.likes_remaining !== null) {
        setLikesRemaining(d.likes_remaining);
      }
      if (d.is_match && targetProfile) {
        setShowMatch(targetProfile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleHandshake = async (targetUserId: string) => {
    const targetProfile = profiles.find(p => p.user_id === targetUserId);
    if (sessionToken === 'dummy_token') {
      if (Math.random() < 0.4 && targetProfile) {
        setShowMatch(targetProfile);
      }
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      if (r.status === 403) {
        const errData = await r.json();
        if (errData.error === 'no_handshakes_remaining') {
          setUpsellTitle('Weekly Handshakes Used! 🤝');
          setUpsellFeature('5 Weekly Handshakes');
          setUpsellVisible(true);
          return;
        }
      }

      const d = await r.json();
      if (d.is_match && targetProfile) {
        setShowMatch(targetProfile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePass = async (targetUserId: string) => {
    if (sessionToken === 'dummy_token') {
      return;
    }

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
      // 3. Move to next user & enable 1-step rewind
      setCurrentIndex(prev => prev + 1);
      setCanRewind(true);
      // 4. Scroll to top of the next card and reset scroll tracking
      scrollY.setValue(0);
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
    if (user?.verification_status !== 'verified') {
      if (user?.verification_status === 'rejected') {
        Alert.alert(
          'Verification Rejected ',
          `Reason: "${user?.rejection_reason || 'The uploaded ID card image was invalid or blurry.'}"\n\nPlease submit a valid photo of your ID card to unlock likes & profile visibility.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify ID', onPress: () => router.push('/onboarding/verification') }
          ]
        );
      } else if (user?.verification_status === 'pending') {
        Alert.alert(
          'Verification Pending ',
          'Your student ID card is currently under review by admin. You will be able to send likes once approved!'
        );
      } else {
        Alert.alert(
          'Verification Required ',
          'You must verify your student profile before sending likes to anyone!',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Now', onPress: () => router.push('/onboarding/verification') }
          ]
        );
      }
      return;
    }

    if (fromNearby) {
      // Handshake flow — no daily like decrement
    } else {
      if (!user?.is_premium && likesRemaining <= 0) {
        setUpsellTitle('Daily Free Likes Limit Reached! ⚡');
        setUpsellFeature('6 Likes Daily Limit');
        setUpsellVisible(true);
        return;
      }

      // Optimistically decrement daily free likes counter
      if (!user?.is_premium) {
        setLikesRemaining(prev => Math.max(0, prev - 1));
      }
    }

    // 1. Slide out to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      // 2. Perform backend like/handshake logic in background
      if (fromNearby) {
        handleHandshake(targetUserId);
      } else {
        handleLike(targetUserId);
      }
      // 3. Move to next user & enable 1-step rewind
      setCurrentIndex(prev => prev + 1);
      setCanRewind(true);
      // 4. Scroll to top of the next card and reset scroll tracking
      scrollY.setValue(0);
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

  const handleRewindSkipped = async () => {
    if (!user?.is_premium) {
      setUpsellTitle('Revisit Skipped Profiles ⏪');
      setUpsellFeature('Revisit Skipped Profiles');
      setUpsellVisible(true);
      return;
    }

    if (!canRewind) {
      Alert.alert('Rewind Limit ⏪', 'You can only rewind 1 profile at a time! Perform a new swipe action to rewind again.');
      return;
    }

    try {
      if (sessionToken && sessionToken !== 'dummy_token') {
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/revert-pass`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
      }

      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setCanRewind(false);
        scrollY.setValue(0);
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        slideAnim.setValue(-Dimensions.get('window').width);
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6,
          tension: 45,
          useNativeDriver: true,
        }).start();
        return;
      }

      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/skipped`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (r.ok) {
        const d = await r.json();
        if (d.profiles && d.profiles.length > 0) {
          setProfiles(prev => [d.profiles[0], ...prev]);
          setCurrentIndex(0);
          setCanRewind(false);
          Alert.alert('Rewind! ⏪', 'Previous profile restored to your deck!');
        } else {
          Alert.alert('Rewind', 'No previous profile to restore.');
        }
      }
    } catch (e) {
      console.error('Rewind failed:', e);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Locally filtered list
  const getFilteredProfiles = () => {
    let result = [...profiles];

    // If targetUserId is present, extract that profile first so filters don't remove it
    let targetProfile: any = null;
    if (targetUserId) {
      const targetIdx = result.findIndex(p => p.user_id === targetUserId);
      if (targetIdx !== -1) {
        targetProfile = result.splice(targetIdx, 1)[0];
      }
    }

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

    // Height filter (in cm)
    result = result.filter(p => {
      const height = p.height || 165; // fallback default
      return height >= filterHeightMin && height <= filterHeightMax;
    });

    // Distance filter (in km)
    if (user?.latitude && user?.longitude) {
      result = result.filter(p => {
        if (!p.latitude || !p.longitude) return true; // fallback default
        const dist = calculateDistance(user.latitude, user.longitude, p.latitude, p.longitude);
        return dist >= (filterDistanceMin <= 1 ? 0 : filterDistanceMin) && dist <= filterDistanceMax;
      });
    }


    // Verified accounts only filter
    if (filterVerifiedOnly) {
      result = result.filter(p => p.verification_status === 'verified');
    }

    // Prepend target profile back at index 0 (bypasses all filters)
    if (targetProfile) {
      result = [targetProfile, ...result];
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

  const getCards = () => {
    if (!hasProfile || !currentProfile) return [];
    const list = [];

    // 1. Main card (index 0)
    list.push({
      type: 'main',
      photo: profilePhotos[0]
    });

    // 2. Spotify card
    let topTracks = [];
    try {
      if (currentProfile.spotify_data) {
        const sData = typeof currentProfile.spotify_data === 'string'
          ? JSON.parse(currentProfile.spotify_data)
          : currentProfile.spotify_data;
        if (sData && sData.top_tracks) {
          topTracks = sData.top_tracks;
        }
      }
    } catch (e) {
      console.warn('Error parsing spotify_data', e);
    }
    if (topTracks.length > 0) {
      list.push({
        type: 'spotify',
        tracks: topTracks
      });
    }

    // 3. Secondary photos
    profilePhotos.slice(1).forEach((photoUri, index) => {
      const photoIndex = index + 1;
      const prompt = MOCK_PROMPTS.find(p => p.index === photoIndex);
      list.push({
        type: 'secondary',
        photo: photoUri,
        prompt: prompt,
        index: photoIndex
      });
    });

    return list;
  };

  const cards = getCards();

  return (
    <View style={styles.container}>
      {/* Verification Rejected Warning Modal */}
      <Modal
        visible={user?.verification_status === 'rejected' && showRejectWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectWarning(false)}
      >
        <View style={styles.warningOverlayBg}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          <View style={styles.warningCardGlass}>
            {/* Close Cross Button */}
            <TouchableOpacity
              style={styles.warningCrossBtn}
              onPress={() => setShowRejectWarning(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <View style={styles.warningIconCircle}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
            </View>

            {!rejectExpanded ? (
              // Phase 1: Collapsed
              <TouchableOpacity
                onPress={() => setRejectExpanded(true)}
                activeOpacity={0.85}
                style={styles.warningMainLineClickable}
              >
                <Text style={styles.warningMainText}>
                  Admin has rejected your verification request: &quot;{user?.rejection_reason || 'The uploaded ID card image was invalid or blurry.'}&quot;
                </Text>
                <Text style={styles.warningTapHint}>Tap to view details</Text>
              </TouchableOpacity>
            ) : (
              // Phase 2: Expanded
              <View style={styles.warningExpandedContent}>
                <Text style={styles.warningMainText}>
                  Admin has rejected your verification request: &quot;{user?.rejection_reason || 'The uploaded ID card image was invalid or blurry.'}&quot;
                </Text>
                
                <Text style={styles.warningSubText}>
                  You can&apos;t send likes until you are verified.
                </Text>

                <View style={styles.warningActionRow}>
                  <TouchableOpacity
                    style={styles.warningBtnVerify}
                    onPress={() => {
                      setShowRejectWarning(false);
                      router.push('/onboarding/verification');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.warningBtnVerifyText}>Verify Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.warningBtnClose}
                    onPress={() => setShowRejectWarning(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.warningBtnCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* Top-Left Dark Purple Glow Ball */}
      <View style={styles.glowBallContainer}>
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      {/* Profiles Container / Card stack */}
      {hasProfile ? (
        <View style={styles.cardWrapper}>
          <Animated.View style={[styles.cardContainer, { transform: [{ translateX: slideAnim }] }]}>
            <View
              style={styles.profileCard}
              onLayout={(e) => {
                const { height } = e.nativeEvent.layout;
                if (height > 0) {
                  setCardHeight(height);
                }
              }}
            >
              <Animated.ScrollView
                ref={scrollViewRef}
                style={styles.profileScrollView}
                contentContainerStyle={{ height: cards.length * cardHeight }}
                showsVerticalScrollIndicator={false}
                pagingEnabled={true}
                decelerationRate="fast"
                scrollEventThrottle={8}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
              >
                {cards.map((card, i) => {
                  const translateY = scrollY.interpolate({
                    inputRange: [
                      (i - 1) * cardHeight,
                      i * cardHeight,
                      i * cardHeight + 1
                    ],
                    outputRange: [0, 0, 1],
                    extrapolateLeft: 'clamp'
                  });

                  const scale = scrollY.interpolate({
                    inputRange: [
                      i * cardHeight,
                      (i + 1) * cardHeight
                    ],
                    outputRange: [1, 0.98],
                    extrapolate: 'clamp'
                  });

                  const opacity = scrollY.interpolate({
                    inputRange: [
                      i * cardHeight,
                      (i + 1) * cardHeight
                    ],
                    outputRange: [1, 0.85],
                    extrapolate: 'clamp'
                  });

                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.animatedCardItem,
                        {
                          height: cardHeight,
                          zIndex: i,
                          transform: [{ translateY }, { scale }],
                          opacity: opacity,
                        }
                      ]}
                    >
                      {card.type === 'main' && (
                        <View style={styles.mainCardInner}>
                          <Image
                            source={{ uri: getBWPhotoUrl(card.photo) }}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode="cover"
                          />

                          {/* Glass Details Card Overlay */}
                          <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassDetailsCard}>
                            <View style={styles.profileDetails}>
                              {/* Name & Age Row */}
                              <View style={[styles.cardNameRow, { justifyContent: 'space-between' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 }}>
                                  <Text style={styles.cardName} numberOfLines={1} ellipsizeMode="tail">
                                    {currentProfile.name}, {currentProfile.age}
                                  </Text>
                                  {currentProfile.verification_status === 'verified' && (
                                    <Ionicons name="checkmark-circle" size={18} color="#00B0FF" style={{ marginLeft: 6, flexShrink: 0 }} />
                                  )}
                                </View>
                                <View style={[styles.innovativeVibeBadge, { flexShrink: 0 }]}>
                                  <Ionicons name="sparkles" size={13} color="#FFD700" />
                                  <Text style={styles.innovativeVibeText}>{currentProfile.vibe_score?.toFixed(1)}</Text>
                                </View>
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
                                  {currentProfile.interests.map((interest: string) => (
                                    <View key={interest} style={styles.cardTag}>
                                      <Text style={styles.cardTagText}>{interest}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          </BlurView>
                        </View>
                      )}

                      {card.type === 'spotify' && (
                        <BlurView intensity={25} tint="dark" style={[styles.secondaryPhotoCard, { height: cardHeight, padding: 24 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <MaterialCommunityIcons name="spotify" size={26} color="#1DB954" style={{ marginRight: 8 }} />
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>My Spotify Vibe</Text>
                          </View>

                          <View style={{ gap: 16, flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
                            {card.tracks.slice(0, 3).map((track: any, idx: number) => {
                              let title = '';
                              let artist = '';
                              if (typeof track === 'string') {
                                const parts = track.split(' - ');
                                title = parts[0] || track;
                                artist = parts[1] || '';
                              } else if (track && typeof track === 'object') {
                                title = track.name || '';
                                artist = track.artist || '';
                              }
                              return (
                                <View key={idx} style={styles.spotifyTrackRow}>
                                  <Text style={styles.trackIndex}>{idx + 1}</Text>
                                  <View style={styles.trackArt}>
                                    <Ionicons name="musical-note" size={14} color="#1DB954" />
                                  </View>
                                  <View style={styles.spotifyTrackInfo}>
                                    <Text style={styles.spotifyTrackName} numberOfLines={1}>{title}</Text>
                                    <Text style={styles.spotifyArtistName} numberOfLines={1}>{artist}</Text>
                                  </View>
                                  <Ionicons name="play" size={12} color="#1DB954" style={{ opacity: 0.8 }} />
                                </View>
                              );
                            })}
                          </View>
                        </BlurView>
                      )}

                      {card.type === 'secondary' && (
                        <BlurView intensity={25} tint="dark" style={[styles.secondaryPhotoCard, { height: cardHeight }]}>
                          {card.prompt ? (
                            <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
                              {/* Prompt text at the top (Hinge style) */}
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.promptQuestion}>My Answer to</Text>
                                <Text style={styles.promptTitle}>{card.prompt.title}</Text>
                              </View>

                              {/* Photo with rounded frame below the prompt text */}
                              <View style={styles.hingePhotoContainer}>
                                <Image source={{ uri: card.photo }} style={styles.hingePhoto} />
                              </View>
                            </View>
                          ) : (
                            <View style={{ flex: 1 }}>
                              <Image source={{ uri: card.photo }} style={styles.profilePhoto} />
                            </View>
                          )}
                        </BlurView>
                      )}
                    </Animated.View>
                  );
                })}
              </Animated.ScrollView>
            </View>
          </Animated.View>

          {/* Floating Daily Likes Counter Pill */}
          {!user?.is_premium && (
            <TouchableOpacity
              style={styles.dailyLikesPill}
              onPress={() => {
                setUpsellTitle('Daily Free Likes Limit ⚡');
                setUpsellFeature('6 Likes Daily Limit');
                setUpsellVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={12} color="#C2FF3D" />
              <Text style={styles.dailyLikesPillText}>
                {likesRemaining > 0 ? `${likesRemaining}/6 Free Likes Left` : '0 Free Likes Left — Get Premium'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Floating Action Overlay Buttons */}
          <View style={styles.floatingActionsContainer}>
            {user?.is_premium && (
              <TouchableOpacity
                style={[styles.floatingBtn, styles.floatingRewind]}
                onPress={handleRewindSkipped}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={22} color="#FFD700" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.floatingBtn, styles.floatingNope]}
              onPress={() => handlePassAndNext(currentProfile.user_id)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#FF453A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingBtn, styles.floatingLike]}
              onPress={() => handleLikeAndNext(currentProfile.user_id)}
              activeOpacity={0.8}
            >
              {fromNearby ? (
                <MaterialCommunityIcons name="handshake" size={24} color="#C2FF3D" />
              ) : (
                <Ionicons name="heart" size={24} color="#C2FF3D" />
              )}
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
            <Ionicons name="refresh" size={16} color="#000" />
            <Text style={styles.refreshText}>Refresh Feed</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Header Overlay at the top */}
      <SafeAreaView style={styles.headerFloatingOverlay} pointerEvents="box-none">
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>off campus</Text>
          </View>
          <TouchableOpacity
            style={styles.likesTriggerBtn}
            onPress={() => router.push('/(tabs)/likes')}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={24} color="#FFF" />
            {likesCount > 0 && (
              <View style={styles.likesBadgeContainer}>
                <LinearGradient
                  colors={['#C2FF3D', '#A5D62B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.likesBadgeGradient}
                >
                  <Text style={styles.likesBadgeText}>{likesCount}</Text>
                </LinearGradient>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Verification Status Warning Banner */}
        {user?.verification_status !== 'verified' && (
          <TouchableOpacity
            style={styles.unverifiedBanner}
            onPress={() => {
              if (user?.verification_status === 'rejected') {
                Alert.alert(
                  'Verification Rejected ',
                  `Reason: "${user?.rejection_reason || 'Uploaded ID image was invalid.'}"\n\nPlease submit a valid photo of your ID card.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Verify ID', onPress: () => router.push('/onboarding/verification') }
                  ]
                );
              } else {
                router.push('/onboarding/verification');
              }
            }}
            activeOpacity={0.85}
          >
            <BlurView intensity={80} tint="dark" style={styles.unverifiedBannerGlass}>
              <Ionicons
                name={user?.verification_status === 'rejected' ? 'close-circle' : 'shield-half'}
                size={16}
                color={user?.verification_status === 'rejected' ? '#FF4B4B' : '#FFD700'}
              />
              <Text style={styles.unverifiedBannerText} numberOfLines={1}>
                {user?.verification_status === 'rejected'
                  ? `Verification Rejected: "${user?.rejection_reason || 'Invalid ID'}". Tap to resubmit.`
                  : user?.verification_status === 'pending'
                    ? 'Verification Pending Under Review'
                    : 'Verify your ID to send likes & show your profile!'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
            </BlurView>
          </TouchableOpacity>
        )}

        {/* Top Controls Row */}
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
              ]}>Off Campus</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Likes Remaining Count Pill */}
        <View style={styles.likesPillContainer}>
          <TouchableOpacity
            style={styles.likesPill}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'Daily Likes ',
                user?.is_premium
                  ? 'You are a Premium member and have Unlimited daily likes! 🎉'
                  : `You have ${likesRemaining} free daily like${likesRemaining === 1 ? '' : 's'} remaining. Upgrade to Premium for unlimited daily likes!`
              );
            }}
          >
            <Ionicons name="heart" size={14} color="#FF2D55" style={{ marginRight: 4 }} />
            <Text style={styles.likesPillText}>
              {user?.is_premium ? 'Unlimited' : likesRemaining}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
                  <Ionicons name="options-outline" size={20} color="#C2FF3D" />
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
                              colors={['#FFFFFF', '#FFFFFF']}
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
                    formatLabel={cmToFeetInches}
                  />
                </View>

                {/* Distance Filter */}
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


                {/* Verified Accounts Switch */}
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.switchTitle}>Verified Members Only</Text>
                    <Text style={styles.switchSub}>Show only verified student profiles</Text>
                  </View>
                  <Switch
                    value={filterVerifiedOnly}
                    onValueChange={setFilterVerifiedOnly}
                    trackColor={{ false: '#FFFFFF', true: '#C2FF3D' }}
                    thumbColor="#FFF"
                  />
                </View>
              </ScrollView>

              {/* Modal Footer */}
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
                    setGenderFilter('both');
                    setCurrentIndex(0);
                  }}
                >
                  <Text style={styles.resetBtnText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => {
                    setGenderFilter(filterGender);
                    setCurrentIndex(0);
                    setShowFilterModal(false);
                  }}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#FFFFFF']}
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

      {/* Match Screen Overlay */}
      {showMatch && (
        <View style={styles.matchOverlay}>
          <LinearGradient
            colors={['#ee4d4d', '#780505']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
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

      {/* Premium Upsell Bottom Sheet */}
      <PremiumUpsellSheet
        visible={upsellVisible}
        onClose={() => setUpsellVisible(false)}
        title={upsellTitle}
        featureName={upsellFeature}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  bg: { flex: 1, backgroundColor: 'transparent' },
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
  likesTriggerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  likesBadgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  likesBadgeGradient: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesBadgeText: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
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
  modeText: { color: '#C2FF3D', fontSize: 12, fontWeight: '700' },

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
  likesPillContainer: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  likesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  likesPillText: {
    color: '#FF2D55',
    fontSize: 13,
    fontWeight: '900',
  },
  globalToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#C2FF3D',
  },
  globalToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  globalToggleActive: {
    backgroundColor: '#FFFFFF',
  },
  globalToggleText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  globalToggleTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  filterMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
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
    backgroundColor: 'rgba(15, 15, 22, 0.94)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
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
    color: '#FFF',
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
    color: '#FFF',
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
    color: '#000000',
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
    borderColor: '#C2FF3D',
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
    backgroundColor: 'rgba(15, 15, 22, 0.96)',
  },
  resetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  resetBtnText: {
    color: '#000000',
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
    color: '#000',
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
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  profileCard: {
    flex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  profileScrollContent: {
    paddingBottom: 140, // Space for floating button overlay & tab navigation
  },
  mainPhotoCard: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  animatedCardItem: {
    width: '100%',
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
  },
  mainCardInner: {
    flex: 1,
    position: 'relative',
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

  headerFloatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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

  detailsCard: {
    paddingHorizontal: 20,
    paddingVertical: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  hingePhotoContainer: {
    flex: 1,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  hingePhoto: {
    width: '100%',
    height: '100%',
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
  secondaryPhotoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  promptHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  promptTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28,
  },

  // Floating Actions Row Overlay
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
  floatingRewind: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  dailyLikesPill: {
    position: 'absolute',
    bottom: 165,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 20, 25, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.35)',
    zIndex: 999,
    elevation: 10,
  },
  dailyLikesPillText: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '800',
  },
  unverifiedBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  unverifiedBannerGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: 'rgba(20, 20, 25, 0.88)',
  },
  unverifiedBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  // Empty State
  empty: {
    ...StyleSheet.absoluteFillObject,
    padding: 40,
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  emptyT: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  emptyS: { color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  refreshBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16
  },
  refreshText: { color: '#000', fontWeight: '700' },

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
  matchBtn: { backgroundColor: '#C2FF3D', paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
  matchBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  matchBtnSecondary: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  matchBtnTextSecondary: { color: '#FFF', fontWeight: '700' },

  // WARNING POPUP OVERLAY STYLES
  warningOverlayBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 24,
  },
  warningCardGlass: {
    backgroundColor: 'rgba(25, 20, 30, 0.96)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  warningCrossBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  warningMainLineClickable: {
    alignItems: 'center',
    width: '100%',
  },
  warningMainText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  warningTapHint: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  warningExpandedContent: {
    width: '100%',
    alignItems: 'center',
  },
  warningSubText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  warningActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
  warningBtnVerify: {
    flex: 1,
    backgroundColor: '#C2FF3D',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBtnVerifyText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  warningBtnClose: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBtnCloseText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
