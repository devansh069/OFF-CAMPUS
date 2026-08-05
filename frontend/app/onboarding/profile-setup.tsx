import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Stage = 'v1' | 's1' | 'v2' | 's2' | 'v3' | 's3' | 'v4' | 's4' | 'v5' | 's5';

const VIDEO_STEPS: { [key: string]: { dotIndex: number; title: string; subtitle: string; videoSource: any; prevStage: Stage | null; nextStage: Stage } } = {
  v1: {
    dotIndex: 0,
    title: 'Story Upload',
    subtitle: 'Share your live campus moments, photos, and daily updates directly on your student story feed.',
    videoSource: require('../../assets/videos/story_walkthrough.mp4'),
    prevStage: null,
    nextStage: 's1',
  },
  v2: {
    dotIndex: 1,
    title: 'Add Confession',
    subtitle: 'Post secrets, ask questions, or share your honest thoughts on the campus feed securely and anonymously.',
    videoSource: require('../../assets/videos/confession_walkthrough.mp4'),
    prevStage: 's1',
    nextStage: 's2',
  },
  v3: {
    dotIndex: 2,
    title: 'Spotify & Apple Music',
    subtitle: 'Sync your Spotify & Apple Music to display your favorite tracks and calculate vibe compatibility with peers.',
    videoSource: require('../../assets/videos/story_tutorial.mp4'),
    prevStage: 's2',
    nextStage: 's3',
  },
  v4: {
    dotIndex: 3,
    title: 'Nearby Students',
    subtitle: 'Find like-minded campus peers, gym buddies, and travel partners around your current location.',
    videoSource: require('../../assets/videos/nearby_walkthrough.mp4'),
    prevStage: 's3',
    nextStage: 's4',
  },
  v5: {
    dotIndex: 4,
    title: 'Report & Safety',
    subtitle: 'Flag inappropriate behavior or fake profiles instantly to ensure a safe community for all students.',
    videoSource: require('../../assets/videos/report_walkthrough.mp4'),
    prevStage: 's4',
    nextStage: 's5',
  },
};

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const INTERESTS = [
  'Music', 'Sports', 'Gaming', 'Art', 'Photography', 'Travel',
  'Reading', 'Coding', 'Fitness', 'Dance', 'Movies', 'Anime',
  'Fashion', 'Cooking', 'Writing', 'Yoga'
];

const PROMPTS = [
  'My typical Sunday looks like...',
  'First order of business on campus...',
  'I\'m looking for someone who...',
  'Dating me is like...',
  'The fastest way to my heart is...',
  'My secret talent no one knows about...',
  'Best memory on campus so far...',
  'Song that best describes my life right now...',
  'Ideal study date spot...',
  'Unpopular opinion I strongly defend...',
  'Together we could...',
  'Late night food craving at 2 AM...'
];

const DEFAULT_COLLEGES = [
  {
    college_id: 'col_stephens',
    name: "St. Stephen's College",
    short_name: 'SSC',
    location: 'North Campus, University Enclave, Delhi',
  },
  {
    college_id: 'col_hindu',
    name: 'Hindu College',
    short_name: 'HC',
    location: 'North Campus, University Enclave, Delhi',
  },
  {
    college_id: 'col_dtu',
    name: 'Delhi Technological University',
    short_name: 'DTU',
    location: 'Shahbad Daulatpur, Main Bawana Road, Delhi',
  },
  {
    college_id: 'col_nsut',
    name: 'Netaji Subhas University of Technology',
    short_name: 'NSUT',
    location: 'Dwarka Sector 3, Delhi',
  },
  {
    college_id: 'col_iitd',
    name: 'Indian Institute of Technology Delhi',
    short_name: 'IITD',
    location: 'Hauz Khas, Delhi',
  }
];

