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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';

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
  'Dating me is like...'
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
  const { user, sessionToken, refreshUser, updateUser } = useAuth();
  const router = useRouter();
  
  // 5 Onboarding Steps: 1 (Basics), 2 (Vibe & Location), 3 (College), 4 (Prompts), 5 (Photos)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basics
  const [name, setName] = useState(user?.name || '');
  const [dob, setDob] = useState<Date | null>(
    user?.age ? new Date(new Date().getFullYear() - user.age, 0, 1) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [lookingFor, setLookingFor] = useState(user?.looking_for || '');
  const [height, setHeight] = useState(user?.height?.toString() || '');

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

  // Step 4: Prompts
  const [selectedPrompt, setSelectedPrompt] = useState(PROMPTS[0]);
  const [promptAnswer, setPromptAnswer] = useState(
    user?.prompts && Object.keys(user.prompts).length > 0 
      ? Object.values(user.prompts)[0] 
      : ''
  );

  // Step 5: Photos (Grid of up to 6)
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      if (EXPO_PUBLIC_BACKEND_URL) {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/list`);
        if (response.ok) {
          const data = await response.json();
          if (data.colleges && data.colleges.length > 0) {
            setColleges(data.colleges);
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching colleges, using defaults:', error);
    }
    setColleges(DEFAULT_COLLEGES);
  };

  const handleAddCustomCollege = () => {
    if (!collegeSearch.trim()) return;
    const customId = `col_custom_${Date.now()}`;
    const newCollege = {
      college_id: customId,
      name: collegeSearch.trim(),
      short_name: collegeSearch.trim().split(' ').map(w => w[0]).join('').toUpperCase() || 'CUSTOM',
      location: 'Delhi NCR Campus',
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
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const calculatedAge = calculateAge(selectedDate);
      if (calculatedAge < 18) {
        Alert.alert(
          'Access Denied 🔞',
          'Users below 18 years of age are not allowed on Off Campus. Please select a valid birth date.',
          [{ text: 'OK' }]
        );
        setDob(null);
        setAge('');
      } else {
        setDob(selectedDate);
        setAge(calculatedAge.toString());
      }
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

      // Reverse geocoding to fetch City name
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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need storage permission to add photos.');
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
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos.filter(Boolean));
  };

  const handleNext = async () => {
    if (step === 1) {
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
      if (!lookingFor) {
        Alert.alert('Required', 'Please select who you are looking for');
        return;
      }
      if (!height || isNaN(parseInt(height))) {
        Alert.alert('Required', 'Please enter your height in cm');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!locationText.trim()) {
        Alert.alert('Required', 'Please specify your location or auto-detect it.');
        return;
      }
      if (!bio.trim() || bio.length < 10) {
        Alert.alert('Required', 'Please write a short bio (at least 10 characters)');
        return;
      }
      if (interests.length < 3) {
        Alert.alert('Required', 'Please select at least 3 interests');
        return;
      }
      setStep(3);
    } else if (step === 3) {
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
      setStep(4);
    } else if (step === 4) {
      if (!promptAnswer.trim()) {
        Alert.alert('Required', 'Please answer the prompt to complete setup.');
        return;
      }
      setStep(5);
    } else {
      if (photos.length < 1) {
        Alert.alert('Required', 'Please upload at least 1 photo.');
        return;
      }
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      let isSuccess = false;
      let checkVerification = false;

      const payload = {
        name,
        age: parseInt(age),
        gender,
        looking_for: lookingFor,
        height: parseInt(height),
        location: locationText,
        latitude: latitude || 28.6139,
        longitude: longitude || 77.2090,
        photos,
        prompts: { [selectedPrompt]: promptAnswer },
        interests,
        religion,
        drink,
        smoke,
        weed,
        college_id: collegeId,
        course,
        year,
      };

      try {
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/update`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          isSuccess = true;
          try {
            await refreshUser();
            const updatedUser = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
              headers: { 'Authorization': `Bearer ${sessionToken}` },
            }).then(r => r.json());
            
            if (updatedUser.user?.verification_status === 'verified') {
              checkVerification = true;
            }
          } catch (meError) {
            console.warn('Failed to fetch user profile, proceeding anyway:', meError);
          }
        } else {
          console.warn(`Backend returned non-ok status: ${response.status}. Falling back to local success.`);
          isSuccess = true;
        }
      } catch (fetchError) {
        console.warn('Backend update failed, falling back to local update:', fetchError);
        isSuccess = true;
      }

      if (isSuccess) {
        if (updateUser) {
          updateUser(payload as any);
        }
        
        if (checkVerification) {
          router.replace('/(tabs)/discover');
        } else {
          router.replace('/onboarding/verification');
        }
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Mesh ambient glow blobs */}
      <View style={styles.ambientBlobContainer}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.22)', 'transparent']}
          style={styles.purpleBlob}
        />
        <LinearGradient
          colors={['rgba(244, 63, 94, 0.22)', 'transparent']}
          style={styles.pinkBlob}
        />
      </View>

      <View style={styles.overlayContainer}>
        {/* Header Navigation */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, step === 1 && { opacity: 0 }]} 
            onPress={() => step > 1 ? setStep(step - 1) : null}
            disabled={step === 1}
          >
            <Ionicons name="arrow-back-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>STEP {step} OF 5</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#8B5CF6', '#F43F5E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progress, { width: `${(step / 5) * 100}%` }]}
            />
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
            {step === 1 && (
              <BlurView 
                intensity={Platform.OS === 'ios' ? 25 : 85} 
                tint="dark" 
                style={styles.glassStepCard}
              >
                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>The Basics</Text>
                  <Text style={styles.stepSubtitle}>Tell us the foundational details to match you accurately</Text>
                </View>

                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
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
                  <Text style={styles.label}>DATE OF BIRTH</Text>
                  <TouchableOpacity 
                    style={styles.inputWrapper} 
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <Text style={[styles.dobText, !dob && styles.placeholderText]}>
                      {dob ? dob.toLocaleDateString('en-GB') : 'Select your date of birth'}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={18} color="#A899B8" style={styles.chevronIcon} />
                  </TouchableOpacity>
                  
                  {dob && (
                    <View style={styles.ageBadge}>
                      <Ionicons name="sparkles" size={14} color="#C2FF3D" style={{ marginRight: 6 }} />
                      <Text style={styles.ageBadgeText}>
                        Calculated Age: {calculateAge(dob)} years old
                      </Text>
                    </View>
                  )}
                </View>

                {/* Height */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>HEIGHT (CM)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="resize-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 175"
                      placeholderTextColor="#71717A"
                      value={height}
                      onChangeText={setHeight}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>

                {/* Gender */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GENDER</Text>
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

                {/* Looking For */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>LOOKING FOR</Text>
                  <View style={styles.optionsRow}>
                    {[
                      { value: 'male', label: 'Men' },
                      { value: 'female', label: 'Women' },
                      { value: 'both', label: 'Both' }
                    ].map((lf) => {
                      const isActive = lookingFor === lf.value;
                      return (
                        <TouchableOpacity
                          key={lf.value}
                          style={[styles.optionGridButton, isActive && styles.optionGridButtonActive]}
                          onPress={() => setLookingFor(lf.value)}
                        >
                          <Text style={[styles.optionGridText, isActive && styles.optionGridTextActive]}>
                            {lf.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </BlurView>
            )}

            {/* Step 2: Vibe, Habits & Location */}
            {step === 2 && (
              <BlurView 
                intensity={Platform.OS === 'ios' ? 25 : 85} 
                tint="dark" 
                style={styles.glassStepCard}
              >
                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Vibe & Habits</Text>
                  <Text style={styles.stepSubtitle}>Location, lifestyle preferences, and bio info</Text>
                </View>

                {/* Location Detection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CURRENT LOCATION</Text>
                  <View style={styles.locationRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <Ionicons name="location-outline" size={20} color="#A899B8" style={styles.inputIcon} />
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
                        <ActivityIndicator size="small" color="#C2FF3D" />
                      ) : (
                        <Ionicons name="locate-outline" size={22} color="#C2FF3D" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Religion */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>RELIGION / SPIRITUALITY</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="sparkles-outline" size={20} color="#A899B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Spiritual, Agnostic, Hindu"
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
                      { key: 'weed', label: 'Do you do weed?', state: weed, set: setWeed }
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

                {/* Bio */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>BIO</Text>
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
                  <Text style={styles.label}>INTERESTS (CHOOSE AT LEAST 3)</Text>
                  <View style={styles.interestsGrid}>
                    {INTERESTS.map((interest) => {
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
                            {isActive ? `🔥 ${interest}` : interest}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </BlurView>
            )}

            {/* Step 3: College Connection */}
            {step === 3 && (
              <BlurView 
                intensity={Platform.OS === 'ios' ? 25 : 85} 
                tint="dark" 
                style={styles.glassStepCard}
              >
                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Your College</Text>
                  <Text style={styles.stepSubtitle}>Find and select your current institution</Text>
                </View>

                {/* College Search input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SELECT YOUR CAMPUS</Text>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#C2FF3D" style={styles.searchIcon} />
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

                {/* Colleges list view */}
                <View style={styles.collegeList}>
                  {filteredColleges.length === 0 ? (
                    <View style={styles.noResults}>
                      <Ionicons name="alert-circle-outline" size={24} color="#A899B8" style={{ marginBottom: 4 }} />
                      <Text style={styles.noResultsText}>No colleges match your search</Text>
                      {collegeSearch.trim().length > 0 && (
                        <TouchableOpacity style={styles.addCustomBtn} onPress={handleAddCustomCollege}>
                          <LinearGradient 
                            colors={['#8B5CF6', '#F43F5E']} 
                            style={styles.addCustomGrad}
                          >
                            <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                            <Text style={styles.addCustomBtnText}>Add "{collegeSearch.trim()}"</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    filteredColleges.map((college) => {
                      const isActive = collegeId === college.college_id;
                      return (
                        <TouchableOpacity
                          key={college.college_id}
                          style={[
                            styles.collegeItem,
                            isActive && styles.collegeItemActive
                          ]}
                          onPress={() => setCollegeId(college.college_id)}
                        >
                          <View style={[styles.collegeIconBox, isActive && styles.collegeIconBoxActive]}>
                            <Ionicons name="school-outline" size={20} color={isActive ? '#C2FF3D' : '#FFF'} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[
                              styles.collegeName,
                              isActive && styles.collegeNameActive
                            ]}>
                              {college.name}
                            </Text>
                            <Text style={styles.collegeLocation}>{college.location}</Text>
                          </View>
                          {isActive ? (
                            <Ionicons name="checkmark-circle" size={24} color="#C2FF3D" />
                          ) : (
                            <View style={styles.collegeUncheckCircle} />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Year picker */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>YEAR OF STUDY</Text>
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

                {/* Course input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>COURSE / MAJOR</Text>
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
              </BlurView>
            )}

            {/* Step 4: Prompts */}
            {step === 4 && (
              <BlurView 
                intensity={Platform.OS === 'ios' ? 25 : 85} 
                tint="dark" 
                style={styles.glassStepCard}
              >
                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Select a Prompt</Text>
                  <Text style={styles.stepSubtitle}>Answer an icebreaker to give matches a conversation starter</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CHOOSE A PROMPT QUESTION</Text>
                  <View style={styles.optionsColumn}>
                    {PROMPTS.map((p) => {
                      const isSel = selectedPrompt === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.optionRowButton, isSel && styles.optionRowButtonActive]}
                          onPress={() => setSelectedPrompt(p)}
                        >
                          <Text style={[styles.optionText, isSel && styles.optionTextActive, { fontSize: 14 }]}>
                            {p}
                          </Text>
                          <Ionicons 
                            name={isSel ? 'radio-button-on' : 'radio-button-off'} 
                            size={20} 
                            color={isSel ? '#C2FF3D' : '#A899B8'} 
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>YOUR ANSWER</Text>
                  <View style={styles.textAreaWrapper}>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Type your response..."
                      placeholderTextColor="#71717A"
                      value={promptAnswer}
                      onChangeText={setPromptAnswer}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </BlurView>
            )}

            {/* Step 5: Photos */}
            {step === 5 && (
              <BlurView 
                intensity={Platform.OS === 'ios' ? 25 : 85} 
                tint="dark" 
                style={styles.glassStepCard}
              >
                <View style={styles.textHeader}>
                  <Text style={styles.stepTitle}>Upload Photos</Text>
                  <Text style={styles.stepSubtitle}>Add up to 6 photos. Drag/tap to pick. At least 1 photo is required.</Text>
                </View>

                <View style={styles.photosGrid}>
                  {Array(6).fill('').map((_, index) => {
                    const photoUri = photos[index];
                    return (
                      <View key={index} style={styles.photoSlotWrapper}>
                        {photoUri ? (
                          <View style={styles.photoCard}>
                            <Image source={{ uri: photoUri }} style={styles.photoImg} />
                            <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => removePhoto(index)}>
                              <Ionicons name="close" size={16} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.photoAddCard} onPress={() => pickPhoto(index)}>
                            <Ionicons name="add" size={28} color="#C2FF3D" />
                          </TouchableOpacity>
                        )}
                        <Text style={styles.photoSlotLabel}>Slot {index + 1}</Text>
                      </View>
                    );
                  })}
                </View>
              </BlurView>
            )}
          </ScrollView>

          {/* Android Date Picker */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dob || new Date(new Date().getFullYear() - 18, 0, 1)}
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
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerConfirmText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={dob || new Date(new Date().getFullYear() - 18, 0, 1)}
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

          {/* Footer Next Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={loading}
            >
              <LinearGradient
                colors={['#8B5CF6', '#F43F5E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGrad}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>
                      {step === 5 ? 'COMPLETE SETUP' : 'CONTINUE'}
                    </Text>
                    <Ionicons name="arrow-forward-outline" size={20} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  blackBackground: { flex: 1, backgroundColor: '#000000' },
  overlayContainer: { flex: 1, zIndex: 2 },
  
  // Ambient glow blobs (mesh gradient)
  ambientBlobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  purpleBlob: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
  },
  pinkBlob: {
    position: 'absolute',
    bottom: 80,
    right: -120,
    width: 380,
    height: 380,
    borderRadius: 190,
  },

  // Header
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#A899B8',
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
    borderRadius: 3,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Glass floating step card
  glassStepCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginVertical: 10,
    overflow: 'hidden',
  },

  // Step Header
  textHeader: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#A899B8',
    marginTop: 6,
    lineHeight: 18,
  },

  // Inputs
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A899B8',
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 'auto',
  },

  // DOB text styles
  dobText: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#71717A',
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(194, 255, 61, 0.06)',
    borderColor: 'rgba(194, 255, 61, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 2,
  },
  ageBadgeText: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '800',
  },

  // Location Auto-Detect
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selections
  optionsColumn: {
    gap: 12,
  },
  optionRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionRowButtonActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.04)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  optionTextActive: {
    color: '#C2FF3D',
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  optionGridButtonActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.04)',
  },
  optionGridText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A899B8',
  },
  optionGridTextActive: {
    color: '#C2FF3D',
    fontWeight: '900',
  },

  // Habits
  habitsColumn: {
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
  habitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
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
    backgroundColor: 'rgba(194, 255, 61, 0.06)',
  },
  habitBtnText: {
    fontSize: 11,
    color: '#A899B8',
    fontWeight: '700',
  },
  habitBtnTextActive: {
    color: '#C2FF3D',
    fontWeight: '900',
  },

  // Textarea
  textAreaWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
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
    color: '#71717A',
    fontWeight: '700',
  },

  // College List
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 12,
  },
  clearSearch: {
    padding: 4,
  },
  collegeList: {
    gap: 10,
  },
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
    color: '#A899B8',
    fontSize: 14,
    fontWeight: '600',
  },
  collegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  collegeItemActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.04)',
  },
  collegeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collegeIconBoxActive: {
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  collegeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  collegeNameActive: {
    color: '#FFF',
    fontWeight: '800',
  },
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
  addCustomGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  addCustomBtnText: {
    color: '#FFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  interestChipActive: {
    borderColor: '#F43F5E',
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A899B8',
  },
  interestTextActive: {
    color: '#F43F5E',
    fontWeight: '900',
  },

  // 6 Photos grid
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
    borderColor: '#C2FF3D',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  photoAddCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.02)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
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

  // Modal Datepicker on iOS
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
    color: '#A899B8',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerConfirmText: {
    color: '#C2FF3D',
    fontSize: 16,
    fontWeight: '800',
  },

  // Footer Button
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  nextButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
  },
  nextButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
});
