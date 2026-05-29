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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const INTERESTS = [
  'Music', 'Sports', 'Gaming', 'Art', 'Photography', 'Travel',
  'Reading', 'Coding', 'Fitness', 'Dance', 'Movies', 'Anime',
  'Fashion', 'Cooking', 'Writing', 'Yoga'
];

export default function ProfileSetup() {
  const { sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [year, setYear] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/list`);
      const data = await response.json();
      setColleges(data.colleges || []);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!age || !gender || !lookingFor) {
        Alert.alert('Required', 'Please fill all required fields');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!collegeId) {
        Alert.alert('Required', 'Please select your college');
        return;
      }
      setStep(3);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          age: parseInt(age),
          gender,
          college_id: collegeId,
          year,
          course,
          bio,
          interests,
          looking_for: lookingFor,
        }),
      });

      if (response.ok) {
        await refreshUser();
        router.replace('/(tabs)/discover');
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
      <LinearGradient colors={['#0A0A0A', '#1A1A1A']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : null}>
            <Ionicons name="arrow-back" size={28} color={step > 1 ? '#FFF' : '#333'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Step {step}/3</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${(step / 3) * 100}%` }]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Basic Info</Text>
                <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Age *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your age"
                    placeholderTextColor="#888"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    testID="age-input"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Gender *</Text>
                  <View style={styles.optionsRow}>
                    {['male', 'female', 'other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.optionButton, gender === g && styles.optionButtonActive]}
                        onPress={() => setGender(g)}
                        testID={`gender-${g}`}
                      >
                        <Text style={[styles.optionText, gender === g && styles.optionTextActive]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Looking For *</Text>
                  <View style={styles.optionsRow}>
                    {[
                      { value: 'dating', label: 'Dating' },
                      { value: 'friends', label: 'Friends' },
                      { value: 'networking', label: 'Network' },
                      { value: 'all', label: 'All' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.optionButton, lookingFor === option.value && styles.optionButtonActive]}
                        onPress={() => setLookingFor(option.value)}
                        testID={`looking-for-${option.value}`}
                      >
                        <Text style={[styles.optionText, lookingFor === option.value && styles.optionTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Your College</Text>
                <Text style={styles.stepSubtitle}>Select your campus</Text>

                <View style={styles.collegeList}>
                  {colleges.map((college) => (
                    <TouchableOpacity
                      key={college.college_id}
                      style={[
                        styles.collegeItem,
                        collegeId === college.college_id && styles.collegeItemActive
                      ]}
                      onPress={() => setCollegeId(college.college_id)}
                      testID={`college-${college.short_name}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.collegeName,
                          collegeId === college.college_id && styles.collegeNameActive
                        ]}>
                          {college.name}
                        </Text>
                        <Text style={styles.collegeLocation}>{college.location}</Text>
                      </View>
                      {collegeId === college.college_id && (
                        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Year</Text>
                  <View style={styles.optionsRow}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'].map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.optionButton, year === y && styles.optionButtonActive]}
                        onPress={() => setYear(y)}
                      >
                        <Text style={[styles.optionText, year === y && styles.optionTextActive]}>
                          {y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Course</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Computer Science"
                    placeholderTextColor="#888"
                    value={course}
                    onChangeText={setCourse}
                  />
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>Make it pop ✨</Text>
                <Text style={styles.stepSubtitle}>Show your vibe</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Write a catchy bio..."
                    placeholderTextColor="#888"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    maxLength={150}
                  />
                  <Text style={styles.charCount}>{bio.length}/150</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Interests (pick a few)</Text>
                  <View style={styles.interestsGrid}>
                    {INTERESTS.map((interest) => (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.interestChip,
                          interests.includes(interest) && styles.interestChipActive
                        ]}
                        onPress={() => toggleInterest(interest)}
                      >
                        <Text style={[
                          styles.interestText,
                          interests.includes(interest) && styles.interestTextActive
                        ]}>
                          {interest}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, loading && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={loading}
              testID="next-button"
            >
              <Text style={styles.nextButtonText}>
                {loading ? 'Saving...' : (step === 3 ? 'Complete Setup' : 'Next')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#FF3366',
  },
  scrollView: { flex: 1, padding: 20 },
  stepContainer: { gap: 20 },
  stepTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  inputGroup: { gap: 8 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
  },
  optionButtonActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  optionText: {
    fontSize: 14,
    color: '#FFF',
  },
  optionTextActive: { fontWeight: '600' },
  collegeList: {
    gap: 8,
    marginBottom: 16,
  },
  collegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  collegeItemActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  collegeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  collegeNameActive: { color: '#FFF' },
  collegeLocation: {
    fontSize: 12,
    color: '#AAA',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
  },
  interestChipActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  interestText: {
    fontSize: 14,
    color: '#FFF',
  },
  interestTextActive: { fontWeight: '600' },
  footer: { padding: 20 },
  nextButton: {
    backgroundColor: '#FF3366',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
});
