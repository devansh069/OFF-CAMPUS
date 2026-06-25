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
  ActivityIndicator
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const INTERESTS = ['Music', 'Sports', 'Gaming', 'Art', 'Photography', 'Travel', 'Reading', 'Coding', 'Fitness', 'Dance', 'Movies', 'Anime', 'Fashion', 'Cooking', 'Writing', 'Yoga'];

export default function ProfileEdit() {
  const { user, sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [course, setCourse] = useState(user?.course || '');
  const [year, setYear] = useState(user?.year || '');
  const [lookingFor, setLookingFor] = useState(user?.looking_for || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);

  // Additional fields from onboarding
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

  const toggle = (i: string) => {
    setInterests(interests.includes(i) ? interests.filter(x => x !== i) : [...interests, i]);
  };

  const save = async () => {
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
          looking_for: lookingFor,
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await refreshUser();
      Alert.alert('Saved! ✨', 'Your profile has been updated');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.c}>
      <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.bg}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headT}>Edit Profile</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#FF1B6B" /> : <Text style={styles.save}>Save</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            
            {/* SECTION 1: BASICS */}
            <Text style={styles.sectionHeader}>Basics</Text>

            <Text style={styles.lbl}>NAME</Text>
            <TextInput style={styles.inp} value={name} onChangeText={setName} placeholderTextColor="#6B5B7A" />
            
            <Text style={styles.lbl}>AGE</Text>
            <TextInput style={styles.inp} value={age} onChangeText={setAge} keyboardType="number-pad" />

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
              <Text style={styles.sectionHeader}>Bio</Text>
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

            <Text style={styles.lbl}>RELIGION</Text>
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
            
            <Text style={styles.lbl}>LOOKING FOR</Text>
            <View style={styles.opts}>
              {[{ v: 'dating', l: '💕 Dating' }, { v: 'friends', l: '🤝 Friends' }, { v: 'networking', l: '💼 Network' }, { v: 'all', l: '✨ All' }].map(o => (
                <TouchableOpacity key={o.v} style={[styles.opt, lookingFor === o.v && styles.optA]} onPress={() => setLookingFor(o.v)}>
                  <Text style={[styles.optT, lookingFor === o.v && styles.optTA]}>{o.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.lbl}>INTERESTS</Text>
            <View style={styles.opts}>
              {INTERESTS.map(i => (
                <TouchableOpacity key={i} style={[styles.opt, interests.includes(i) && styles.optA]} onPress={() => toggle(i)}>
                  <Text style={[styles.optT, interests.includes(i) && styles.optTA]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0F0817' },
  bg: { flex: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A1B3D' },
  headT: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  save: { color: '#FF1B6B', fontWeight: '900', fontSize: 16 },
  lbl: { color: '#A899B8', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  inp: { backgroundColor: '#1A0F2A', color: '#FFF', padding: 14, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#2A1B3D' },
  cnt: { color: '#6B5B7A', fontSize: 11, textAlign: 'right', marginTop: 4 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#1A0F2A', borderRadius: 16, borderWidth: 1, borderColor: '#2A1B3D' },
  optA: { backgroundColor: 'rgba(194, 255, 61, 0.12)', borderColor: '#C2FF3D' },
  optT: { color: '#A899B8', fontSize: 13, fontWeight: '600' },
  optTA: { color: '#FFF', fontWeight: '900' },
  
  // Section Titles
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
  
  // Location detection styles
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
  
  // College search / list styles
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
  },
  collegeList: {
    marginTop: 10,
    gap: 8,
  },
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
  collegeName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  collegeNameActive: {
    color: '#C2FF3D',
  },
  collegeLocation: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 2,
  },
  collegeUncheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
