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
          'Submitted For Admin Review! 📋',
          'Your ID verification request has been sent to the Admin Portal. Manual review takes up to 12 hours.',
          [{ text: 'Go To Admin Portal', onPress: () => router.back() }]
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
    <View style={styles.container}>
      {/* Colorful Theme Background matching likes and profile pages */}
      <LinearGradient
        colors={['#050005', '#FF6CD2', '#5641FF', '#ACD0FF', '#050005']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} />

      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }}>
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
                  <Image source={require('../../assets/images/blue-tick.webp')} style={styles.bannerTick} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>OFFICIALLY VERIFIED</Text>
                    <Text style={styles.bannerSub}>You have earned your verified blue tick! Your profile is trusted and boosted.</Text>
                  </View>
                </View>
              ) : currentStatus === 'pending' ? (
                <View style={styles.pendingBanner}>
                  <Ionicons name="time" size={26} color="#FACC15" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bannerTitle, { color: '#FACC15' }]}>VERIFICATION PENDING</Text>
                    <Text style={styles.bannerSub}>Your ID photo is currently being reviewed in the Admin Portal (takes up to 12 hrs).</Text>
                  </View>
                </View>
              ) : null}

              {/* Intro Section */}
              <View style={styles.introSection}>
                <Text style={styles.mainTitle}>Get Your Verified Badge</Text>
                <Text style={styles.mainSub}>
                  Choose from two instant or manual ways to verify your student status and unlock your campus vibe!
                </Text>
              </View>

              {/* ============================================================
                  BOX 1 (MOST PRIORITY): INSTANT COLLEGE EMAIL VERIFICATION
              ============================================================ */}
              <View style={styles.priorityBox}>
                <View style={styles.boxHeader}>
                  <Image source={require('../../assets/images/blue-tick.webp')} style={styles.realBlueTick} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.priorityTag}>
                      <Text style={styles.priorityTagText}>MOST PRIORITY</Text>
                    </View>
                    <Text style={styles.boxTitle}>Instant College Email ID</Text>
                  </View>
                </View>

                <Text style={styles.boxDesc}>
                  Enter your official college email address. We'll send a live OTP to your inbox via Nodemailer. Verify that OTP and earn your blue tick instantly!
                </Text>

                {emailStep === 'input' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>COLLEGE EMAIL ADDRESS</Text>
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
                      style={[styles.actionBtnGreen, sendingOtp && { opacity: 0.7 }]}
                      onPress={handleSendEmailOtp}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? (
                        <ActivityIndicator color="#000" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={18} color="#000" />
                          <Text style={styles.actionBtnTextGreen}>SEND LIVE OTP</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ENTER 6-DIGIT OTP</Text>
                    <TextInput
                      style={[styles.textInput, { letterSpacing: 6, fontSize: 20, textAlign: 'center', borderColor: '#C2FF3D' }]}
                      placeholder="------"
                      placeholderTextColor="#64748B"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[styles.actionBtnGreen, { flex: 1 }, verifyingOtp && { opacity: 0.7 }]}
                        onPress={handleVerifyEmailOtp}
                        disabled={verifyingOtp}
                      >
                        {verifyingOtp ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#000" />
                            <Text style={styles.actionBtnTextGreen}>VERIFY & CLAIM TICK</Text>
                          </>
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


              {/* ============================================================
                  BOX 2: MANUAL ID CARD VERIFICATION (NO OFFICIAL EMAIL)
              ============================================================ */}
              <View style={styles.secondaryBox}>
                {/* Box Header with Red Tick */}
                <View style={styles.boxHeader}>
                  <Ionicons name="checkmark-circle" size={32} color="#EF4444" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.boxTitle, { color: '#F87171' }]}>Don't have a college official ID?</Text>
                    <Text style={styles.boxSubtitleText}>We still think for you!</Text>
                  </View>
                </View>

                <Text style={styles.boxDesc}>
                  If you don't have an official college email, upload a clear photo of yourself holding your college ID card.
                </Text>

                <View style={styles.guidelinesBox}>
                  <View style={styles.guideRow}>
                    <Ionicons name="eye" size={18} color="#F87171" />
                    <Text style={styles.guideText}>Note: Both your face and ID card details should be visible properly.</Text>
                  </View>
                </View>

                {/* CAUTION SIGN IN YELLOW */}
                <View style={styles.cautionBox}>
                  <Ionicons name="warning" size={24} color="#FACC15" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cautionTitle}>IMPORTANT NOTICE</Text>
                    <Text style={styles.cautionDesc}>
                      This verification is manual and may take up to 12 hours to review. Once submitted, your approval request is sent directly to the Admin Portal!
                    </Text>
                  </View>
                </View>

                {/* Photo Preview or Upload Actions */}
                {idImage ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: idImage }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setIdImage(null)}>
                      <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.removeGrad}>
                        <Ionicons name="close" size={20} color="#FFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadContainer}>
                    {/* Prominent Dummy Photo Option at the Top for Instant Testing */}
                    <TouchableOpacity
                      style={styles.dummyBtnProminent}
                      onPress={() => {
                        setIdImage(DUMMY_ID_CARD_PHOTO);
                        Alert.alert('Testing Mode 🧪', 'Loaded dummy student ID card photo! Click "SUBMIT FOR 12-HR ADMIN REVIEW" below to test Admin approval.');
                      }}
                    >
                      <View style={styles.dummyIconCircle}>
                        <Ionicons name="flask" size={24} color="#000" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dummyTitleText}>CLICK HERE: Use Dummy ID Photo</Text>
                        <Text style={styles.dummySubText}>Instant testing without physical camera</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={26} color="#C2FF3D" />
                    </TouchableOpacity>

                    {/* Camera Only Option (No Gallery) */}
                    <TouchableOpacity style={styles.cameraBtn} onPress={handleOpenCamera}>
                      <View style={styles.cameraIconCircle}>
                        <Ionicons name="camera" size={32} color="#EF4444" />
                      </View>
                      <Text style={styles.uploadBtnTitle}>Open Physical Camera</Text>
                      <Text style={styles.uploadBtnSub}>Take a live photo holding your ID card</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Submit Button with Green Effect Theme */}
                <TouchableOpacity
                  style={[styles.actionBtnGreen, (!idImage || submittingId) && { opacity: 0.5 }]}
                  onPress={handleSubmitManualVerification}
                  disabled={!idImage || submittingId}
                >
                  {submittingId ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={20} color="#000" />
                      <Text style={styles.actionBtnTextGreen}>SUBMIT FOR 12-HR ADMIN REVIEW</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050005' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
    gap: 24,
  },

  // Banners
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    borderWidth: 1.5,
    borderColor: '#C2FF3D',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  bannerTick: {
    width: 36,
    height: 36,
  },
  bannerTitle: {
    color: '#C2FF3D',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSub: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 18,
  },

  // Intro
  introSection: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  mainSub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  // Box 1: Priority
  priorityBox: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    padding: 20,
    backgroundColor: 'rgba(10, 15, 30, 0.75)',
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  realBlueTick: {
    width: 38,
    height: 38,
    marginRight: 12,
  },
  priorityTag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  priorityTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  boxTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  boxSubtitleText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  boxDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  textInput: {
    height: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C2FF3D',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  actionBtnTextGreen: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resendBtn: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  resendText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },

  // Box 2: Secondary
  secondaryBox: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    padding: 20,
    backgroundColor: 'rgba(20, 10, 15, 0.75)',
  },
  guidelinesBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  cautionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(250, 204, 21, 0.12)',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  cautionTitle: {
    color: '#FACC15',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cautionDesc: {
    color: '#FEF08A',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    fontWeight: '500',
  },
  uploadContainer: {
    gap: 12,
    marginBottom: 16,
  },
  cameraBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  cameraIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadBtnTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  uploadBtnSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  dummyBtnProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(194, 255, 61, 0.15)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#C2FF3D',
    gap: 12,
  },
  dummyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dummyTitleText: {
    color: '#C2FF3D',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  dummySubText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  previewContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  removeGrad: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
