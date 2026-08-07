import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Image, 
  ScrollView, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';

let firebaseAuth: any = null;
let GoogleSignin: any = null;
try {
  // IMPORTANT: Do NOT change this back to .default only!
  // On iOS, the module has no .default export — using .default alone makes firebaseAuth = undefined on iOS.
  // The fallback pattern (authMod.default || authMod) works on BOTH Android AND iOS.
  const authMod = require('@react-native-firebase/auth');
  firebaseAuth = authMod.default || authMod;
} catch {
  // Safe fallback if native module is not linked (Expo Go)
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {
  // Safe fallback if native module is not linked (Expo Go)
}

const isNativeFirebaseAvailable = () => {
  if (Platform.OS === 'web') return false;
  try {
    const available = !!firebaseAuth && !!firebaseAuth();
    return available;
  } catch (e) {
    console.warn('isNativeFirebaseAvailable check failed:', e);
    return false;
  }
};

const isGoogleSigninAvailable = () => {
  return !!GoogleSignin && isNativeFirebaseAvailable();
};

const devanagariMap: { [key: string]: string } = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

const convertDevanagariToAscii = (text: string): string => {
  return text.replace(/[०-९]/g, (char) => devanagariMap[char] || char);
};

export default function Welcome() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Navigation steps: 'choice' | 'login_choice' | 'phone' | 'otp'
  const [step, setStep] = useState<'choice' | 'login_choice' | 'phone' | 'otp'>('choice');
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (params?.flow === 'signup') {
      setIsSignUp(true);
      setStep('phone');
    } else if (params?.flow === 'login') {
      setIsSignUp(false);
      setStep('login_choice');
    }
  }, [params?.flow]);
  
  // OTP States
  const [otpCode, setOtpCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [timer, setTimer] = useState(30);
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const otpInputRef = useRef<TextInput>(null);

  // Initialize Google Sign-In SDK conditionally
  useEffect(() => {
    if (isGoogleSigninAvailable()) {
     GoogleSignin.configure({
  webClientId:
    '1010337349558-lj094cssa5g89pue59dlr9a13k99ae77.apps.googleusercontent.com',
  offlineAccess: true,
});
    }
  }, []);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      if (!user.college_id || !user.age) {
        router.replace('/onboarding/profile-setup');
      } else {
        router.replace('/(tabs)/discover');
      }
    }
  }, [user, router]);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOTP = async () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    
    const fullNumber = `+91${cleaned}`;
    
    if (isNativeFirebaseAvailable()) {
      try {
        const confirmation = await firebaseAuth().signInWithPhoneNumber(fullNumber);
        setConfirmResult(confirmation);
        setStep('otp');
        setTimer(30);
      } catch (error: any) {
        console.error('Firebase SMS trigger failed:', error);
        Alert.alert('SMS Failed', error.message || 'Failed to send OTP verification code.');
      }
    } else {
      Alert.alert('SMS Unavailable', 'SMS Phone Authentication requires a native build or device with Google Play Services.');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length < 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmResult) {
      Alert.alert('Error', 'No active verification session. Please resend the code.');
      return;
    }

    try {
      // Verify code
      await confirmResult.confirm(otpCode);
      
      // Get verified ID Token from Firebase
      const idToken = await firebaseAuth().currentUser?.getIdToken();
      if (idToken) {
        await login(idToken, true, referralCode.trim(), isSignUp ? 'signup' : 'login');
      } else {
        throw new Error('Failed to retrieve Firebase ID Token.');
      }
    } catch (error: any) {
      console.error('Firebase OTP verification failed:', error);
      Alert.alert('Verification Failed', error.message || 'The code you entered is invalid. Please try again.');
    }
  };

  const handleResend = async () => {
    if (timer === 0) {
      const cleaned = phoneNumber.replace(/\D/g, '');
      const fullNumber = `+91${cleaned}`;
      
      if (isNativeFirebaseAvailable()) {
        try {
          const confirmation = await firebaseAuth().signInWithPhoneNumber(fullNumber);
          setConfirmResult(confirmation);
          setTimer(30);
          Alert.alert('Code Resent', 'A new verification code has been sent to your device.');
        } catch (error: any) {
          Alert.alert('SMS Failed', error.message || 'Failed to resend OTP.');
        }
      } else {
        Alert.alert('SMS Unavailable', 'SMS Phone Authentication requires a native build.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleSigninAvailable()) {
      try {
        setGoogleLoading(true);
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        const idToken = response.data?.idToken;
        if (!idToken) throw new Error('Failed to retrieve Google ID Token.');

        // Authenticate with Firebase using Google credentials
        // Same fallback pattern needed for iOS (see top-level comment)
        const rawAuth = require('@react-native-firebase/auth');
        const authModule = rawAuth.default || rawAuth;
        const googleCredential = authModule.GoogleAuthProvider.credential(idToken);
        const userCredential = await authModule().signInWithCredential(googleCredential);
        
        // Get verified Firebase ID Token (JWT)
        const firebaseIdToken = await userCredential.user.getIdToken();
        if (firebaseIdToken) {
          await login(firebaseIdToken, true, referralCode.trim(), 'login');
        } else {
          throw new Error('Failed to retrieve Firebase ID Token.');
        }
      } catch (error: any) {
        console.error('Google Sign-in failed:', error);
        Alert.alert('Sign-in Failed', error.message || 'Failed to authenticate via Google.');
      } finally {
        setGoogleLoading(false);
      }
    } else {
      Alert.alert('Google Sign-In Unavailable', 'Google Authentication requires a native build with Google Play Services.');
    }
  };

  // Render 6-digit OTP code boxes
  const renderOTPslices = () => {
    const slots = Array(6).fill('');
    return (
      <TouchableOpacity 
        style={styles.otpGrid} 
        activeOpacity={1}
        onPress={() => otpInputRef.current?.focus()}
      >
        {slots.map((_, index) => {
          const char = otpCode[index] || '';
          const isActive = index === otpCode.length && isFocused;
          return (
            <View 
              key={index} 
              style={[
                styles.otpSlot, 
                isActive && styles.otpSlotActive,
                char.length > 0 && styles.otpSlotFilled
              ]}
            >
              <Text style={styles.otpChar}>{char}</Text>
              {isActive && <View style={styles.blinkingCursor} />}
            </View>
          );
        })}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.blackBackground}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              
              {/* Back Button for multi-step auth */}
              {step !== 'choice' && (
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={() => {
                    if (step === 'otp') {
                      setStep('phone');
                    } else if (step === 'phone') {
                      setStep(isSignUp ? 'choice' : 'login_choice');
                    } else if (step === 'login_choice') {
                      setStep('choice');
                    }
                  }}
                >
                  <Ionicons name="arrow-back-outline" size={24} color="#94A3B8" />
                </TouchableOpacity>
              )}

              {/* Large Centered Logo and Tagline (matching the splash screen style) */}
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/images/logo.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
                <Text style={styles.tagline}>where college life gets real 🔥</Text>
              </View>

              {/* Glassmorphic iPhone-style login card */}
              <BlurView 
                intensity={Platform.OS === 'ios' ? 50 : 85} 
                tint="dark" 
                style={styles.glassCard}
              >
                {step === 'choice' ? (
                  <View style={styles.formContainer}>
                    <Text style={styles.cardHeader}>Get Started</Text>
                    <Text style={styles.cardSub}>Choose how you want to join Off-Campus</Text>

                    <TouchableOpacity 
                      style={[styles.actionBtn, { marginBottom: 14 }]} 
                      onPress={() => {
                        setIsSignUp(true);
                        setStep('phone');
                      }}
                    >
                      <LinearGradient colors={['#C2FF3D', '#76A30E']} style={styles.btnGrad}>
                        <Ionicons name="person-add" size={18} color="#000" />
                        <Text style={[styles.btnText, { color: '#000' }]}>New User? Create Account</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <Text style={[styles.cardSub, { fontSize: 11, textAlign: 'center', marginTop: -8, marginBottom: 16 }]}>
                      (Account creation is phone number verification only)
                    </Text>

                    <TouchableOpacity 
                      style={styles.googleLoginBtn} 
                      onPress={() => setStep('login_choice')}
                    >
                      <Ionicons name="log-in-outline" size={18} color="#FFF" style={{ marginRight: 10 }} />
                      <Text style={styles.googleBtnText}>Already Registered? Log In</Text>
                    </TouchableOpacity>
                  </View>
                ) : step === 'login_choice' ? (
                  <View style={styles.formContainer}>
                    <Text style={styles.cardHeader}>Log In</Text>
                    <Text style={styles.cardSub}>Select your preferred login method</Text>

                    <TouchableOpacity 
                      style={[styles.actionBtn, { marginBottom: 16 }]} 
                      onPress={() => {
                        setIsSignUp(false);
                        setStep('phone');
                      }}
                    >
                      <LinearGradient colors={['#8B5CF6', '#F43F5E']} style={styles.btnGrad}>
                        <Ionicons name="call" size={18} color="#FFF" />
                        <Text style={styles.btnText}>Log in with Phone</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.googleLoginBtn} 
                      onPress={handleGoogleLogin}
                      disabled={googleLoading}
                    >
                      {googleLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="logo-google" size={18} color="#FFF" style={{ marginRight: 10 }} />
                          <Text style={styles.googleBtnText}>Log in with Google</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.googleLoginBtn, { marginTop: 12 }]} 
                      onPress={() => {
                        Alert.alert('Apple Sign-In', 'Apple Sign-In will be enabled on iOS production builds.');
                      }}
                    >
                      <Ionicons name="logo-apple" size={20} color="#FFF" style={{ marginRight: 10 }} />
                      <Text style={styles.googleBtnText}>Log in with Apple</Text>
                    </TouchableOpacity>
                  </View>
                ) : step === 'phone' ? (
                  <View style={styles.formContainer}>
                    <Text style={styles.cardHeader}>{isSignUp ? "Create Account" : "Log In"}</Text>
                    <Text style={styles.cardSub}>Enter your mobile number to receive verification code</Text>

                    <View style={styles.phoneInputRow}>
                      <View style={styles.prefixBox}>
                        <Text style={styles.prefixText}>🇮🇳 +91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#71717A"
                        value={phoneNumber}
                        onChangeText={(val) => setPhoneNumber(convertDevanagariToAscii(val))}
                        keyboardType="phone-pad"
                        maxLength={10}
                        autoCorrect={false}
                      />
                    </View>

                    {/* Referral Code Input (Only for new user account creation) */}
                    {isSignUp && (
                      <View style={[styles.referralContainer, { marginTop: 12, marginBottom: 12 }]}>
                        <Ionicons name="gift-outline" size={16} color="#A1A1AA" />
                        <TextInput
                          style={styles.referralInput}
                          placeholder="Referral Code (Optional)"
                          placeholderTextColor="#A1A1AA"
                          value={referralCode}
                          onChangeText={setReferralCode}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                      </View>
                    )}

                    <TouchableOpacity style={styles.actionBtn} onPress={handleSendOTP}>
                      <LinearGradient colors={['#8B5CF6', '#F43F5E']} style={styles.btnGrad}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                        <Text style={styles.btnText}>Send Verification Code</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.formContainer}>
                    <Text style={styles.cardHeader}>Verify Code</Text>
                    <Text style={styles.cardSub}>We sent a 6-digit code to</Text>
                    
                    <View style={styles.numberRow}>
                      <Text style={styles.numberText}>+91 {phoneNumber}</Text>
                      <TouchableOpacity onPress={() => setStep('phone')}>
                        <Text style={styles.editText}>Edit</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Hidden input to capture keypad strokes */}
                    <TextInput
                      ref={otpInputRef}
                      style={styles.hiddenInput}
                      value={otpCode}
                      onChangeText={(val) => setOtpCode(convertDevanagariToAscii(val))}
                      keyboardType="number-pad"
                      maxLength={6}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      autoFocus
                    />
                    
                    {renderOTPslices()}

                    <View style={styles.timerRow}>
                      {timer > 0 ? (
                        <Text style={styles.timerText}>Resend code in {timer}s</Text>
                      ) : (
                        <TouchableOpacity onPress={handleResend}>
                          <Text style={styles.resendText}>Resend Code</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Referral Code Input (Only for new user account creation) */}
                    {isSignUp && (
                      <View style={styles.referralContainer}>
                        <Ionicons name="gift-outline" size={16} color="#A1A1AA" />
                        <TextInput
                          style={styles.referralInput}
                          placeholder="Referral Code (Optional)"
                          placeholderTextColor="#A1A1AA"
                          value={referralCode}
                          onChangeText={setReferralCode}
                          autoCapitalize="characters"
                          autoCorrect={false}
                        />
                      </View>
                    )}

                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={handleVerifyOTP}
                      disabled={loading}
                    >
                      <LinearGradient colors={['#8B5CF6', '#F43F5E']} style={styles.btnGrad}>
                        {loading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="sparkles" size={18} color="#FFF" />
                            <Text style={styles.btnText}>Verify & Start Vibing</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </BlurView>

              {/* Disclaimer and Admin links at the bottom */}
              <View style={styles.footerContainer}>
                <Text style={styles.disclaimer}>verified students only • 18+</Text>
                
                {step === 'phone' && (
                  <TouchableOpacity onPress={() => router.push('/admin')}>
                    <Text style={styles.adminLink}>Admin Portal</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  blackBackground: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, padding: 24, justifyContent: 'space-between', alignItems: 'center', minHeight: 650 },
  
  backButton: { position: 'absolute', left: 24, top: 12, padding: 4, zIndex: 10 },
  
  // Center logo layout
  logoContainer: { alignItems: 'center', marginTop: 80, flex: 1, justifyContent: 'center', gap: 8, width: '100%' },
  logoImage: { width: 280, height: 160, alignSelf: 'center' }, 
  tagline: { fontSize: 16, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.5, marginTop: -15 },
  
  // iPhone glassmorphic card style
  glassCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    padding: 24,
    marginVertical: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  formContainer: { width: '100%', alignItems: 'center', gap: 12 },
  cardHeader: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  cardSub: { color: '#E4E4E7', fontSize: 14, textAlign: 'center', fontWeight: '500' }, // Increased contrast & font weight

  // Phone input row (glassmorphic input style)
  phoneInputRow: { 
    flexDirection: 'row', 
    width: '100%', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1.2, 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 30,
    overflow: 'hidden',
    marginVertical: 8,
  },
  prefixBox: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingLeft: 20, 
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)'
  },
  prefixText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Hidden inputs & OTP passcode box system
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 12,
  },
  otpSlot: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  otpSlotActive: {
    borderColor: '#F43F5E',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  otpSlotFilled: {
    borderColor: '#8B5CF6',
  },
  otpChar: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  blinkingCursor: {
    position: 'absolute',
    bottom: 12,
    width: 16,
    height: 2,
    backgroundColor: '#F43F5E',
  },
  timerRow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  timerText: { color: '#94A3B8', fontSize: 14 },
  resendText: { color: '#F43F5E', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  // Purple-to-pink gradient button style with white text
  actionBtn: { width: '100%', height: 50, borderRadius: 12, overflow: 'hidden', marginTop: 16 },
  btnGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  referralContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 16,
    height: 50,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
    width: '100%',
  },
  referralInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
  },
  
  // OTP Number setup
  numberRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 4 },
  numberText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  editText: { color: '#3B82F6', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  // Footer section with extra breathing room & cleaner weight
  footerContainer: { alignItems: 'center', width: '100%', gap: 14, marginBottom: 50 }, // Spacing increased from 20 to 50
  disclaimer: { color: '#4B5563', fontSize: 12, fontWeight: '500' },
  adminLink: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline', marginTop: 4 }, // Increased contrast & font weight

  // Google Login and Divider Styles
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  googleLoginBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  googleBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
