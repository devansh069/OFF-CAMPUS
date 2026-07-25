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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Mock Dummy Student ID photo for seamless testing without taking physical pictures
const DUMMY_ID_CARD_PHOTO = 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop';

export default function Verification() {
  const { user, sessionToken, refreshUser, updateUser } = useAuth();
  const router = useRouter();

  // Box 1: Email Verification State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Box 2: Manual ID Card Verification State
  const [idImage, setIdImage] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState(false);

  // Send Email OTP via Nodemailer
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Required', 'Please enter a valid college email address.');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/verification/send-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        setEmailStep('otp');
        if (data.dev_otp) {
          Alert.alert(
            'Nodemailer Notice 📬',
            `Why didn't an email arrive? Because SMTP credentials (SMTP_USER & SMTP_PASS) are not yet set in backend/.env!\n\nFor testing right now without setting up email, your verification code is: ${data.dev_otp}\n\n(To receive live emails in your real inbox, add your Gmail App Password to .env as commented!)`
          );
        } else {
          Alert.alert(
            'Live Email Dispatched! 📧',
            `An official email with your 6-digit verification code has been sent via Nodemailer to ${email}. Please check your inbox!`
          );
        }
      } else {
        Alert.alert('Error', data.detail || 'Failed to send OTP to email.');
      }
    } catch (error) {
      console.error('Send Email OTP error:', error);
      Alert.alert('Network Error', 'Could not reach the server. Please check your connection.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Required', 'Please enter the OTP sent to your email.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/verification/verify-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ otp: otp.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        if (updateUser) {
          updateUser({ verification_status: 'verified', email: email.trim() });
        }
        try { await refreshUser(); } catch (e) {}
        
        Alert.alert(
          'Verified! 🎉',
          'Your college email has been verified. You have instantly earned your Blue Tick!',
          [{
            text: 'Awesome!',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/profile');
              }
            }
          }]
        );
      } else {
        Alert.alert('Verification Failed', data.detail || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Verify Email OTP error:', error);
      Alert.alert('Network Error', 'Could not reach the server.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Open Camera for ID card photo (with automatic simulator fallback to dummy photo)
  const handleOpenCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission / Simulator Notice',
          'Camera access is unavailable. Would you like to use a dummy photo to test the Admin verification flow?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use Dummy Photo', onPress: () => setIdImage(DUMMY_ID_CARD_PHOTO) }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIdImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.warn('Camera error (likely running on Simulator):', error);
      Alert.alert(
        'Simulator Mode Detected 🧪',
        'Physical camera cannot be opened on an iOS/Android Simulator.\n\nWould you like to load a Dummy Student ID card photo now to test the submission and Admin approval flow?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Load Dummy Photo', 
            style: 'default', 
            onPress: () => {
              setIdImage(DUMMY_ID_CARD_PHOTO);
            }
          }
        ]
      );
    }
  };

  // Submit Manual ID Verification
  const handleSubmitManualVerification = async () => {
    if (!idImage) {
      Alert.alert('Photo Required', 'Please snap a photo or use the dummy photo option to submit your ID card.');
      return;
    }

    setSubmittingId(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/verification/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          college_id: user?.college_id || 'iit_delhi',
          id_card_image: idImage,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (updateUser) {
          updateUser({ verification_status: 'pending' });
        }
        try { await refreshUser(); } catch (e) {}

        Alert.alert(
          'Submitted Successfully! 📋',
          'Your ID verification request has been received. Manual review takes up to 12 hours.',
          [{ text: 'Okay', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to submit verification.');
      }
    } catch (error) {
      console.error('Submit manual verification error:', error);
      Alert.alert('Network Error', 'Could not connect to the backend server.');
    } finally {
      setSubmittingId(false);
    }
  };

  const currentStatus = user?.verification_status || 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>VERIFY IDENTITY</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Real Status Banner */}
          {currentStatus === 'verified' ? (
            <View style={styles.verifiedBanner}>
              <Ionicons name="checkmark-circle" size={28} color="#ee4d4d" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.bannerTitle}>OFFICIALLY VERIFIED</Text>
                <Text style={styles.bannerSub}>You have earned your verified badge! Your profile is trusted.</Text>
              </View>
            </View>
          ) : currentStatus === 'pending' ? (
            <View style={styles.pendingBanner}>
              <Ionicons name="time" size={28} color="#ee4d4d" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.bannerTitle}>VERIFICATION PENDING</Text>
                <Text style={styles.bannerSub}>Your ID photo is currently being reviewed in the Admin Portal.</Text>
              </View>
            </View>
          ) : null}

          {/* Intro Section */}
          <View style={styles.introSection}>
            <Text style={styles.mainTitle}>Get Your Verified Badge</Text>
            <Text style={styles.mainSub}>
              Choose from two simple ways to verify your student status.
            </Text>
          </View>

          {/* BOX 1: INSTANT COLLEGE EMAIL VERIFICATION */}
          <View style={styles.box}>
            <View style={styles.boxHeader}>
              <Ionicons name="mail" size={24} color="#ee4d4d" />
              <Text style={styles.boxTitle}>Instant Email Verification</Text>
            </View>

            <Text style={styles.boxDesc}>
              Enter your official college email address. We'll send a live OTP to your inbox.
            </Text>

            {emailStep === 'input' ? (
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. krish@iitd.ac.in"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.actionBtn, sendingOtp && { opacity: 0.7 }]}
                  onPress={handleSendEmailOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.actionBtnText}>Send Live OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.textInput, { letterSpacing: 6, fontSize: 20, textAlign: 'center' }]}
                  placeholder="------"
                  placeholderTextColor="#64748B"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1 }, verifyingOtp && { opacity: 0.7 }]}
                    onPress={handleVerifyEmailOtp}
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionBtnText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={() => setEmailStep('input')}
                  >
                    <Text style={styles.resendText}>Change Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* BOX 2: MANUAL ID CARD VERIFICATION */}
          <View style={styles.box}>
            <View style={styles.boxHeader}>
              <Ionicons name="id-card" size={24} color="#ee4d4d" />
              <Text style={styles.boxTitle}>Manual ID Verification</Text>
            </View>

            <Text style={styles.boxDesc}>
              Upload a clear photo of yourself holding your college ID card. Both your face and ID details must be visible.
            </Text>

            {/* Photo Preview or Upload Actions */}
            {idImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: idImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setIdImage(null)}>
                  <View style={styles.removeIconCircle}>
                    <Ionicons name="close" size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadContainer}>
                <TouchableOpacity
                  style={styles.dummyBtn}
                  onPress={() => {
                    setIdImage(DUMMY_ID_CARD_PHOTO);
                    Alert.alert('Testing Mode 🧪', 'Loaded dummy student ID card photo! Click submit below.');
                  }}
                >
                  <Ionicons name="flask" size={20} color="#ee4d4d" />
                  <Text style={styles.dummyTitleText}>Use Dummy Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cameraBtn} onPress={handleOpenCamera}>
                  <Ionicons name="camera" size={28} color="#ee4d4d" />
                  <Text style={styles.uploadBtnTitle}>Open Camera</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, (!idImage || submittingId) && { opacity: 0.5 }]}
              onPress={handleSubmitManualVerification}
              disabled={!idImage || submittingId}
            >
              {submittingId ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionBtnText}>Submit for Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238, 77, 77, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(238, 77, 77, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  mainSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  box: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    marginBottom: 20,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  boxTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  boxDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 12,
  },
  textInput: {
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 15,
  },
  actionBtn: {
    backgroundColor: '#ee4d4d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resendBtn: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resendText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadContainer: {
    gap: 12,
    marginBottom: 16,
  },
  dummyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(238, 77, 77, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(238, 77, 77, 0.3)',
    gap: 8,
  },
  dummyTitleText: {
    color: '#ee4d4d',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraBtn: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  removeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
