import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BlurView } from 'expo-blur';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Premium() {
  const { user, sessionToken, refreshUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [college, setCollege] = useState<any>(user?.college || null);

  useEffect(() => {
    if (user?.college) {
      setCollege(user.college);
    } else if (user?.college_id) {
      fetchCollege();
    }
  }, [user]);

  const fetchCollege = async () => {
    if (sessionToken === 'dummy_token' || !sessionToken) {
      setCollege({
        college_id: 'col_stephens',
        name: "St. Stephen's College",
        short_name: "Stephens",
        location: "University Enclave, Delhi"
      });
      return;
    }
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user?.college_id}`);
      if (response.ok) {
        const data = await response.json();
        setCollege(data.college);
      }
    } catch (error) {
      console.error('Error fetching college in premium:', error);
    }
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      if (sessionToken === 'dummy_token') {
        Alert.alert('Demo Mode 👑', 'Simulating Premium Activation!');
        await verifyPayment('order_demo_123', 'pay_demo_123', 'sig_demo_123');
        return;
      }

      // 1. Create Razorpay order via backend
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` }
      });

      if (!r.ok) {
        const errData = await r.json();
        Alert.alert('Payment Error', errData.detail || 'Failed to create payment order');
        setLoading(false);
        return;
      }

      const orderData = await r.json();
      const { order_id, amount, currency, key_id } = orderData;

      if (Platform.OS === 'web') {
        // Load Razorpay Script dynamically on Web
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const options = {
            key: key_id,
            amount: amount,
            currency: currency,
            name: 'Off Campus Premium',
            description: 'Student Pass Membership (1 Month)',
            order_id: order_id,
            prefill: {
              name: user?.name || '',
              email: user?.email || '',
              contact: user?.phone_number || ''
            },
            theme: { color: '#C2FF3D' },
            handler: async (response: any) => {
              await verifyPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
            },
            modal: {
              ondismiss: () => {
                setLoading(false);
              }
            }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        // On Mobile App / Expo, launch Razorpay Gateway in native WebBrowser
        const checkoutUrl = `${EXPO_PUBLIC_BACKEND_URL}/api/payment/checkout-page?order_id=${order_id}&key_id=${key_id}&amount=${amount}&token=${sessionToken}`;
        await WebBrowser.openBrowserAsync(checkoutUrl);

        // Sync status upon returning to app
        await refreshUser();
        setLoading(false);
      }
    } catch (e: any) {
      console.error('[Razorpay Payment Exception]:', e);
      Alert.alert('Error', e.message || 'Could not initiate Razorpay payment');
      setLoading(false);
    }
  };

  const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        })
      });

      const data = await r.json();

      if (data.success || data.is_premium) {
        await refreshUser();
        Alert.alert('Welcome to Premium! 👑', 'Your Off Campus Student Pass is now active!');
        router.back();
      } else {
        Alert.alert('Verification Failed', data.detail || 'Could not verify payment');
      }
    } catch (e: any) {
      console.error('[Verify Payment Error]:', e);
      Alert.alert('Error', 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'infinite-outline', text: 'Unlimited swiping & likes on Vibe deck' },
    { icon: 'eye-outline', text: 'See everyone who likes you in Likes page' },
    { icon: 'flash-outline', text: '2x Profile Visibility in campus recommendations' },
    { icon: 'refresh-outline', text: 'Revisit & rewind skipped profiles anytime' },
    { icon: 'globe-outline', text: 'Post stories to the Global campus feed' },
    { icon: 'school-outline', text: `All Access to all Delhi colleges (including ${college?.short_name || 'VIPS'}, IITD, LSR, and more)` },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F0817', '#1A0B2E']} style={styles.bg}>
        <View style={[styles.glowBlob, { top: 60, right: -90, backgroundColor: 'rgba(194, 255, 61, 0.12)', width: 280, height: 280, borderRadius: 140 }]} pointerEvents="none" />
        <View style={[styles.glowBlob, { bottom: 120, left: -100, backgroundColor: 'rgba(155, 89, 182, 0.12)', width: 320, height: 320, borderRadius: 160 }]} pointerEvents="none" />

        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          <View style={styles.crown}>
            <LinearGradient colors={['#C2FF3D', '#76A30E']} style={styles.crownCircle}>
              <Ionicons name="diamond" size={44} color="#000" />
            </LinearGradient>
          </View>

          <Text style={styles.heroTitle}>
            {college?.name || user?.college?.name || 'Vivekananda Institute of Professional Studies'}
          </Text>
          <Text style={styles.heroPremium}>
            OFF CAMPUS PREMIUM PASS
          </Text>
          <Text style={styles.heroSub}>Unlimited Likes, Rewinds & Global Access 🎓</Text>

          <View style={styles.priceCard}>
            <BlurView intensity={35} tint="dark" style={styles.priceGlass}>
              <View style={styles.studentBadge}>
                <Ionicons name="school" size={12} color="#C2FF3D" />
                <Text style={styles.studentBadgeText}>STUDENT SPECIAL OFFER</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.priceOld}>₹399</Text>
                <Text style={styles.priceAmt}>₹99</Text>
              </View>
              <Text style={styles.pricePer}>student pass / month</Text>
              <Text style={styles.priceNote}>Unlock all features instantly. Cancel anytime.</Text>
            </BlurView>
          </View>

          <View style={styles.features}>
            {features.map((f, i) => (
              <BlurView key={i} intensity={15} tint="dark" style={styles.feature}>
                <View style={styles.featIcon}>
                  <Ionicons name={f.icon as any} size={20} color="#C2FF3D" />
                </View>
                <Text style={styles.featText}>{f.text}</Text>
              </BlurView>
            ))}
          </View>

          <TouchableOpacity style={styles.subBtn} onPress={handleRazorpayPayment} disabled={loading || user?.is_premium} activeOpacity={0.9}>
            <LinearGradient colors={['#C2FF3D', '#9BDC20']} style={styles.subBtnGrad}>
              {loading ? <ActivityIndicator color="#000" /> : (
                <>
                  <Ionicons name="diamond" size={20} color="#000" />
                  <Text style={styles.subBtnText}>{user?.is_premium ? 'Already Premium ✨' : 'Buy Student Pass — ₹99'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            ⚡ Fast & Secure payment via Razorpay • Auto-resets daily likes at 5:30 AM IST
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0817' },
  bg: { flex: 1 },
  glowBlob: {
    position: 'absolute',
    opacity: 0.6,
  },
  topBar: { padding: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  crown: { alignItems: 'center', marginBottom: 16, marginTop: 10 },
  crownCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: '#FFF', fontSize: 24, lineHeight: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, paddingHorizontal: 10 },
  heroPremium: { color: '#C2FF3D', fontSize: 14, fontWeight: '900', textAlign: 'center', letterSpacing: 4, marginTop: 12 },
  heroSub: { color: '#A899B8', fontSize: 14, textAlign: 'center', marginTop: 8 },
  priceCard: { marginTop: 24, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(194, 255, 61, 0.25)' },
  priceGlass: { padding: 24, alignItems: 'center' },
  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  studentBadgeText: {
    color: '#C2FF3D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceOld: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 32,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  priceAmt: { color: '#FFF', fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  pricePer: { color: '#FFF', fontSize: 15, opacity: 0.9, marginTop: 4 },
  priceNote: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, marginTop: 10, textAlign: 'center', lineHeight: 16 },
  features: { marginTop: 24, gap: 10 },
  feature: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    padding: 14, 
    borderRadius: 18, 
    borderWidth: 1, 
    borderColor: 'rgba(194, 255, 61, 0.15)',
    overflow: 'hidden'
  },
  featIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(194, 255, 61, 0.1)', alignItems: 'center', justifyContent: 'center' },
  featText: { color: '#FFF', flex: 1, fontSize: 14, lineHeight: 18 },
  subBtn: { marginTop: 24, borderRadius: 30, overflow: 'hidden' },
  subBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18 },
  subBtnText: { color: '#000', fontWeight: '900', fontSize: 18 },
  disclaimer: { color: '#6B5B7A', fontSize: 11, textAlign: 'center', marginTop: 16 },
});
