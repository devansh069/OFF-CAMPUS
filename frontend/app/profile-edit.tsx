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
  Modal,
  Image,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const INTERESTS = [
  'Music', 'Sports', 'Gaming', 'Art', 'Photography', 'Travel', 'Reading',
  'Coding', 'Fitness', 'Dance', 'Movies', 'Anime', 'Fashion', 'Cooking',
  'Writing', 'Yoga'
];

const PROMPTS = [
  "My greatest strength is...",
  "I value most in a relationship...",
  "My favorite weekend plan is...",
  "A quote I live by is...",
  "On campus, you can find me at...",
  "My music taste is best described as..."
];

const devanagariMap: { [key: string]: string } = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

const convertDevanagariToAscii = (text: string): string => {
  return text.replace(/[०-९]/g, (char) => devanagariMap[char] || char);
};

export default function ProfileEdit() {
  const { user, sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'view'>('edit');
  
  // Fields state
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [course, setCourse] = useState(user?.course || '');
  const [year, setYear] = useState(user?.year || '');
  const [genderPreference, setGenderPreference] = useState(user?.gender_preference || 'both');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [gender, setGender] = useState(user?.gender || '');
  const [religion, setReligion] = useState(user?.religion || '');
  const [drink, setDrink] = useState(user?.drink || 'no');
  const [smoke, setSmoke] = useState(user?.smoke || 'no');
  const [weed, setWeed] = useState(user?.weed || 'no');
  const [locationText, setLocationText] = useState(user?.location || '');
  const [latitude, setLatitude] = useState<number | null>(user?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(user?.longitude || null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeId, setCollegeId] = useState(user?.college_id || '');

  // Photos & Prompts states
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [photoPrompts, setPhotoPrompts] = useState<{ [index: number]: string }>(
    user?.prompts && typeof user.prompts === 'object' ? (user.prompts as any) : {}
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [tempPrompt, setTempPrompt] = useState(PROMPTS[0]);
  const [tempAnswer, setTempAnswer] = useState('');

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
    setColleges([
      { college_id: 'col_stephens', name: "St. Stephen's College", short_name: 'SSC', location: 'North Campus, Delhi' },
      { college_id: 'col_hindu', name: 'Hindu College', short_name: 'HC', location: 'North Campus, Delhi' },
      { college_id: 'col_dtu', name: 'Delhi Technological University', short_name: 'DTU', location: 'Shahbad Daulatpur, Delhi' },
      { college_id: 'col_nsut', name: 'Netaji Subhas University of Technology', short_name: 'NSUT', location: 'Dwarka, Delhi' },
      { college_id: 'col_iitd', name: 'Indian Institute of Technology Delhi', short_name: 'IITD', location: 'Hauz Khas, Delhi' }
    ]);
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

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
    c.short_name.toLowerCase().includes(collegeSearch.toLowerCase())
  ).slice(0, 5);

  const toggleInterest = (i: string) => {
    setInterests(interests.includes(i) ? interests.filter(x => x !== i) : [...interests, i]);
  };

  // Photos Actions
  const pickPhoto = async (index: number) => {
    const useDummy = () => {
      const dummy = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";
      const newPhotos = [...photos];
      newPhotos[index] = dummy;
      setPhotos(newPhotos.filter(Boolean));
    };

    Alert.alert(
      'Select Photo',
      'Choose an action or use a sample photo for testing:',
      [
        {
          text: 'Open Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Gallery storage permission is required to add photos.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Use Sample Photo', onPress: useDummy }
                ]);
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
              console.warn("Gallery picker error:", error);
              useDummy();
            }
          }
        },
        { text: 'Use Sample Photo', onPress: useDummy },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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

  const movePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= photos.length) return;
    const updatedPhotos = [...photos];
    const temp = updatedPhotos[fromIndex];
    updatedPhotos[fromIndex] = updatedPhotos[toIndex];
    updatedPhotos[toIndex] = temp;
    setPhotos(updatedPhotos);

    // Swap prompts
    const updatedPrompts = { ...photoPrompts };
    const tempPrompt = updatedPrompts[fromIndex];
    if (updatedPrompts[toIndex] !== undefined) {
      updatedPrompts[fromIndex] = updatedPrompts[toIndex];
    } else {
      delete updatedPrompts[fromIndex];
    }
    if (tempPrompt !== undefined) {
      updatedPrompts[toIndex] = tempPrompt;
    } else {
      delete updatedPrompts[toIndex];
    }
    setPhotoPrompts(updatedPrompts);
  };

  const save = async () => {
    if (photos.length === 0) {
      Alert.alert('Photo Required 📸', 'Please add at least 1 photo.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          name,
          age: parseInt(age),
          bio,
          course,
          year,
          gender_preference: genderPreference,
          interests,
          gender,
          height: Math.round((heightFeet * 12 + heightInches) * 2.54),
          religion,
          drink,
          smoke,
          weed,
          location: locationText,
          latitude,
          longitude,
          college_id: collegeId,
          photos,
          prompts: photoPrompts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update profile' }));
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      await refreshUser();
      Alert.alert('Saved! ✨', 'Your profile has been updated');
      router.back();
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.message || '';
      if (errorMsg.includes('Inappropriate content detected') || errorMsg.includes('content moderation')) {
        Alert.alert(
          'Inappropriate Content Detected',
          'Our AI content filter flagged your image as inappropriate. Please upload a safe photo.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMsg || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const getScrollableItems = () => {
    return [
      gender && { icon: 'person-outline', text: gender.toUpperCase() },
      religion && { icon: 'heart-outline', text: religion },
      drink && { icon: 'wine-outline', text: `Drinks: ${drink.toUpperCase()}` },
      smoke && { icon: 'logo-no-smoking', text: `Smokes: ${smoke.toUpperCase()}` },
      weed && { icon: 'leaf-outline', text: `Weed: ${weed.toUpperCase()}` },
    ].filter(Boolean);
  };

  const getCollegeName = () => {
    const selected = colleges.find(c => c.college_id === collegeId);
    return selected ? selected.name : 'College Student';
  };

  return (
    <SafeAreaView style={styles.c}>
      <LinearGradient colors={['#050005', '#160222']} style={styles.bg}>
        
        {/* Top Header */}
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headT}>Profile Center</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#C2FF3D" /> : <Text style={styles.save}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Tab Selection Navigation */}
        <View style={styles.tabsRow}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'edit' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('edit')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'edit' && styles.tabButtonTextActive]}>Edit Profile</Text>
            {activeTab === 'edit' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'view' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('view')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'view' && styles.tabButtonTextActive]}>View Profile</Text>
            {activeTab === 'view' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {activeTab === 'edit' ? (
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
              
              {/* SECTION 1: BASICS */}
              <Text style={styles.sectionHeader}>Basics</Text>

              <Text style={styles.lbl}>NAME</Text>
              <TextInput style={styles.inp} value={name} onChangeText={setName} placeholderTextColor="#6B5B7A" />
              
              <Text style={styles.lbl}>AGE</Text>
              <TextInput style={styles.inp} value={age} onChangeText={(val) => setAge(convertDevanagariToAscii(val))} keyboardType="number-pad" />

              <Text style={styles.lbl}>GENDER</Text>
              <View style={styles.opts}>
                {[{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }, { v: 'other', l: 'Other' }].map(g => (
                  <TouchableOpacity key={g.v} style={[styles.opt, gender === g.v && styles.optA]} onPress={() => setGender(g.v)}>
                    <Text style={[styles.optT, gender === g.v && styles.optTA]}>{g.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.lbl}>HEIGHT (FEET)</Text>
              <View style={styles.opts}>
                {[4, 5, 6, 7].map(f => (
                  <TouchableOpacity key={f} style={[styles.opt, heightFeet === f && styles.optA]} onPress={() => setHeightFeet(f)}>
                    <Text style={[styles.optT, heightFeet === f && styles.optTA]}>{f} ft</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.lbl}>HEIGHT (INCHES)</Text>
              <View style={styles.opts}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inc => (
                  <TouchableOpacity key={inc} style={[styles.opt, heightInches === inc && styles.optA]} onPress={() => setHeightInches(inc)}>
                    <Text style={[styles.optT, heightInches === inc && styles.optTA]}>{inc} in</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SECTION 2: BIO */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
                <Text style={styles.sectionHeader}>Bio (Optional)</Text>
                <Text style={[styles.cnt, { color: '#C2FF3D', marginTop: 0, fontWeight: '700' }]}>{bio.length}/150</Text>
              </View>
              <TextInput
                style={[styles.inp, { height: 100, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={150}
                placeholder="Tell your story..."
                placeholderTextColor="#6B5B7A"
                scrollEnabled={true}
              />

              {/* SECTION 3: LOCATION */}
              <Text style={styles.sectionHeader}>Location</Text>
              <View style={styles.locationWrapper}>
                <TextInput style={[styles.inp, { flex: 1 }]} value={locationText} onChangeText={setLocationText} placeholder="City, State" placeholderTextColor="#6B5B7A" />
                <TouchableOpacity style={styles.detectBtn} onPress={handleDetectLocation} disabled={detectingLocation}>
                  {detectingLocation ? <ActivityIndicator size="small" color="#C2FF3D" /> : <Ionicons name="location-outline" size={20} color="#C2FF3D" />}
                </TouchableOpacity>
              </View>

              {/* SECTION 4: ACADEMICS */}
              <Text style={styles.sectionHeader}>Academics</Text>

              <Text style={styles.lbl}>SELECT YOUR COLLEGE</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#A899B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search college..."
                  placeholderTextColor="#6B5B7A"
                  value={collegeSearch}
                  onChangeText={setCollegeSearch}
                />
              </View>

              <View style={styles.collegeList}>
                {filteredColleges.map((college) => {
                  const isActive = collegeId === college.college_id;
                  return (
                    <TouchableOpacity
                      key={college.college_id}
                      style={[styles.collegeItem, isActive && styles.collegeItemActive]}
                      onPress={() => setCollegeId(college.college_id)}
                    >
                      <Ionicons name="school-outline" size={18} color={isActive ? '#C2FF3D' : '#A899B8'} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.collegeName, isActive && styles.collegeNameActive]}>{college.name}</Text>
                        <Text style={styles.collegeLocation}>{college.location}</Text>
                      </View>
                      {isActive ? (
                        <Ionicons name="checkmark-circle" size={20} color="#C2FF3D" />
                      ) : (
                        <View style={styles.collegeUncheckCircle} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <Text style={styles.lbl}>COURSE</Text>
              <TextInput style={styles.inp} value={course} onChangeText={setCourse} placeholder="e.g. Computer Science" placeholderTextColor="#6B5B7A" />
              
              <Text style={styles.lbl}>YEAR</Text>
              <View style={styles.opts}>
                {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'].map(y => (
                  <TouchableOpacity key={y} style={[styles.opt, year === y && styles.optA]} onPress={() => setYear(y)}>
                    <Text style={[styles.optT, year === y && styles.optTA]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SECTION 5: HABITS */}
              <Text style={styles.sectionHeader}>Habits & Lifestyle</Text>

              <Text style={styles.lbl}>RELIGION (OPTIONAL)</Text>
              <TextInput style={styles.inp} value={religion} onChangeText={setReligion} placeholder="e.g. Hindu, Christian, None" placeholderTextColor="#6B5B7A" />

              <Text style={styles.lbl}>DRINK</Text>
              <View style={styles.opts}>
                {['yes', 'no'].map(val => (
                  <TouchableOpacity key={val} style={[styles.opt, drink === val && styles.optA]} onPress={() => setDrink(val)}>
                    <Text style={[styles.optT, drink === val && styles.optTA]}>{val.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.lbl}>SMOKE</Text>
              <View style={styles.opts}>
                {['yes', 'no'].map(val => (
                  <TouchableOpacity key={val} style={[styles.opt, smoke === val && styles.optA]} onPress={() => setSmoke(val)}>
                    <Text style={[styles.optT, smoke === val && styles.optTA]}>{val.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.lbl}>WEED</Text>
              <View style={styles.opts}>
                {['yes', 'no'].map(val => (
                  <TouchableOpacity key={val} style={[styles.opt, weed === val && styles.optA]} onPress={() => setWeed(val)}>
                    <Text style={[styles.optT, weed === val && styles.optTA]}>{val.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SECTION 6: VIBE MATCH */}
              <Text style={styles.sectionHeader}>Vibe Match</Text>
              
              <Text style={styles.lbl}>GENDER PREFERRED</Text>
              <View style={styles.opts}>
                {[{ v: 'male', l: 'Men' }, { v: 'female', l: 'Women' }, { v: 'both', l: 'Both' }].map(o => (
                  <TouchableOpacity key={o.v} style={[styles.opt, genderPreference === o.v && styles.optA]} onPress={() => setGenderPreference(o.v as any)}>
                    <Text style={[styles.optT, genderPreference === o.v && styles.optTA]}>{o.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>


              <Text style={styles.lbl}>INTERESTS</Text>
              <View style={styles.opts}>
                {INTERESTS.map(i => (
                  <TouchableOpacity key={i} style={[styles.opt, interests.includes(i) && styles.optA]} onPress={() => toggleInterest(i)}>
                    <Text style={[styles.optT, interests.includes(i) && styles.optTA]}>{i}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SECTION 7: PHOTOS & PROMPTS (Onboarding UI Style) */}
              <Text style={styles.sectionHeader}>Photos & Prompts</Text>
              <Text style={styles.photosHint}>Manage up to 6 photos. Swap ordering using arrow overlays.</Text>
              
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
                            setTempPrompt(PROMPTS[0]);
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
                            <Ionicons name="close" size={12} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      )}

                      {photoUri ? (
                        <View style={[styles.photoCard, { borderColor: '#C2FF3D', borderWidth: 2 }]}>
                          <Image source={{ uri: photoUri }} style={styles.photoImg} />
                          <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => removePhoto(index)}>
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                          
                          {/* Swap ordering buttons */}
                          <View style={styles.reorderControls}>
                            {index > 0 && (
                              <TouchableOpacity style={styles.reorderBtn} onPress={() => movePhoto(index, index - 1)}>
                                <Ionicons name="chevron-back" size={12} color="#000" />
                              </TouchableOpacity>
                            )}
                            {index < photos.length - 1 && (
                              <TouchableOpacity style={styles.reorderBtn} onPress={() => movePhoto(index, index + 1)}>
                                <Ionicons name="chevron-forward" size={12} color="#000" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.photoAddCard} onPress={() => pickPhoto(index)}>
                          <Ionicons name="add" size={28} color="#FFF" />
                        </TouchableOpacity>
                      )}
                      
                      {index === 0 ? (
                        <Text style={[styles.photoSlotLabel, { color: '#C2FF3D', fontWeight: '800' }]}>Main Photo</Text>
                      ) : (
                        <Text style={styles.photoSlotLabel}>Slot {index + 1}</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Big Green Save Button */}
              <TouchableOpacity 
                style={styles.bigSaveBtn} 
                onPress={save} 
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.bigSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 60 }} />
            </ScrollView>
          ) : (
            /* VIEW PROFILE TAB: Displaying profile card mockup dynamically */
            <ScrollView contentContainerStyle={styles.viewContainer} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.profileCard}>
                <View style={styles.mainPhotoCard}>
                  {photos[0] ? (
                    <Image
                      source={{ uri: photos[0] }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1A0F2A', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="image-outline" size={60} color="rgba(255,255,255,0.1)" />
                    </View>
                  )}

                  {/* Glass Details Card Overlay */}
                  <BlurView intensity={80} tint="dark" style={styles.glassDetailsCard}>
                    <View style={styles.profileDetails}>
                      {/* Name & Age */}
                      <View style={styles.cardNameRow}>
                        <Text style={styles.cardName}>{name}, {age || '20'}</Text>
                        {user?.verification_status === 'verified' && (
                          <Ionicons name="checkmark-circle" size={18} color="#C2FF3D" style={{ marginLeft: 6 }} />
                        )}
                        <View style={{ flex: 1 }} />
                        <View style={styles.innovativeVibeBadge}>
                          <Ionicons name="sparkles" size={13} color="#FFD700" />
                          <Text style={styles.innovativeVibeText}>{(user?.vibe_score || 8.5).toFixed(1)}</Text>
                        </View>
                      </View>

                      {/* College / Course / Year */}
                      <View style={styles.cardCollegeRow}>
                        <Ionicons name="school-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
                        <Text style={styles.cardCollegeText} numberOfLines={1}>
                          {[getCollegeName(), course, year].filter(Boolean).join(' • ')}
                        </Text>
                      </View>

                      {/* Bio */}
                      {bio ? <Text style={styles.cardBio}>{bio}</Text> : null}

                      {/* Characteristics Scrollable Row */}
                      <View style={styles.scrollWrapper}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.scrollContentContainer}
                        >
                          {getScrollableItems().map((item: any, idx: number) => (
                            <React.Fragment key={idx}>
                              <View style={styles.scrollItem}>
                                <Ionicons name={item.icon} size={13} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 4 }} />
                                <Text style={styles.scrollItemText}>{item.text}</Text>
                              </View>
                              {idx < getScrollableItems().length - 1 && (
                                <View style={styles.scrollSeparator} />
                              )}
                            </React.Fragment>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Interests / Tags */}
                      {interests.length > 0 && (
                        <View style={styles.cardTagsRow}>
                          {interests.map((i: string) => (
                            <View key={i} style={styles.cardTag}>
                              <Text style={styles.cardTagText}>{i}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </BlurView>
                </View>

                {/* Spotify Card */}
                <View style={styles.spotifyCard}>
                  <View style={styles.spotifyHeader}>
                    <MaterialCommunityIcons name="spotify" size={20} color="#1DB954" style={{ marginRight: 6 }} />
                    <Text style={styles.spotifyCardTitle}>TOP SPOTIFY TRACKS</Text>
                  </View>
                  {(user?.spotify_data?.top_tracks && user.spotify_data.top_tracks.length > 0) ? (
                    user.spotify_data.top_tracks.slice(0, 3).map((track: string, idx: number) => {
                      const parts = track.split(' - ');
                      return (
                        <View key={idx} style={styles.spotifyTrackRow}>
                          <Ionicons name="play" size={14} color="#C2FF3D" style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.spotifyTrackName}>{parts[0]}</Text>
                            <Text style={styles.spotifyArtistName}>{parts[1] || 'Spotify Connection'}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    ['Starboy - The Weeknd', 'Levitating - Dua Lipa', 'Peaches - Justin Bieber'].map((track, idx) => {
                      const parts = track.split(' - ');
                      return (
                        <View key={idx} style={styles.spotifyTrackRow}>
                          <Ionicons name="play" size={14} color="#C2FF3D" style={{ marginRight: 8 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.spotifyTrackName}>{parts[0]}</Text>
                            <Text style={styles.spotifyArtistName}>{parts[1]}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Secondary Photos & Prompts Section */}
                {photos.slice(1).map((photoUri, index) => {
                  const photoIndex = index + 1;
                  const promptText = photoPrompts[photoIndex];

                  return (
                    <BlurView intensity={35} tint="dark" key={photoIndex} style={styles.secondaryPhotoCard}>
                      {promptText && (
                        <View style={styles.promptHeader}>
                          <Text style={styles.promptQuestion}>MY PROMPT</Text>
                          <Text style={styles.promptTitle}>{promptText}</Text>
                        </View>
                      )}
                      <View style={styles.secondaryPhotoContainer}>
                        <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
                      </View>
                    </BlurView>
                  );
                })}
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* Prompt Selection Modal */}
        {showPromptModal && (
          <Modal transparent animationType="fade" visible={showPromptModal}>
            <View style={styles.promptModalContainer}>
              <BlurView intensity={80} tint="dark" style={styles.promptModalInner}>
                <Text style={styles.promptModalTitle}>Choose Prompt</Text>
                
                <ScrollView style={styles.promptModalScroll} showsVerticalScrollIndicator={false}>
                  {PROMPTS.map((p) => {
                    const isSel = tempPrompt === p;
                    return (
                      <TouchableOpacity 
                        key={p} 
                        style={[styles.promptModalItem, isSel && styles.promptModalItemSel]}
                        onPress={() => setTempPrompt(p)}
                      >
                        <Text style={[styles.promptModalItemText, isSel && styles.promptModalItemTextSel]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.lbl, { marginTop: 16 }]}>OR WRITE YOUR OWN PROMPT</Text>
                <TextInput
                  style={[styles.inp, { marginTop: 4, width: '100%' }]}
                  placeholder="Enter custom prompt..."
                  placeholderTextColor="#6B5B7A"
                  value={tempAnswer}
                  onChangeText={setTempAnswer}
                />

                <View style={styles.promptModalActions}>
                  <TouchableOpacity 
                    style={styles.promptModalCancel} 
                    onPress={() => setShowPromptModal(false)}
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
                      }
                    }}
                    disabled={!(tempAnswer.trim() || tempPrompt)}
                  >
                    <Text style={styles.promptModalAddText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </Modal>
        )}

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#050005' },
  bg: { flex: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A1B3D' },
  headT: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  save: { color: '#C2FF3D', fontWeight: '900', fontSize: 16 },
  lbl: { color: '#A899B8', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  inp: { backgroundColor: '#1A0F2A', color: '#FFF', padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#2A1B3D' },
  cnt: { color: '#6B5B7A', fontSize: 11, textAlign: 'right', marginTop: 4 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#1A0F2A', borderRadius: 16, borderWidth: 1, borderColor: '#2A1B3D' },
  optA: { backgroundColor: 'rgba(194, 255, 61, 0.12)', borderColor: '#C2FF3D' },
  optT: { color: '#A899B8', fontSize: 13, fontWeight: '600' },
  optTA: { color: '#FFF', fontWeight: '900' },
  
  // Tabs Navigation
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A1B3D',
    backgroundColor: '#050005',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabButtonActive: {},
  tabButtonText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#C2FF3D',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#C2FF3D',
    borderRadius: 1.5,
  },

  // Section Headers
  sectionHeader: {
    color: '#C2FF3D',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 28,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(194, 255, 61, 0.15)',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  
  // Location
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detectBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // College
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A0F2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1B3D',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  collegeList: { marginTop: 10, gap: 8 },
  collegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#2A1B3D',
  },
  collegeItemActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
  },
  collegeName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  collegeNameActive: { color: '#C2FF3D' },
  collegeLocation: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 11, marginTop: 2 },
  collegeUncheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Photos & Prompts (Edit Section)
  photosHint: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, marginBottom: 16 },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  photoSlotWrapper: {
    width: '48%',
    aspectRatio: 3/4,
    marginBottom: 16,
    position: 'relative',
  },
  photoCard: {
    width: '100%',
    height: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddCard: {
    width: '100%',
    height: '90%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  photoSlotLabel: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  choosePromptBtn: {
    position: 'absolute',
    bottom: '15%',
    left: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#C2FF3D',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  choosePromptText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  promptDisplayContainer: {
    position: 'absolute',
    bottom: '15%',
    left: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  promptDisplayQuestion: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  promptDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4D4D',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderControls: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reorderBtn: {
    backgroundColor: '#C2FF3D',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },

  // Save Buttons
  bigSaveBtn: {
    backgroundColor: '#C2FF3D',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  bigSaveBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },

  // VIEW PROFILE TAB MOCKUP STYLING (matching discover profileCard)
  viewContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#0F0817',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainPhotoCard: {
    width: '100%',
    height: 520,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  glassDetailsCard: {
    padding: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  profileDetails: {
    gap: 8,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  innovativeVibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 4,
  },
  innovativeVibeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  cardCollegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cardCollegeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  cardBio: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  scrollWrapper: {
    marginVertical: 6,
  },
  scrollContentContainer: {
    alignItems: 'center',
    gap: 8,
  },
  scrollItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scrollItemText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollSeparator: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  cardTag: {
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.2)',
  },
  cardTagText: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '700',
  },

  // Spotify View Card
  spotifyCard: {
    backgroundColor: '#000000',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#C2FF3D',
    borderRadius: 20,
    margin: 16,
  },
  spotifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  spotifyCardTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  spotifyTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  spotifyTrackName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  spotifyArtistName: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },

  // Secondary photos details
  secondaryPhotoCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptQuestion: {
    color: '#C2FF3D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  promptTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 22,
  },
  secondaryPhotoContainer: {
    width: '100%',
    aspectRatio: 3/4,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Prompt Modal (onboarding style)
  promptModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptModalInner: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.25)',
    padding: 24,
    overflow: 'hidden',
  },
  promptModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  promptModalScroll: {
    maxHeight: 220,
  },
  promptModalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  promptModalItemSel: {
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
  },
  promptModalItemText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  promptModalItemTextSel: {
    color: '#C2FF3D',
    fontWeight: '700',
  },
  promptModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  promptModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  promptModalCancelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  promptModalAdd: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
  },
  promptModalAddText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
});
