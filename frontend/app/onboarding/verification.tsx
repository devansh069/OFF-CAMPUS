import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Verification() {
  const { user, sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [idImage, setIdImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to upload your ID');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setIdImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setIdImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!idImage) {
      Alert.alert('Required', 'Please upload your college ID');
      return;
    }
    if (!user?.college_id) {
      Alert.alert('Error', 'College not selected');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/verification/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          college_id: user.college_id,
          id_card_image: idImage,
        }),
      });

      if (response.ok) {
        await refreshUser();
        Alert.alert(
          'Submitted! 🎉',
          'Your ID is being reviewed. You\'ll get full access once approved by our team (usually within 24 hours).',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/discover') }]
        );
      } else {
        Alert.alert('Error', 'Failed to submit verification');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0A0A0A', '#1A1A1A']} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FF3366', '#FF6B35']}
              style={styles.iconCircle}
            >
              <Ionicons name="shield-checkmark" size={48} color="#FFF" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Upload your college ID card to verify you're a student. We manually review all submissions to keep Off Campus safe.
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
              <Text style={styles.infoText}>Make sure your name is visible</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
              <Text style={styles.infoText}>College name should be readable</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4FC3F7" />
              <Text style={styles.infoText}>Photo should be clear & well-lit</Text>
            </View>
          </View>

          {idImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: idImage }} style={styles.preview} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setIdImage(null)}>
                <Ionicons name="close-circle" size={32} color="#FF3366" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={32} color="#FF3366" />
                <Text style={styles.uploadText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Ionicons name="image" size={32} color="#FF3366" />
                <Text style={styles.uploadText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (!idImage || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!idImage || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>Submit for Verification</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(tabs)/discover')}>
            <Text style={styles.skipText}>Skip for now (limited access)</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: { padding: 24, alignItems: 'center', gap: 16 },
  iconContainer: { marginTop: 20 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    width: '100%',
    marginVertical: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { color: '#DDD', fontSize: 14, flex: 1 },
  uploadOptions: { flexDirection: 'row', gap: 12, width: '100%' },
  uploadBtn: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#FF3366',
    borderStyle: 'dashed',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  uploadText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  previewContainer: { width: '100%', position: 'relative' },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
  },
  removeBtn: { position: 'absolute', top: 8, right: 8 },
  submitBtn: {
    backgroundColor: '#FF3366',
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  skipText: { color: '#999', fontSize: 14, marginTop: 12 },
});
