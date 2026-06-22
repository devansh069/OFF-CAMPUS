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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Verification() {
  const { user, sessionToken, refreshUser, updateUser } = useAuth();
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
      let isSuccess = false;
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
          isSuccess = true;
          await refreshUser();
        }
      } catch (fetchError) {
        console.warn('Backend verification failed, falling back to local mock:', fetchError);
        if (sessionToken === 'dummy_token' || !EXPO_PUBLIC_BACKEND_URL) {
          isSuccess = true;
        }
      }

      if (isSuccess) {
        if (updateUser) {
          updateUser({
            verification_status: 'pending'
          });
        }
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
      <View style={styles.blackBackground}>
        {/* Simple Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VERIFICATION</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Glowing Badge */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#8B5CF6', '#F43F5E']}
              style={styles.iconCircle}
            >
              <Ionicons name="shield-checkmark" size={44} color="#FFF" />
            </LinearGradient>
            <View style={styles.glowOverlay} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Upload your college ID card to confirm your student status. We manually review all accounts to keep the community safe.
          </Text>

          {/* Frosted Info Box */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#C2FF3D" />
              <Text style={styles.infoText}>Make sure your full name is clear</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#C2FF3D" />
              <Text style={styles.infoText}>College name should be readable</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#C2FF3D" />
              <Text style={styles.infoText}>Upload a clear, well-lit photo</Text>
            </View>
          </View>

          {/* Photo upload widgets */}
          {idImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: idImage }} style={styles.preview} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setIdImage(null)}>
                <LinearGradient 
                  colors={['#F43F5E', '#8B5CF6']} 
                  style={styles.removeBtnGrad}
                >
                  <Ionicons name="close" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadOptions}>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                <View style={styles.uploadIconBox}>
                  <Ionicons name="camera-outline" size={28} color="#C2FF3D" />
                </View>
                <Text style={styles.uploadBtnTitle}>Take Photo</Text>
                <Text style={styles.uploadBtnSub}>Use your camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <View style={styles.uploadIconBox}>
                  <Ionicons name="image-outline" size={28} color="#C2FF3D" />
                </View>
                <Text style={styles.uploadBtnTitle}>Gallery</Text>
                <Text style={styles.uploadBtnSub}>Choose from phone</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={[styles.submitBtn, (!idImage || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!idImage || submitting}
          >
            <LinearGradient
              colors={['#8B5CF6', '#F43F5E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGrad}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFF" />
                  <Text style={styles.submitText}>SUBMIT FOR VERIFICATION</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(tabs)/discover')}>
            <Text style={styles.skipText}>Skip for now (limited access)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  blackBackground: { flex: 1, backgroundColor: '#000000' },
  
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

  // Main scroll content
  content: { 
    paddingHorizontal: 24, 
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center', 
    gap: 20 
  },
  
  // Glowing Icon
  iconContainer: { 
    position: 'relative',
    marginTop: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  glowOverlay: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    opacity: 0.3,
    filter: Platform.OS === 'ios' ? 'blur(15px)' : undefined,
    zIndex: 1,
  },

  title: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#FFF', 
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  // Frosted Guidelines Card
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    borderRadius: 22,
    gap: 12,
    width: '100%',
    marginVertical: 8,
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  infoText: { 
    color: '#E4E4E7', 
    fontSize: 14, 
    fontWeight: '600',
    flex: 1 
  },

  // Image Upload Boxes
  uploadOptions: { 
    flexDirection: 'row', 
    gap: 14, 
    width: '100%',
    marginVertical: 8,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.35)',
    borderStyle: 'dashed',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    gap: 8,
  },
  uploadIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadBtnTitle: { 
    color: '#FFF', 
    fontSize: 15, 
    fontWeight: '800' 
  },
  uploadBtnSub: {
    color: '#A899B8',
    fontSize: 11,
    fontWeight: '600',
  },

  // ID Card Preview
  previewContainer: { 
    width: '100%', 
    position: 'relative',
    marginVertical: 8,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#C2FF3D',
    backgroundColor: '#1E1E1E',
  },
  removeBtn: { 
    position: 'absolute', 
    top: 10, 
    right: 10,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  removeBtnGrad: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Submit Button
  submitBtn: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 16,
  },
  submitBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitBtnDisabled: { 
    opacity: 0.6 
  },
  submitText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  skipText: { 
    color: '#71717A', 
    fontSize: 14, 
    fontWeight: '700', 
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
