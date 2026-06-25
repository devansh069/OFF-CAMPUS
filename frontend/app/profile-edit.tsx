import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

  const toggle = (i: string) => {
    setInterests(interests.includes(i) ? interests.filter(x => x !== i) : [...interests, i]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({
          name, age: parseInt(age), bio, course, year, looking_for: lookingFor, interests,
        }),
      });
      await refreshUser();
      Alert.alert('Saved! ✨', 'Your profile has been updated');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.c}>
      <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.bg}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headT}>Edit Profile</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#FF1B6B" /> : <Text style={styles.save}>Save</Text>}
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.lbl}>NAME</Text>
            <TextInput style={styles.inp} value={name} onChangeText={setName} placeholderTextColor="#6B5B7A" />
            
            <Text style={styles.lbl}>AGE</Text>
            <TextInput style={styles.inp} value={age} onChangeText={setAge} keyboardType="number-pad" />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <Text style={[styles.lbl, { marginTop: 0, marginBottom: 0 }]}>BIO</Text>
              <Text style={[styles.cnt, { color: '#C2FF3D', marginTop: 0, fontWeight: '700' }]}>{bio.length}/150</Text>
            </View>
            <TextInput style={[styles.inp, { height: 100, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} multiline maxLength={150} placeholder="Tell your story..." placeholderTextColor="#6B5B7A" />

            
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
            <View style={{ height: 40 }} />
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
});