export default function ProfileSetup() {
  const { user, sessionToken, refreshUser, updateUser, logout } = useAuth();
  const router = useRouter();

  // 5 Onboarding Steps & 5 Video Interstitials (v1->s1->v2->s2->v3->s3->v4->s4->v5->s5)
  const [stage, setStage] = useState<Stage>('v1');
  const [loading, setLoading] = useState(false);

  // Step 1: Basics
  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState<Date | null>(
    user?.age ? new Date(new Date().getFullYear() - user.age, 0, 1) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [genderPreference, setGenderPreference] = useState(user?.gender_preference || 'both');

  // Height state (Feet & Inches)
  const getInitialFeetInches = (cmValue?: number) => {
    if (!cmValue || cmValue <= 0) return { ft: 5, in: 7 };
    const totalInches = cmValue / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inc = Math.round(totalInches % 12);
    return { ft: ft >= 4 && ft <= 7 ? ft : 5, in: inc >= 0 && inc <= 11 ? inc : 7 };
  };
  const initialHt = getInitialFeetInches(user?.height);
  const [heightFeet, setHeightFeet] = useState(initialHt.ft);
  const [heightInches, setHeightInches] = useState(initialHt.in);
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [tempFeet, setTempFeet] = useState(initialHt.ft);
  const [tempInches, setTempInches] = useState(initialHt.in);

  const openHeightPicker = () => {
    setTempFeet(heightFeet);
    setTempInches(heightInches);
    setShowHeightPicker(true);
  };

  const confirmHeight = () => {
    setHeightFeet(tempFeet);
    setHeightInches(tempInches);
    setShowHeightPicker(false);
  };

  const cancelHeight = () => {
    setShowHeightPicker(false);
  };

  // Step 2: Vibe, Habits & Location
  const [religion, setReligion] = useState(user?.religion || '');
  const [drink, setDrink] = useState(user?.drink || 'no');
  const [smoke, setSmoke] = useState(user?.smoke || 'no');
  const [weed, setWeed] = useState(user?.weed || 'no');
  const [locationText, setLocationText] = useState(user?.location || '');
  const [latitude, setLatitude] = useState<number | null>(user?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(user?.longitude || null);
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Step 3: College Connection
  const [collegeId, setCollegeId] = useState(user?.college_id || '');
  const [course, setCourse] = useState(user?.course || '');
  const [year, setYear] = useState(user?.year || '');
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeSearch, setCollegeSearch] = useState('');

  // Step 4: Photos & Prompts (Grid of up to 6)
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [customInterest, setCustomInterest] = useState('');
  const [tempSelectedDob, setTempSelectedDob] = useState<Date | null>(null);
  const [photoPrompts, setPhotoPrompts] = useState<{ [index: number]: string }>(
    user?.prompts && typeof user.prompts === 'object' ? (user.prompts as any) : {}
  );
  
  // Prompt Selection Modal State
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [tempPrompt, setTempPrompt] = useState(PROMPTS[0]);
  const [tempAnswer, setTempAnswer] = useState('');

  useEffect(() => {
    fetchColleges(collegeSearch);
  }, [collegeSearch]);

  const fetchColleges = async (query = '') => {
    try {
      if (EXPO_PUBLIC_BACKEND_URL) {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.colleges && data.colleges.length > 0) {
            const mapped = data.colleges.map((c: any) => ({
              college_id: c.college_id,
              name: c.college_name || c.name,
              short_name: c.short_name || 'COLLEGE',
              location: c.city || c.location || 'Delhi NCR',
              affiliation: c.affiliation_university
            }));
            setColleges(mapped);
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching colleges:', error);
    }
    setColleges(DEFAULT_COLLEGES);
  };

  const handleAddCustomCollege = async () => {
    if (!collegeSearch.trim()) return;
    const cleanName = collegeSearch.trim();

    try {
      if (EXPO_PUBLIC_BACKEND_URL && sessionToken) {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            collegeName: cleanName,
            city: 'Delhi NCR'
          })
        });

        if (response.ok) {
          Alert.alert(
            'Request Submitted ⏳',
            `Your college "${cleanName}" has been submitted to Admin for verification. You can log in, but app actions will unlock once approved.`,
            [{ text: 'Got it' }]
          );
        }
      }
    } catch (e) {
      console.warn('Error submitting college request:', e);
    }

    const customId = `col_custom_${Date.now()}`;
    const newCollege = {
      college_id: customId,
      name: cleanName,
      short_name: cleanName.split(' ').map(w => w[0]).join('').toUpperCase() || 'CUSTOM',
      location: 'Pending Admin Verification',
    };
    setColleges(prev => [newCollege, ...prev]);
    setCollegeId(customId);
    setCollegeSearch('');
  };

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    return computedAge;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempSelectedDob(selectedDate);
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate && event.type === 'set') {
        confirmDob(selectedDate);
      }
    }
  };

  const confirmDob = (selectedDate: Date) => {
    const calculatedAge = calculateAge(selectedDate);
    if (calculatedAge < 18) {
      Alert.alert(
        'Access Denied 🔞',
        'Users below 18 years of age are not allowed on Off Campus. Please select a valid birth date.',
        [{ text: 'OK' }]
      );
      setDob(null);
      setAge('');
      setTempSelectedDob(null);
    } else {
      Alert.alert(
        'Confirm Age',
        `You are calculated to be ${calculatedAge} years old (born ${selectedDate.toLocaleDateString('en-GB')}). Is this correct?`,
        [
          { 
            text: 'Change', 
            style: 'cancel',
            onPress: () => {
              setDob(null);
              setAge('');
              setTempSelectedDob(null);
            }
          },
          { 
            text: 'Yes, Correct', 
            onPress: () => {
              setDob(selectedDate);
              setAge(calculatedAge.toString());
            }
          }
        ]
      );
    }
  };

  const handleBack = async () => {
    if (stage === 's1') setStage('v1');
    else if (stage === 'v2') setStage('s1');
    else if (stage === 's2') setStage('v2');
    else if (stage === 'v3') setStage('s2');
    else if (stage === 's3') setStage('v3');
    else if (stage === 'v4') setStage('s3');
    else if (stage === 's4') setStage('v4');
    else if (stage === 'v5') setStage('s4');
    else if (stage === 's5') setStage('v5');
    else {
      await logout();
      router.replace('/welcome');
    }
  };

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
    c.short_name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
    c.location.toLowerCase().includes(collegeSearch.toLowerCase())
  );

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleAddCustomInterest = () => {
    if (!customInterest.trim()) return;
    const clean = customInterest.trim();
    if (!interests.includes(clean)) {
      setInterests([...interests, clean]);
    }
    setCustomInterest('');
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location permission to auto-detect your city.');
        setDetectingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const lat = currentLocation.coords.latitude;
      const lon = currentLocation.coords.longitude;
      setLatitude(lat);
      setLongitude(lon);

      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (geocode && geocode.length > 0) {
        const city = geocode[0].city || geocode[0].district || geocode[0].region || 'Delhi';
        const country = geocode[0].country || 'India';
        setLocationText(`${city}, ${country}`);
      } else {
        setLocationText('New Delhi, India');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to retrieve location coordinates.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const pickPhoto = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need photo gallery access to select your photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        const newPhotos = [...photos];
        newPhotos[index] = base64Uri;
        setPhotos(newPhotos.filter(Boolean));
      }
    } catch (error) {
      console.warn("Gallery error:", error);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos.filter(Boolean));
    
    const newPrompts: { [key: number]: string } = {};
    for (const key in photoPrompts) {
      const idx = parseInt(key, 10);
      if (idx < index) {
        newPrompts[idx] = photoPrompts[idx];
      } else if (idx > index) {
        newPrompts[idx - 1] = photoPrompts[idx];
      }
    }
    setPhotoPrompts(newPrompts);
  };

  const handleNext = async () => {
    if (stage === 's1') {
      if (!name.trim()) {
        Alert.alert('Required', 'Please enter your name');
        return;
      }
      if (!dob) {
        Alert.alert('Required', 'Please select your Date of Birth');
        return;
      }
      const calculatedAge = calculateAge(dob);
      if (calculatedAge < 18) {
        Alert.alert('Access Denied 🔞', 'Users below 18 years of age are not allowed on Off Campus.');
        return;
      }
      if (!gender) {
        Alert.alert('Required', 'Please select your gender');
        return;
      }
      const calculatedHeightCm = Math.round((heightFeet * 12 + heightInches) * 2.54);
      if (calculatedHeightCm <= 0) {
        Alert.alert('Required', 'Please select a valid height');
        return;
      }
      setStage('v2');
    } else if (stage === 's2') {
      if (!locationText.trim()) {
        Alert.alert('Required', 'Please specify your location or auto-detect it.');
        return;
      }
      setStage('v3');
    } else if (stage === 's3') {
      // Bio & Interests are both optional!
      setStage('v4');
    } else if (stage === 's4') {
      if (!collegeId) {
        Alert.alert('Required', 'Please select your college');
        return;
      }
      if (!course.trim()) {
        Alert.alert('Required', 'Please enter your course major');
        return;
      }
      if (!year) {
        Alert.alert('Required', 'Please select your year of study');
        return;
      }
      setStage('v5');
    } else if (stage === 's5') {
      if (photos.length < 2) {
        Alert.alert('Required', 'Please upload at least 2 photos (Main Cover Photo + 1 additional photo).');
        return;
      }
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Helper function to handle fetch with timeout
      const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 5000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(id);
          return response;
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      let isSuccess = false;
      let checkVerification = false;

      const selectedCollege = colleges.find(c => c.college_id === collegeId);
      const collegeName = selectedCollege ? selectedCollege.name : '';

      const payload = {
        name,
        age: parseInt(age),
        gender,
        gender_preference: genderPreference,
        height: Math.round((heightFeet * 12 + heightInches) * 2.54),
        location: locationText,
        latitude: latitude || 28.6139,
        longitude: longitude || 77.2090,
        photos,
        cover_photo: photos[0] || null,
        main_photo: photos[0] || null,
        picture: photos[0] || null,
        prompts: photoPrompts,
        interests,
        religion,
        drink,
        smoke,
        weed,
        college_id: collegeId,
        college_name: collegeName,
        course,
        year,
      };

      try {
        console.log('[Onboarding] Submitting profile setup payload to backend...');
        const response = await fetchWithTimeout(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/update`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify(payload),
        }, 5000); // 5s timeout

        if (response.ok) {
          console.log('[Onboarding] Backend update succeeded.');
          isSuccess = true;
          try {
            await refreshUser();
            const updatedUser = await fetchWithTimeout(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
              headers: { 'Authorization': `Bearer ${sessionToken}` },
            }, 3000).then(r => r.json());

            if (updatedUser.user?.verification_status === 'verified') {
              checkVerification = true;
            }
          } catch (meError) {
            console.warn('Failed to refresh user or fetch updated profile:', meError);
          }
        } else {
          const errData = await response.json().catch(() => ({ detail: '' }));
          const detailMsg = errData.detail || '';
          if (detailMsg.includes('Inappropriate content detected') || detailMsg.includes('content moderation')) {
            Alert.alert(
              'Inappropriate Content Detected',
              'Our AI content filter flagged your image as inappropriate. Please upload a safe photo.',
              [{ text: 'OK' }]
            );
            setLoading(false);
            return;
          }
          console.warn(`Backend returned non-ok status: ${response.status}. Falling back to local success.`);
          isSuccess = true;
        }
      } catch (fetchError: any) {
        const errorMsg = fetchError.message || '';
        if (errorMsg.includes('Inappropriate content detected') || errorMsg.includes('content moderation')) {
          Alert.alert(
            'Inappropriate Content Detected',
            'Our AI content filter flagged your image as inappropriate. Please upload a safe photo.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
        console.warn('Backend update failed/timed out, falling back to local update:', fetchError);
        isSuccess = true;
      }

      if (isSuccess) {
        if (updateUser) {
          updateUser(payload as any);
        }

        if (checkVerification) {
          console.log('[Onboarding] User verified, routing to discover...');
          router.replace('/(tabs)/discover');
        } else {
          console.log('[Onboarding] User not verified, routing to verification screen...');
          router.replace('/onboarding/verification');
        }
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMsg = error.message || '';
      if (errorMsg.includes('Inappropriate content detected') || errorMsg.includes('content moderation')) {
        Alert.alert(
          'Inappropriate Content Detected',
          'Our AI content filter flagged your image as inappropriate. Please upload a safe photo.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStepNumber = () => {
    if (stage === 's1') return 1;
    if (stage === 's2') return 2;
    if (stage === 's3') return 3;
    if (stage === 's4') return 4;
    if (stage === 's5') return 5;
    return 1;
  };

  // Render Video Interstitial Screen
  if (stage.startsWith('v')) {
    const videoData = VIDEO_STEPS[stage];
    return (
      <View style={[styles.videoContainer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
        <Video
          source={videoData.videoSource}
          rate={1.0}
          volume={1.0}
          isMuted={true}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={[
            'rgba(12, 8, 18, 0.4)',
            'rgba(12, 8, 18, 0.65)',
            'rgba(12, 8, 18, 0.85)',
            '#0c0812'
          ]}
          locations={[0.0, 0.35, 0.7, 1.0]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.videoBottomSection}>
          <View style={styles.videoSlideCard}>
            <Text style={styles.videoSlideTitle}>{videoData.title}</Text>
            <Text style={styles.videoSlideDesc}>{videoData.subtitle}</Text>
          </View>

          {/* 5 Dots Indicator */}
          <View style={styles.videoDotsRow}>
            {[0, 1, 2, 3, 4].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.videoDot,
                  idx === videoData.dotIndex ? styles.videoDotActive : styles.videoDotInactive,
                ]}
              />
            ))}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.videoNavigationRow}>
            {videoData.prevStage ? (
              <TouchableOpacity
                style={styles.videoSkipBtn}
                activeOpacity={0.7}
                onPress={() => setStage(videoData.prevStage!)}
              >
                <Text style={styles.videoSkipText}>Previous</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}

            <TouchableOpacity
              style={styles.videoNextBtn}
              activeOpacity={0.85}
              onPress={() => setStage(videoData.nextStage)}
            >
              <Text style={styles.videoNextText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const currentStepNum = getStepNumber();

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── BACKGROUND GLOW BALL (Dark Purple gradient matching Discover, Likes, Live, Nearby, Profile, Verification) ─── */}
      <View style={styles.glowBallContainer}>
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={StyleSheet.absoluteFillObject} />
      {/* ─── END BACKGROUND ─── */}

      <View style={styles.overlayContainer}>
        {/* Header Navigation */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>STEP {currentStepNum} OF 5</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${(currentStepNum / 5) * 100}%` }]} />
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Basics */}
            {stage === 's1' && (
              <View style={styles.glassCard}>
                {/* Glass top-edge highlight */}
                <View style={styles.glassTopHighlight} />

                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>The Basics</Text>
                  <Text style={styles.stepSubtitle}>Tell us the foundational details to match you accurately</Text>
                </View>

                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="First & Last Name"
                      placeholderTextColor="#71717A"
                      value={name}
                      onChangeText={setName}
                    />
                  </View>
                </View>

                {/* DOB Picker */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>DATE OF BIRTH <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={() => {
                      setTempSelectedDob(dob || new Date(new Date().getFullYear() - 18, 0, 1));
                      setShowDatePicker(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <Text style={[styles.dobText, !dob && styles.placeholderText]}>
                      {dob ? dob.toLocaleDateString('en-GB') : 'Select your date of birth'}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={18} color="#A899B8" style={styles.chevronIcon} />
                  </TouchableOpacity>
                </View>

                {/* Height Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>HEIGHT <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.inputWrapper}
                    onPress={openHeightPicker}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="resize-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <Text style={styles.dobText}>
                      {heightFeet} ft {heightInches} in
                    </Text>
                    <Ionicons
                      name="chevron-down-outline"
                      size={18}
                      color="#A899B8"
                      style={styles.chevronIcon}
                    />
                  </TouchableOpacity>
                </View>

                {/* Gender */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GENDER <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <View style={styles.optionsRow}>
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ].map((g) => {
                      const isActive = gender === g.value;
                      return (
                        <TouchableOpacity
                          key={g.value}
                          style={[styles.optionGridButton, isActive && styles.optionGridButtonActive]}
                          onPress={() => setGender(g.value)}
                        >
                          <Text style={[styles.optionGridText, isActive && styles.optionGridTextActive]}>
                            {g.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Gender Preference */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GENDER PREFERRED <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <View style={styles.optionsRow}>
                    {[
                      { value: 'male', label: 'Men' },
                      { value: 'female', label: 'Women' },
                      { value: 'both', label: 'Both' }
                    ].map((lf) => {
                      const isActive = genderPreference === lf.value;
                      return (
                        <TouchableOpacity
                          key={lf.value}
                          style={[styles.optionGridButton, isActive && styles.optionGridButtonActive]}
                          onPress={() => setGenderPreference(lf.value)}
                        >
                          <Text style={[styles.optionGridText, isActive && styles.optionGridTextActive]}>
                            {lf.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

              </View>
            )}

            {/* Step 2: Location & Habits */}
            {stage === 's2' && (
              <View style={styles.glassCard}>
                <View style={styles.glassTopHighlight} />

                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Location & Habits</Text>
                  <Text style={styles.stepSubtitle}>Location and lifestyle preferences</Text>
                </View>

                {/* Location Detection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CURRENT LOCATION</Text>
                  <View style={styles.locationRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <TextInput
                        style={styles.input}
                        placeholder="City, State"
                        placeholderTextColor="#71717A"
                        value={locationText}
                        onChangeText={setLocationText}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.locationBtn}
                      onPress={handleDetectLocation}
                      disabled={detectingLocation}
                    >
                      {detectingLocation ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Ionicons name="locate-outline" size={22} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Religion */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>RELIGION (OPTIONAL)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Hindu, Muslim, Christian, Sikh, etc."
                      placeholderTextColor="#71717A"
                      value={religion}
                      onChangeText={setReligion}
                    />
                  </View>
                </View>

                {/* Habits */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>HABITS (LIFESTYLE)</Text>
                  <View style={styles.habitsColumn}>
                    {[
                      { key: 'drink', label: 'Do you drink?', state: drink, set: setDrink },
                      { key: 'smoke', label: 'Do you smoke?', state: smoke, set: setSmoke },
                      { key: 'weed', label: 'Do you use weed?', state: weed, set: setWeed }
                    ].map((h) => (
                      <View key={h.key} style={styles.habitRow}>
                        <Text style={styles.habitLabel}>{h.label}</Text>
                        <View style={styles.habitButtons}>
                          {['yes', 'no'].map((val) => {
                            const isSel = h.state === val;
                            return (
                              <TouchableOpacity
                                key={val}
                                style={[styles.habitBtn, isSel && styles.habitBtnActive]}
                                onPress={() => h.set(val)}
                              >
                                <Text style={[styles.habitBtnText, isSel && styles.habitBtnTextActive]}>
                                  {val.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Step 3: Bio & Interests */}
            {stage === 's3' && (
              <View style={styles.glassCard}>
                <View style={styles.glassTopHighlight} />

                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Bio & Interests</Text>
                  <Text style={styles.stepSubtitle}>Express your personality and pick what you love</Text>
                </View>

                {/* Bio */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>BIO (OPTIONAL)</Text>
                    <Text style={styles.charCount}>{bio.length}/150</Text>
                  </View>
                  <View style={styles.textAreaWrapper}>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Write something interesting..."
                      placeholderTextColor="#71717A"
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={4}
                      maxLength={150}
                    />
                  </View>
                </View>

                {/* Interests */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>INTERESTS (OPTIONAL)</Text>
                  
                  {/* Custom Interest Input */}
                  <View style={[styles.locationRow, { marginBottom: 12 }]}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <Ionicons name="sparkles-outline" size={18} color="#A899B8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Add custom interest..."
                        placeholderTextColor="#71717A"
                        value={customInterest}
                        onChangeText={setCustomInterest}
                        onSubmitEditing={handleAddCustomInterest}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.addInterestBtn}
                      onPress={handleAddCustomInterest}
                    >
                      <Text style={styles.addInterestBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.interestsGrid}>
                    {interests.map((interest) => {
                      const isActive = interests.includes(interest);
                      return (
                        <TouchableOpacity
                          key={interest}
                          style={[
                            styles.interestChip,
                            isActive && styles.interestChipActive
                          ]}
                          onPress={() => toggleInterest(interest)}
                        >
                          <Text style={[
                            styles.interestText,
                            isActive && styles.interestTextActive
                          ]}>
                            {interest} ✕
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {INTERESTS.filter(i => !interests.includes(i)).map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={styles.interestChip}
                        onPress={() => toggleInterest(interest)}
                      >
                        <Text style={styles.interestText}>
                          {interest}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Step 4: College Connection */}
            {stage === 's4' && (
              <View style={styles.glassCard}>
                <View style={styles.glassTopHighlight} />

                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Your College</Text>
                  <Text style={styles.stepSubtitle}>Find and select your current institution</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SELECT YOUR CAMPUS <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#FFF" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Type college name..."
                      placeholderTextColor="#71717A"
                      value={collegeSearch}
                      onChangeText={setCollegeSearch}
                    />
                    {collegeSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setCollegeSearch('')} style={styles.clearSearch}>
                        <Ionicons name="close-circle" size={20} color="#A899B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.collegeList}>
                  {(() => {
                    const displayColleges = (collegeId && !collegeSearch.trim())
                      ? filteredColleges.filter(c => c.college_id === collegeId)
                      : filteredColleges;

                    if (displayColleges.length === 0) {
                      return (
                        <View style={styles.noResults}>
                          <Ionicons name="alert-circle-outline" size={24} color="#A899B8" style={{ marginBottom: 4 }} />
                          <Text style={styles.noResultsText}>No colleges match your search</Text>
                          {collegeSearch.trim().length > 0 && (
                            <TouchableOpacity style={styles.addCustomBtn} onPress={handleAddCustomCollege}>
                              <View style={styles.addCustomWhite}>
                                <Ionicons name="add-circle-outline" size={18} color="#000" />
                                <Text style={styles.addCustomBtnText}>Add "{collegeSearch.trim()}"</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    }

                    return displayColleges.map((college) => {
                      const isActive = collegeId === college.college_id;
                      return (
                        <TouchableOpacity
                          key={college.college_id}
                          style={[
                            styles.collegeItem,
                            isActive && styles.collegeItemActive
                          ]}
                          onPress={() => {
                            if (isActive && !collegeSearch.trim()) {
                              setCollegeId('');
                            } else {
                              setCollegeId(college.college_id);
                            }
                          }}
                        >
                          <View style={[styles.collegeIconBox, isActive && styles.collegeIconBoxActive]}>
                            <Ionicons name="school-outline" size={20} color="#FFF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[
                              styles.collegeName,
                              isActive && styles.collegeNameActive
                            ]}>
                              {college.name}
                            </Text>
                            <Text style={styles.collegeLocation}>
                              {isActive && !collegeSearch.trim() ? 'Tap to change college' : college.location}
                            </Text>
                          </View>
                          {isActive ? (
                            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                          ) : (
                            <View style={styles.collegeUncheckCircle} />
                          )}
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>

                <View style={[styles.inputGroup, { marginTop: 24 }]}>
                  <Text style={styles.label}>YEAR OF STUDY <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <View style={styles.optionsRow}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'].map((y) => {
                      const isActive = year === y;
                      return (
                        <TouchableOpacity
                          key={y}
                          style={[styles.optionGridButton, isActive && styles.optionGridButtonActive]}
                          onPress={() => setYear(y)}
                        >
                          <Text style={[styles.optionGridText, isActive && styles.optionGridTextActive]}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>COURSE / MAJOR <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="book-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. English Hons"
                      placeholderTextColor="#71717A"
                      value={course}
                      onChangeText={setCourse}
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Step 5: Photos & Prompts */}
            {stage === 's5' && (
              <View style={styles.glassCard}>
                <View style={styles.glassTopHighlight} />

                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Upload Photos <Text style={{ color: '#FF3366' }}>*</Text></Text>
                  <Text style={styles.stepSubtitle}>Add up to 6 photos. Main photo + at least 1 more photo is required.</Text>
                </View>

                <View style={styles.photosGrid}>
                  {Array(6).fill('').map((_, index) => {
                    const photoUri = photos[index];
                    const hasPrompt = !!photoPrompts[index];
                    
                    return (
                      <View key={index} style={styles.photoSlotWrapper}>
                        {index > 0 && photoUri && !hasPrompt && (
                          <TouchableOpacity 
                            style={styles.choosePromptBtn} 
                            onPress={() => {
                              setActivePhotoIndex(index);
                              setTempPrompt('');
                              setTempAnswer('');
                              setShowPromptModal(true);
                            }}
                          >
                            <Text style={styles.choosePromptText}>Choose Prompt</Text>
                          </TouchableOpacity>
                        )}
                        {index > 0 && photoUri && hasPrompt && (
                          <View style={styles.promptDisplayContainer}>
                            <Text style={styles.promptDisplayQuestion} numberOfLines={2}>{photoPrompts[index]}</Text>
                            <TouchableOpacity 
                              style={styles.promptDeleteBtn} 
                              onPress={() => {
                                const newPrompts = { ...photoPrompts };
                                delete newPrompts[index];
                                setPhotoPrompts(newPrompts);
                              }}
                            >
                              <Ionicons name="close" size={14} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        )}

                        {photoUri ? (
                          <View style={[styles.photoCard, { borderColor: '#C2FF3D', borderWidth: 2 }]}>
                            <Image source={{ uri: photoUri }} style={styles.photoImg} />
                            <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => removePhoto(index)}>
                              <Ionicons name="close" size={16} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.photoAddCard} onPress={() => pickPhoto(index)}>
                            <Ionicons name="add" size={28} color="#FFF" />
                          </TouchableOpacity>
                        )}
                        
                        {index === 0 ? (
                          <Text style={[styles.photoSlotLabel, { color: '#A899B8', fontSize: 11 }]}>Main Photo</Text>
                        ) : (
                          <Text style={styles.photoSlotLabel}>Slot {index + 1}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Prompt Selection Modal (Bottom Sheet) */}
          {showPromptModal && (
            <Modal
              transparent
              animationType="slide"
              visible={showPromptModal}
              onRequestClose={() => {
                setShowPromptModal(false);
                setTempPrompt('');
                setTempAnswer('');
              }}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => {
                  setShowPromptModal(false);
                  setTempPrompt('');
                  setTempAnswer('');
                }}
              >
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  style={{ width: '100%', justifyContent: 'flex-end' }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.promptModalSheet}
                    onPress={(e) => e.stopPropagation?.()}
                  >
                    <View style={styles.sheetHandle} />
                    <Text style={styles.promptModalTitle}>Choose Prompt</Text>
                    
                    <ScrollView style={styles.promptModalScroll} showsVerticalScrollIndicator={false}>
                      {PROMPTS.map((p) => {
                        const isSel = tempPrompt === p;
                        return (
                          <TouchableOpacity
                            key={p}
                            style={[styles.optionRowButton, isSel && styles.optionRowButtonActive, { marginBottom: 8 }]}
                            onPress={() => setTempPrompt(prev => prev === p ? '' : p)}
                          >
                            <Text style={[styles.optionText, isSel && styles.optionTextActive, { fontSize: 14, flex: 1 }]}>
                              {p}
                            </Text>
                            <Ionicons
                              name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={isSel ? '#C2FF3D' : '#A899B8'}
                            />
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>OR WRITE YOUR OWN PROMPT</Text>
                    <View style={[styles.textAreaWrapper, { borderColor: tempAnswer.length > 0 ? '#C2FF3D' : 'rgba(255, 255, 255, 0.1)' }]}>
                      <TextInput
                        style={[styles.textArea, { height: 75 }]}
                        placeholder="Type your response..."
                        placeholderTextColor="#71717A"
                        value={tempAnswer}
                        onChangeText={setTempAnswer}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    <View style={styles.promptModalActions}>
                      <TouchableOpacity 
                        style={styles.promptModalCancel} 
                        onPress={() => {
                          setShowPromptModal(false);
                          setTempPrompt('');
                          setTempAnswer('');
                        }}
                      >
                        <Text style={styles.promptModalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.promptModalAdd, { opacity: (tempAnswer.trim() || tempPrompt) ? 1 : 0.5 }]} 
                        onPress={() => {
                          const finalPrompt = tempAnswer.trim() || tempPrompt;
                          if (activePhotoIndex !== null && finalPrompt) {
                            setPhotoPrompts(prev => ({
                              ...prev,
                              [activePhotoIndex]: finalPrompt
                            }));
                            setShowPromptModal(false);
                            setTempPrompt('');
                            setTempAnswer('');
                          }
                        }}
                        disabled={!(tempAnswer.trim() || tempPrompt)}
                      >
                        <Text style={styles.promptModalAddText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Android Date Picker */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dob || tempSelectedDob || new Date(new Date().getFullYear() - 18, 0, 1)}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* iOS Date Picker Modal */}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide" visible={showDatePicker}>
              <View style={styles.modalOverlay}>
                <View style={styles.datePickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      setShowDatePicker(false);
                      if (tempSelectedDob) {
                        confirmDob(tempSelectedDob);
                      }
                    }}>
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempSelectedDob || dob || new Date(new Date().getFullYear() - 18, 0, 1)}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    textColor="#FFF"
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Height Picker Modal */}
          {showHeightPicker && (
            <Modal transparent animationType="slide" visible={showHeightPicker}>
              <View style={styles.modalOverlay}>
                <View style={styles.datePickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={cancelHeight}>
                      <Text style={styles.pickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmHeight}>
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.heightPickerRow}>
                    <View style={styles.pickerCol}>
                      <Text style={styles.pickerColLabel}>Feet</Text>
                      {Platform.OS === 'android' ? (
                        <ScrollView style={styles.customPickerScroll} showsVerticalScrollIndicator={false}>
                          {[4, 5, 6, 7].map((f) => {
                            const isSelected = tempFeet === f;
                            return (
                              <TouchableOpacity
                                key={f}
                                style={[styles.customPickerItem, isSelected && styles.customPickerItemActive]}
                                onPress={() => setTempFeet(f)}
                              >
                                <Text style={[styles.customPickerText, isSelected && styles.customPickerTextActive]}>
                                  {f} ft
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <Picker
                          selectedValue={tempFeet}
                          style={styles.wheelPicker}
                          itemStyle={styles.pickerItem}
                          onValueChange={(itemValue: any) => setTempFeet(itemValue)}
                        >
                          {[4, 5, 6, 7].map((f) => (
                            <Picker.Item key={f} label={`${f} ft`} value={f} color="#FFF" style={styles.pickerItem} />
                          ))}
                        </Picker>
                      )}
                    </View>
                    <View style={styles.pickerCol}>
                      <Text style={styles.pickerColLabel}>Inches</Text>
                      {Platform.OS === 'android' ? (
                        <ScrollView style={styles.customPickerScroll} showsVerticalScrollIndicator={false}>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((inc) => {
                            const isSelected = tempInches === inc;
                            return (
                              <TouchableOpacity
                                key={inc}
                                style={[styles.customPickerItem, isSelected && styles.customPickerItemActive]}
                                onPress={() => setTempInches(inc)}
                              >
                                <Text style={[styles.customPickerText, isSelected && styles.customPickerTextActive]}>
                                  {inc} in
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <Picker
                          selectedValue={tempInches}
                          style={styles.wheelPicker}
                          itemStyle={styles.pickerItem}
                          onValueChange={(itemValue: any) => setTempInches(itemValue)}
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((inc) => (
                            <Picker.Item key={inc} label={`${inc} in`} value={inc} color="#FFF" style={styles.pickerItem} />
                          ))}
                        </Picker>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Footer Next Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={loading}
            >
              <View style={styles.nextButtonWhite}>
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {stage === 's5' ? 'COMPLETE SETUP' : 'CONTINUE'}
                    </Text>
                    <Ionicons name="arrow-forward-outline" size={20} color="#000" />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050005' },
  overlayContainer: { flex: 1, zIndex: 2 },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    padding: 20,
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: '#8C50FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glassTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },

  // Progress Bar
  progressContainer: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },

  // Scroll View
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Step Header
  textHeader: { marginBottom: 20 },
  stepTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 6,
    lineHeight: 18,
  },

  // Inputs
  inputGroup: { gap: 8, marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  chevronIcon: { marginLeft: 'auto' },
  dobText: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderText: { color: '#71717A' },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 2,
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selections
  optionsColumn: { gap: 12 },
  optionRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionRowButtonActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionGridButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  optionGridButtonActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  optionGridText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A899B8',
  },
  optionGridTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Habits
  habitsColumn: {
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    padding: 16,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitLabel: {
    color: '#E4E4E7',
    fontSize: 14,
    fontWeight: '600',
  },
  habitButtons: { flexDirection: 'row', gap: 8 },
  habitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    width: 54,
    alignItems: 'center',
  },
  habitBtnActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  habitBtnText: {
    fontSize: 11,
    color: '#A899B8',
    fontWeight: '700',
  },
  habitBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Textarea
  textAreaWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textArea: {
    height: 90,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#C2FF3D',
    fontWeight: '700',
  },

  // College Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 12,
  },
  clearSearch: { padding: 4 },
  collegeList: { gap: 10 },
  noResults: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
  },
  noResultsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  collegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  collegeItemActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  collegeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collegeIconBoxActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  collegeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  collegeNameActive: { color: '#FFF', fontWeight: '800' },
  collegeLocation: {
    fontSize: 11,
    color: '#A899B8',
    marginTop: 2,
  },
  collegeUncheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  addCustomBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  addCustomWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  addCustomBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },

  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  interestChipActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A899B8',
  },
  interestTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // Photos
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  photoSlotWrapper: {
    width: '48%',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  photoCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  photoAddCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  photoImg: { width: '100%', height: '100%' },
  photoDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A899B8',
    letterSpacing: 1,
  },

  // Modals
  choosePromptBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  choosePromptText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  promptDisplayContainer: {
    width: '100%',
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    borderWidth: 1,
    borderColor: '#C2FF3D',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    position: 'relative',
  },
  promptDisplayQuestion: {
    color: '#C2FF3D',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
    paddingRight: 16,
  },
  promptDisplayAnswer: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
    paddingRight: 16,
  },
  promptDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInterestBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addInterestBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 14,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  promptModalSheet: {
    backgroundColor: '#16121E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    width: '100%',
    maxHeight: '85%',
  },
  promptModalContainer: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  promptModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  promptModalScroll: {
    maxHeight: 340,
    marginBottom: 16,
  },
  promptModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  promptModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  promptModalCancelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  promptModalAdd: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  promptModalAddText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  pickerCancelText: {
    color: '#C2FF3D',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerConfirmText: {
    color: '#C2FF3D',
    fontSize: 16,
    fontWeight: '800',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  nextButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  nextButtonWhite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  nextButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  nextButtonDisabled: { opacity: 0.6 },

  // Height Picker
  heightPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pickerCol: {
    flex: 1,
    alignItems: 'stretch',
    marginHorizontal: 8,
  },
  pickerColLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  wheelPicker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 200 : 50,
    backgroundColor: 'transparent',
    color: '#FFF',
  },
  pickerItem: {
    color: '#FFF',
    fontSize: 20,
    height: Platform.OS === 'ios' ? 200 : 50,
  },
  heightPickerBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    marginTop: 6,
  },
  pickerSubLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A899B8',
    letterSpacing: 1,
  },
  androidPickerWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 6,
  },
  customPickerScroll: {
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 6,
  },
  customPickerItem: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    marginVertical: 2,
    borderWidth: 1.2,
    borderColor: 'transparent',
  },
  customPickerItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  customPickerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  customPickerTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Video Screen Interstitial Styles (100% matching walkthrough.tsx)
  videoContainer: {
    flex: 1,
    backgroundColor: '#0c0812',
    position: 'relative',
  },
  videoBottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 35,
    alignItems: 'center',
    zIndex: 10,
  },
  videoSlideCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 35,
    minHeight: 110,
  },
  videoSlideTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  videoSlideDesc: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  videoDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  videoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  videoDotActive: {
    backgroundColor: '#C2FF3D',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  videoDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  videoNavigationRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoSkipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  videoSkipText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  videoNextBtn: {
    backgroundColor: '#C2FF3D',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  videoNextText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
});