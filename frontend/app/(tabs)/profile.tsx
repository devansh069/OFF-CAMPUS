import React, { useState, useEffect } from 'react';
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
  Modal,
  Share,
  TextInput,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const EXPO_PUBLIC_SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;

export default function Profile() {
  const { user, sessionToken, logout, refreshUser, updateUser } = useAuth();
  const router = useRouter();
  const [college, setCollege] = useState<any>(user?.college || null);
  const [vibeModalVisible, setVibeModalVisible] = useState(false);
  const [vibeHistory, setVibeHistory] = useState<any[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<'view' | 'premium'>('view');
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [showRejectWarning, setShowRejectWarning] = useState(true);
  const [rejectExpanded, setRejectExpanded] = useState(false);

  useEffect(() => {
    if (user?.college) {
      setCollege(user.college);
    } else if (user?.college_id) {
      fetchCollege();
    }
  }, [user]);

  useEffect(() => {
    if (vibeModalVisible && sessionToken && sessionToken !== 'dummy_token') {
      fetchVibeHistory();
    }
  }, [vibeModalVisible]);

  const fetchVibeHistory = async () => {
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/vibe-history`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const data = await res.json();
      setVibeHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

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
      const data = await response.json();
      setCollege(data.college);
    } catch (error) {
      console.error('Error fetching college:', error);
    }
  };

  const handleShareProfile = async () => {
    if (!user?.is_premium) {
      Alert.alert(
        'Premium Feature 👑',
        'Sharing your profile via link is a premium feature. Upgrade now to share your profile with students across all campuses!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Premium', onPress: () => router.push('/premium') }
        ]
      );
      return;
    }

    try {
      const shareUrl = `https://offcampus.in/profile/${user.user_id}`;
      await Share.share({
        message: `Check out my profile on Off-Campus! 🎓✨\n\nSee it here: ${shareUrl}`,
        url: shareUrl
      });
    } catch (e) {
      console.error('[ShareProfile Error]:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const premiumFeatures = [
    { icon: 'infinite-outline', text: 'Unlimited swiping & likes on Vibe deck', color: '#C2FF3D' },
    { icon: 'eye-outline', text: 'See everyone who likes you in Likes page', color: '#FF6B9D' },
    { icon: 'flash-outline', text: '2x Profile Visibility in campus recommendations', color: '#FFD700' },
    { icon: 'refresh-outline', text: 'Revisit & rewind skipped profiles anytime', color: '#7C5CFC' },
    { icon: 'globe-outline', text: 'Post stories to the Global campus feed', color: '#4FC3F7' },
    { icon: 'school-outline', text: `All Access to all Delhi colleges (including ${college?.short_name || 'VIPS'}, IITD, LSR & more)`, color: '#FF8A65' },
    { icon: 'shield-checkmark-outline', text: 'Priority support & verified premium badge', color: '#69F0AE' },
  ];

  const pricingPlans = [
    { months: 1, price: 99, label: '1 Month', perMonth: 99 },
    { months: 3, price: 249, label: '3 Months', perMonth: 83, bestValue: true },
    { months: 6, price: 499, label: '6 Months', perMonth: 83 },
    { months: 12, price: 699, label: '12 Months', perMonth: 58 },
  ];

  const [selectedPlan, setSelectedPlan] = useState(1);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponApplied(null);
    try {
      const plan = pricingPlans[selectedPlan];
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ code: couponCode.trim(), planMonths: plan.months, amount: plan.price }),
      });
      const data = await r.json();
      if (r.ok && data.valid) {
        setCouponApplied(data);
        setCouponError('');
      } else {
        setCouponError(data.detail || 'Invalid coupon code');
        setCouponApplied(null);
      }
    } catch (e: any) {
      setCouponError('Failed to apply coupon');
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(null);
    setCouponError('');
  };

  const handlePremiumPayment = async (amount: number) => {
    setPremiumLoading(true);
    try {
      if (sessionToken === 'dummy_token') {
        Alert.alert('Demo Mode 👑', `Simulating ₹${amount} Premium Activation!`);
        setPremiumLoading(false);
        return;
      }

      const payAmount = couponApplied ? couponApplied.final_amount : amount;
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ amount: payAmount, couponCode: couponApplied ? couponApplied.code : null, planMonths: pricingPlans[selectedPlan].months }),
      });

      if (!r.ok) {
        const errData = await r.json();
        Alert.alert('Payment Error', errData.detail || 'Failed to create payment order');
        setPremiumLoading(false);
        return;
      }

      const orderData = await r.json();
      const { order_id, amount: orderAmount, key_id } = orderData;

      if (Platform.OS === 'web') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const options = {
            key: key_id,
            amount: orderAmount,
            currency: 'INR',
            name: 'Off Campus Premium',
            description: `Student Pass - ₹${amount}`,
            order_id: order_id,
            prefill: {
              name: user?.name || '',
              email: user?.email || '',
              contact: user?.phone_number || ''
            },
            theme: { color: '#C2FF3D' },
            handler: async (response: any) => {
              await verifyPremiumPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
            },
            modal: { ondismiss: () => setPremiumLoading(false) }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        const checkoutUrl = `${EXPO_PUBLIC_BACKEND_URL}/api/payment/checkout-page?order_id=${order_id}&key_id=${key_id}&amount=${orderAmount}&token=${sessionToken}`;
        await WebBrowser.openBrowserAsync(checkoutUrl);
        await refreshUser();
        setPremiumLoading(false);
      }
    } catch (e: any) {
      console.error('[Premium Payment Error]:', e);
      Alert.alert('Error', e.message || 'Could not initiate payment');
      setPremiumLoading(false);
    }
  };

  const verifyPremiumPayment = async (orderId: string, paymentId: string, signature: string) => {
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          couponCode: couponApplied ? couponApplied.code : null,
          planMonths: pricingPlans[selectedPlan].months,
          originalAmount: pricingPlans[selectedPlan].price
        })
      });
      const data = await r.json();
      if (data.success || data.is_premium) {
        await refreshUser();
        Alert.alert('Welcome to Premium! 👑', 'Your Off Campus Student Pass is now active!');
      } else {
        Alert.alert('Verification Failed', data.detail || 'Could not verify payment');
      }
    } catch (e: any) {
      console.error('[Verify Payment Error]:', e);
      Alert.alert('Error', 'Payment verification failed');
    } finally {
      setPremiumLoading(false);
    }
  };

  const addPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showProfileMockPhotoAlert('Gallery permission denied or not granted.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadPhotoToServer(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else if (!result.canceled) {
        showProfileMockPhotoAlert('Could not read image data.');
      }
    } catch (error) {
      console.warn('addPhoto failed:', error);
      showProfileMockPhotoAlert('Gallery is not available on this simulator/device.');
    }
  };

  const uploadPhotoToServer = async (photoData: string) => {
    if ((sessionToken === 'dummy_token' || !sessionToken) && updateUser) {
      if (!user) return;
      updateUser({ photos: [...(user.photos || []), photoData] });
      return;
    }

    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ photo: photoData }),
      });
      await refreshUser();
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  const showProfileMockPhotoAlert = (message: string) => {
    Alert.alert(
      'Simulator Mode 📸',
      `${message} Would you like to add a mock profile photo instead for testing?`,
      [
        {
          text: 'Add Mock Photo',
          onPress: () => {
            const randomPhotos = [
              'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
            ];
            const randomPhoto = randomPhotos[Math.floor(Math.random() * randomPhotos.length)];
            uploadPhotoToServer(randomPhoto);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const deletePhoto = (index: number) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if ((sessionToken === 'dummy_token' || !sessionToken) && updateUser) {
            if (!user) return;
            const updated = [...(user.photos || [])];
            updated.splice(index, 1);
            updateUser({ photos: updated });
            return;
          }

          try {
            await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/photos/${index}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${sessionToken}` },
            });
            await refreshUser();
          } catch (error) {
            console.error('Error:', error);
          }
        }
      },
    ]);
  };

  const addSpotifyData = async () => {
    Alert.alert(
      'Spotify Vibes',
      'Choose how you want to connect Spotify to boost your Vibe Score!',
      [
        {
          text: 'Connect Real Spotify 🎵',
          onPress: async () => {
            try {
              if (!EXPO_PUBLIC_SPOTIFY_CLIENT_ID) {
                Alert.alert('Error', 'Spotify Client ID is not configured in frontend .env.');
                return;
              }

              // Build a redirect URL using Expo's Linking helper
              const redirectUri = Linking.createURL('spotify-callback');
              console.log('[Spotify Auth] Generated redirect URI:', redirectUri);

              // Spotify authorization endpoint
              const authUrl = `https://accounts.spotify.com/authorize?` +
                `client_id=${EXPO_PUBLIC_SPOTIFY_CLIENT_ID}` +
                `&response_type=code` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=${encodeURIComponent('user-top-read user-read-private')}`;

              console.log('[Spotify Auth] Launching Browser session...');
              const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

              if (result.type === 'success') {
                const parsedUrl = Linking.parse(result.url);
                const code = parsedUrl.queryParams?.code;

                if (!code) {
                  Alert.alert('Auth Failed', 'No authorization code returned from Spotify.');
                  return;
                }

                console.log('[Spotify Auth] Exchanging authorization code on backend...');
                const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/spotify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`,
                  },
                  body: JSON.stringify({
                    code,
                    redirectUri
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || 'Backend exchange failed');
                }

                await refreshUser();
                Alert.alert('Success', 'Spotify profile connected! Vibe Score increased!');
              } else {
                console.log('[Spotify Auth] Browser session closed or canceled:', result.type);
              }
            } catch (error: any) {
              console.error('[Spotify Auth Error]:', error);
              Alert.alert('Connection Failed', error.message || 'Failed to connect Spotify.');
            }
          }
        },
        {
          text: 'Add Sample Data',
          onPress: async () => {
            if ((sessionToken === 'dummy_token' || !sessionToken) && updateUser) {
              updateUser({
                spotify_data: {
                  top_tracks: ['Starboy - The Weeknd', 'Levitating - Dua Lipa', 'Peaches - Justin Bieber'],
                  top_artists: ['Harry Styles', 'Glass Animals', 'The Weeknd'],
                },
                vibe_score: 4.9
              });
              Alert.alert('Success', 'Spotify data added! Vibe Score increased!');
              return;
            }

            try {
              await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/spotify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({
                  top_tracks: ['Starboy - The Weeknd', 'Levitating - Dua Lipa', 'Peaches - Justin Bieber'],
                  top_artists: ['Harry Styles', 'Glass Animals', 'The Weeknd'],
                }),
              });
              await refreshUser();
              Alert.alert('Success', 'Spotify data added! Vibe Score increased!');
            } catch (error) {
              console.error('Error:', error);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Verification Rejected Warning Modal */}
      <Modal
        visible={user?.verification_status === 'rejected' && showRejectWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRejectWarning(false)}
      >
        <View style={styles.warningOverlayBg}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          <View style={styles.warningCardGlass}>
            {/* Close Cross Button */}
            <TouchableOpacity
              style={styles.warningCrossBtn}
              onPress={() => setShowRejectWarning(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <View style={styles.warningIconCircle}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
            </View>

            {!rejectExpanded ? (
              // Phase 1: Collapsed
              <TouchableOpacity
                onPress={() => setRejectExpanded(true)}
                activeOpacity={0.85}
                style={styles.warningMainLineClickable}
              >
                <Text style={styles.warningMainText}>
                  Admin has rejected your verification request: &quot;{user?.rejection_reason || 'The uploaded ID card image was invalid or blurry.'}&quot;
                </Text>
                <Text style={styles.warningTapHint}>Tap to view details</Text>
              </TouchableOpacity>
            ) : (
              // Phase 2: Expanded
              <View style={styles.warningExpandedContent}>
                <Text style={styles.warningMainText}>
                  Admin has rejected your verification request: &quot;{user?.rejection_reason || 'The uploaded ID card image was invalid or blurry.'}&quot;
                </Text>
                
                <Text style={styles.warningSubText}>
                  You can&apos;t send likes until you are verified.
                </Text>

                <View style={styles.warningActionRow}>
                  <TouchableOpacity
                    style={styles.warningBtnVerify}
                    onPress={() => {
                      setShowRejectWarning(false);
                      router.push('/onboarding/verification');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.warningBtnVerifyText}>Verify Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.warningBtnClose}
                    onPress={() => setShowRejectWarning(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.warningBtnCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* Top-Left Dark Purple Glow Ball */}
      <View style={styles.glowBallContainer}>
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Brand Header */}
          <View style={styles.headerBar}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../assets/images/logo_off.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.settingsIcon} onPress={() => router.push('/settings')}>
                <Ionicons name="settings-outline" size={22} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Avatar Card */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: user.photos?.[0] || user.picture || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2662&auto=format&fit=crop'
                }}
                style={styles.avatarImageCircle}
              />
              {user?.is_premium && (
                <View style={styles.premiumGoldenCrownBadge}>
                  <Ionicons name="crown" size={16} color="#FFD700" />
                </View>
              )}
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
              <TouchableOpacity
                onPress={() => router.push('/onboarding/verification')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={
                    user.verification_status === 'verified'
                      ? (user.verification_method === 'manual' ? '#F87171' : '#3B82F6')
                      : 'rgba(255, 255, 255, 0.4)'
                  }
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.collegePill}>
              <Text style={styles.collegePillText}>
                {college?.name || user?.college?.name || 'Vivekananda Institute of Professional Studies'}
              </Text>
            </View>

            <View style={styles.profileActionRowContainer}>
              <TouchableOpacity
                style={styles.editProfilePencilBtn}
                onPress={() => router.push('/profile-edit')}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil" size={12} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.editProfilePencilText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShareProfile}
                activeOpacity={0.7}
                style={{ padding: 8, marginLeft: 8 }}
              >
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Profile Dashboard & Management Tools */}
          <View style={styles.dashboardSection}>
            <View style={styles.statsRowInline}>
              {/* Vibe Score Card */}
              <TouchableOpacity style={[styles.statCardInline, styles.vibeStatCardInline]} onPress={() => setVibeModalVisible(true)} activeOpacity={0.85}>
                <View style={styles.statIconRowInline}>
                  <Ionicons name="sparkles" size={16} color="#C2FF3D" style={{ marginRight: 6 }} />
                  <Text style={styles.statLabelInline}>VIBE SCORE</Text>
                </View>
                <Text style={styles.statValueInline}>{(user.vibe_score || 8.5).toFixed(1)}<Text style={styles.statMaxInline}>/10</Text></Text>
                <Text style={styles.statSubTextInline}>Tap to view log details</Text>
              </TouchableOpacity>

              {/* Refer Friends Card */}
              <TouchableOpacity style={[styles.statCardInline, styles.referStatCardInline]} onPress={() => router.push('/referrals')} activeOpacity={0.85}>
                <View style={styles.statIconRowInline}>
                  <Ionicons name="gift-outline" size={16} color="#FF6B9D" style={{ marginRight: 6 }} />
                  <Text style={styles.statLabelInline}>REFERRALS</Text>
                </View>
                <Text style={styles.statValueInline}>{user.total_referrals || 0}</Text>
                <Text style={styles.statSubTextInline}>Invite friends & boost score</Text>
              </TouchableOpacity>
            </View>

            {/* Spotify Player Glass Card */}
            <TouchableOpacity
              style={styles.spotifyCardRedesigned}
              onPress={user.spotify_data?.top_tracks ? () => router.push('/spotify-vibe') : addSpotifyData}
              activeOpacity={0.9}
            >
              <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={styles.spotifyHeaderRow}>
                <View style={styles.spotifyHeaderLeft}>
                  <MaterialCommunityIcons name="spotify" size={22} color="#1DB954" style={{ marginRight: 8 }} />
                  <Text style={styles.spotifyHeaderTitle}>Spotify Vibe</Text>
                </View>
                {user.spotify_data?.top_tracks ? (
                  <View style={styles.spotifyConnectedBadge}>
                    <Text style={styles.spotifyUsername}>@{user.name.toLowerCase().replace(/ /g, '_')}</Text>
                  </View>
                ) : (
                  <View style={styles.spotifyConnectBadge}>
                    <Text style={styles.spotifyConnectText}>Connect</Text>
                  </View>
                )}
              </View>

              {user.spotify_data?.top_tracks && user.spotify_data.top_tracks.length > 0 ? (
                <View style={styles.spotifyTrackList}>
                  {user.spotify_data.top_tracks.slice(0, 3).map((track: any, idx: number) => {
                    let title = '';
                    let artist = '';
                    if (typeof track === 'string') {
                      const parts = track.split(' - ');
                      title = parts[0] || track;
                      artist = parts[1] || '';
                    } else if (track && typeof track === 'object') {
                      title = track.name || '';
                      artist = track.artist || '';
                    }
                    return (
                      <View key={idx} style={styles.spotifyTrackRowInline}>
                        <Ionicons name="musical-note" size={14} color="#1DB954" style={{ marginRight: 8 }} />
                        <Text style={styles.spotifyTrackText} numberOfLines={1}>
                          <Text style={{ fontWeight: '700', color: '#FFF' }}>{title}</Text> {artist ? `• ${artist}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.spotifyPlaceholderText}>Connect your Spotify account to display your top tracks on your card.</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Frosted Floating Tab Bar */}
          <View style={styles.glassTabBar}>
            <TouchableOpacity
              style={[styles.glassTabButton, activeProfileTab === 'view' && styles.glassTabButtonActive]}
              onPress={() => setActiveProfileTab('view')}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={16} color={activeProfileTab === 'view' ? '#000' : 'rgba(255,255,255,0.6)'} style={{ marginRight: 6 }} />
              <Text style={[styles.glassTabText, activeProfileTab === 'view' && styles.glassTabTextActive]}>Preview Card</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.glassTabButton, activeProfileTab === 'premium' && styles.glassTabButtonActivePremium]}
              onPress={() => setActiveProfileTab('premium')}
              activeOpacity={0.8}
            >
              <Ionicons name="diamond-outline" size={16} color={activeProfileTab === 'premium' ? '#000' : '#FFD700'} style={{ marginRight: 6 }} />
              <Text style={[styles.glassTabText, activeProfileTab === 'premium' && styles.glassTabTextActive]}>OutThere Plus</Text>
            </TouchableOpacity>
          </View>

          {/* TAB CONTENTS (INLINE SCROLLING) */}
          {activeProfileTab === 'view' ? (
            /* PREVIEW PROFILE SECTION (Inline, no nested ScrollView!) */
            <View style={styles.previewSectionContainer}>
              <View style={styles.cardContainer}>
                {/* Main Image with absolute card details */}
                <View style={styles.mainCardImageContainer}>
                  {user.photos?.[0] ? (
                    <Image source={{ uri: user.photos[0] }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#18122B', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.15)" />
                    </View>
                  )}
                  
                  {/* Bottom details card overlap */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)', '#0F0817']}
                    style={styles.mainCardGradient}
                  >
                    <View style={styles.mainCardDetails}>
                      <View style={styles.mainCardNameRow}>
                        <Text style={styles.mainCardName}>{user.name}{user.age ? `, ${user.age}` : ''}</Text>
                        {user.verification_status === 'verified' && (
                          <Ionicons name="checkmark-circle" size={18} color="#C2FF3D" style={{ marginLeft: 6 }} />
                        )}
                        {user.is_premium && (
                          <View style={styles.premiumGoldBadge}>
                            <Ionicons name="crown" size={12} color="#FFD700" />
                            <Text style={styles.premiumGoldText}>PLUS</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.mainCardCollegeText}>
                        🎓 {college?.name || user?.college?.name || 'Vivekananda Institute of Professional Studies'}
                      </Text>

                      {user.course && (
                        <Text style={styles.mainCardCourseText}>
                          📚 {user.course} {user.year ? `• Year ${user.year}` : ''}
                        </Text>
                      )}

                      {user.bio && (
                        <View style={styles.mainCardBioContainer}>
                          <Text style={styles.mainCardBioText}>{user.bio}</Text>
                        </View>
                      )}

                      {/* Characteristics row */}
                      <View style={styles.cardCharacteristics}>
                        {user.gender && (
                          <View style={styles.charChip}>
                            <Text style={styles.charChipText}>{user.gender.toUpperCase()}</Text>
                          </View>
                        )}
                        {user.religion && (
                          <View style={styles.charChip}>
                            <Text style={styles.charChipText}>{user.religion}</Text>
                          </View>
                        )}
                        {user.drink && (
                          <View style={styles.charChip}>
                            <Text style={styles.charChipText}>🍹 {user.drink.toUpperCase()}</Text>
                          </View>
                        )}
                        {user.smoke && (
                          <View style={styles.charChip}>
                            <Text style={styles.charChipText}>🚬 {user.smoke.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </LinearGradient>
                </View>

                {/* Interest Tags Section */}
                {user.interests && user.interests.length > 0 && (
                  <View style={styles.interestsCard}>
                    <Text style={styles.interestsCardTitle}>MY INTERESTS</Text>
                    <View style={styles.interestsTagsContainer}>
                      {user.interests.map((interest: string) => (
                        <View key={interest} style={styles.interestTagInline}>
                          <Text style={styles.interestTagTextInline}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Secondary Photos & Prompts (Clean layout flow) */}
                {user.photos?.slice(1).map((photoUri: string, index: number) => {
                  const photoIndex = index + 1;
                  const promptText = user.prompts && typeof user.prompts === 'object' ? (user.prompts as any)[photoIndex] : null;
                  return (
                    <View key={photoIndex} style={styles.secondaryPhotoCard}>
                      {promptText && (
                        <View style={styles.promptHeaderContainer}>
                          <Text style={styles.promptLabelText}>MY VIBE PROMPT</Text>
                          <Text style={styles.promptValueText}>&quot;{promptText}&quot;</Text>
                        </View>
                      )}
                      <View style={styles.secondaryImageContainer}>
                        <Image source={{ uri: photoUri }} style={styles.secondaryImage} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            /* OUTTHERE PLUS PREMIUM SECTION (Inline, no nested ScrollView!) */
            <View style={styles.premiumSectionContainer}>
              {/* Premium Header/Crown Blob */}
              <View style={styles.premiumHeroCard}>
                <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.goldDiamondCircle}>
                  <Ionicons name="diamond" size={32} color="#000" />
                </LinearGradient>
                <Text style={styles.premiumHeroTitle}>OutThere Plus</Text>
                <Text style={styles.premiumHeroSub}>Upgrade your presence & secure unlimited campus access</Text>
              </View>

              {/* Styled Premium Benefits */}
              <View style={styles.premiumBenefitsGrid}>
                {premiumFeatures.map((f, i) => (
                  <View key={i} style={styles.benefitRowCard}>
                    <View style={[styles.benefitIconBox, { backgroundColor: `${f.color}15`, borderColor: `${f.color}35` }]}>
                      <Ionicons name={f.icon as any} size={18} color={f.color} />
                    </View>
                    <View style={styles.benefitTextWrap}>
                      <Text style={styles.benefitTextValue}>{f.text}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Plans Section */}
              <View style={styles.premiumPlansSection}>
                <Text style={styles.plansSectionHeading}>CHOOSE PASS DURATION</Text>
                
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalPlansContainer}
                >
                  {pricingPlans.map((plan, idx) => {
                    const isSelected = selectedPlan === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.planSelectCard,
                          isSelected && styles.planSelectCardSelected,
                          plan.bestValue && styles.planSelectCardBestValue,
                        ]}
                        onPress={() => setSelectedPlan(idx)}
                        activeOpacity={0.85}
                      >
                        {plan.bestValue && (
                          <View style={styles.planBestBadge}>
                            <Ionicons name="star" size={8} color="#000" style={{ marginRight: 2 }} />
                            <Text style={styles.planBestText}>BEST VALUE</Text>
                          </View>
                        )}
                        <Text style={[styles.planLabelText, isSelected && styles.planLabelTextSelected]}>{plan.label}</Text>
                        <Text style={[styles.planPriceText, isSelected && styles.planPriceTextSelected]}>₹{plan.price}</Text>
                        <Text style={styles.planPerMonthText}>₹{plan.perMonth}/mo</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Coupon Code Section */}
                {!user?.is_premium && (
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: couponApplied ? '#69F0AE' : couponError ? '#FF5252' : 'rgba(255,255,255,0.12)', paddingHorizontal: 14, height: 48 }}>
                        <Ionicons name="ticket-outline" size={18} color={couponApplied ? '#69F0AE' : 'rgba(255,255,255,0.4)'} style={{ marginRight: 8 }} />
                        <TextInput
                          placeholder="Have a coupon code?"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          value={couponCode}
                          onChangeText={(text) => { setCouponCode(text.toUpperCase()); setCouponError(''); setCouponApplied(null); }}
                          style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 1 }}
                          autoCapitalize="characters"
                          editable={!couponApplied}
                        />
                        {couponApplied && (
                          <TouchableOpacity onPress={handleRemoveCoupon} style={{ padding: 4 }}>
                            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {!couponApplied && (
                        <TouchableOpacity
                          onPress={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          style={{ backgroundColor: couponCode.trim() ? '#C2FF3D' : 'rgba(255,255,255,0.1)', paddingHorizontal: 18, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', opacity: couponCode.trim() ? 1 : 0.5 }}
                        >
                          {couponLoading ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={{ color: couponCode.trim() ? '#000' : 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: 13 }}>APPLY</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {couponError ? (
                      <Text style={{ color: '#FF5252', fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '600' }}>✕ {couponError}</Text>
                    ) : null}
                    {couponApplied && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(105,240,174,0.1)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(105,240,174,0.2)' }}>
                        <Ionicons name="checkmark-circle" size={18} color="#69F0AE" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#69F0AE', fontSize: 13, fontWeight: '800' }}>{couponApplied.message}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                            ₹{couponApplied.original_amount} → ₹{couponApplied.final_amount}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Sub CTA Button */}
                <TouchableOpacity
                  style={styles.premiumActivateButton}
                  onPress={() => handlePremiumPayment(pricingPlans[selectedPlan].price)}
                  disabled={premiumLoading || user?.is_premium}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#C2FF3D', '#9BDC20']} style={styles.premiumActivateGrad}>
                    {premiumLoading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Ionicons name="diamond" size={18} color="#000" />
                        <Text style={styles.premiumActivateText}>
                          {user?.is_premium ? 'Already Premium Pass Active ✨' : `Get OutThere Plus — ₹${couponApplied ? couponApplied.final_amount : pricingPlans[selectedPlan].price}`}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.paymentDisclaimerText}>
                  ⚡ Secure checkout powered by Razorpay • Instant Activation
                </Text>
              </View>
            </View>
          )}

          {/* Footer Brand Info */}
          <View style={styles.unifiedFooterContainer}>
            <Text style={styles.footerBrandText}>OUT THERE v{Constants.expoConfig?.version || '1.0.4'}</Text>
            <Text style={styles.footerCopyrightText}>Designed with love for Delhi College Students</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* VIBE SCORE AUDIT MODAL (Glassmorphic Redesign) */}
        <Modal visible={vibeModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.modalContentGlass}>
              <View style={styles.modalDragHandle} />

              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.modalHeaderIconBadge}>
                    <Ionicons name="sparkles" size={18} color="#C2FF3D" />
                  </View>
                  <Text style={styles.modalTitle}>Vibe Score Audit</Text>
                </View>
                <TouchableOpacity onPress={() => setVibeModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalIntro}>
                  Your Vibe Score reflects your reputation in the Off Campus community. It automatically updates based on verified referrals and community feedback.
                </Text>

                <View style={styles.auditCardGlass}>
                  <View style={styles.auditCardHeader}>
                    <View style={[styles.auditIconWrap, { backgroundColor: 'rgba(194, 255, 61, 0.15)', borderColor: '#C2FF3D' }]}>
                      <Ionicons name="trending-up" size={18} color="#C2FF3D" />
                    </View>
                    <Text style={styles.auditSectionTitle}>How to Increase Score</Text>
                  </View>

                  <View style={styles.auditRulesContainer}>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="sparkles-outline" size={15} color="#C2FF3D" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>1 Referral: <Text style={{ color: '#C2FF3D', fontWeight: '900' }}>+2 Vibe Score</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="eye-outline" size={15} color="#7C5CFC" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>3 Referrals: <Text style={{ color: '#FFF', fontWeight: '700' }}>1.5x Profile Boost</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="star-outline" size={15} color="#FFD700" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>5 Referrals: <Text style={{ color: '#FFD700', fontWeight: '900' }}>Instant 10/10 Max Score</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="rocket-outline" size={15} color="#FF6B9D" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>7 Referrals: <Text style={{ color: '#FFF', fontWeight: '700' }}>2.0x Ultimate Visibility</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="ticket-outline" size={15} color="#4FC3F7" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>10 Referrals: <Text style={{ color: '#FFF', fontWeight: '700' }}>Free Off-Campus Event Pass</Text></Text>
                    </View>
                    <Text style={styles.auditDisclaimer}>* Maximum score is capped at 10.</Text>
                  </View>
                </View>

                <View style={[styles.auditCardGlass, { borderColor: 'rgba(255, 27, 107, 0.3)' }]}>
                  <View style={styles.auditCardHeader}>
                    <View style={[styles.auditIconWrap, { backgroundColor: 'rgba(255, 27, 107, 0.15)', borderColor: '#FF1B6B' }]}>
                      <Ionicons name="warning" size={18} color="#FF1B6B" />
                    </View>
                    <Text style={[styles.auditSectionTitle, { color: '#FF1B6B' }]}>How it Decreases</Text>
                  </View>

                  <View style={styles.auditRulesContainer}>
                    <Text style={styles.auditIntroText}>When users report suspicious behavior, your score drops progressively:</Text>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="alert-circle-outline" size={15} color="#FF1B6B" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>1st Report: <Text style={{ color: '#FF1B6B', fontWeight: '800' }}>-1 point</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="alert-circle-outline" size={15} color="#FF1B6B" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>2nd Report: <Text style={{ color: '#FF1B6B', fontWeight: '800' }}>-2 points</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="alert-circle-outline" size={15} color="#FF1B6B" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>3rd Report: <Text style={{ color: '#FF1B6B', fontWeight: '800' }}>-3 points</Text></Text>
                    </View>
                    <View style={styles.auditRuleItem}>
                      <Ionicons name="alert-circle-outline" size={15} color="#FF1B6B" style={{ marginRight: 10 }} />
                      <Text style={styles.auditRuleText}>4th Report: <Text style={{ color: '#FF1B6B', fontWeight: '800' }}>-4 points</Text></Text>
                    </View>
                    <Text style={styles.auditDisclaimer}>* Minimum score is clamped at 0.</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 }} />

                <Text style={[styles.auditSectionTitle, { marginBottom: 14, color: '#FFF' }]}>Score History Log</Text>

                {(() => {
                  const displayLogs = vibeHistory.length > 0 ? vibeHistory : (sessionToken === 'dummy_token' ? [
                    { reason: 'Referral Bonus (+2 Score)', change: 2, new_score: 10, createdAt: new Date().toISOString() },
                    { reason: 'Community Report (-1 Penalty)', change: -1, new_score: 8, createdAt: new Date(Date.now() - 86400000).toISOString() }
                  ] : []);

                  if (displayLogs.length === 0) {
                    return (
                      <View style={styles.emptyHistoryGlass}>
                        <Ionicons name="document-text-outline" size={28} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.noHistoryText}>No vibe score changes logged yet.</Text>
                      </View>
                    );
                  }

                  return displayLogs.map((item: any, idx: number) => {
                    const changeVal = item.change !== undefined ? item.change : (item.change_amount !== undefined ? item.change_amount : 0);
                    const isPositive = changeVal >= 0;

                    return (
                      <View key={idx} style={styles.historyLogCard}>
                        <View style={styles.historyLogLeft}>
                          <View style={[
                            styles.historyBadgeIcon,
                            {
                              backgroundColor: isPositive ? 'rgba(194, 255, 61, 0.12)' : 'rgba(255, 27, 107, 0.12)',
                              borderColor: isPositive ? 'rgba(194, 255, 61, 0.4)' : 'rgba(255, 27, 107, 0.4)'
                            }
                          ]}>
                            <Ionicons
                              name={isPositive ? "add" : "remove"}
                              size={16}
                              color={isPositive ? "#C2FF3D" : "#FF1B6B"}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyReason}>{item.reason || (isPositive ? 'Referral Bonus' : 'Community Report')}</Text>
                            <Text style={styles.historyDate}>
                              {item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : 'Recent'}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={[
                            styles.changePill,
                            {
                              backgroundColor: isPositive ? 'rgba(194, 255, 61, 0.12)' : 'rgba(255, 27, 107, 0.12)',
                              borderColor: isPositive ? 'rgba(194, 255, 61, 0.3)' : 'rgba(255, 27, 107, 0.3)'
                            }
                          ]}>
                            <Text style={[styles.historyChange, { color: isPositive ? '#C2FF3D' : '#FF1B6B' }]}>
                              {isPositive ? `+${changeVal}` : `${changeVal}`}
                            </Text>
                          </View>
                          <Text style={styles.historyResult}>Total: {item.new_score ?? user?.vibe_score ?? 10}</Text>
                        </View>
                      </View>
                    );
                  });
                })()}

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  bg: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },

  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -18,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'lowercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  globalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  globalText: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '900',
  },
  settingsIcon: {
    padding: 4,
  },

  avatarSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarContainer: {
    position: 'relative',
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 62,
    backgroundColor: '#050507',
    padding: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarImageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  premiumGoldenCrownBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    backgroundColor: '#0F0817',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  crownBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    backgroundColor: '#C2FF3D',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#050507',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  collegePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  collegePillText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Stats Dashboard
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.2,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  vibeStatCard: {
    borderColor: 'rgba(194, 255, 61, 0.15)',
  },
  streakStatCard: {
    borderColor: 'rgba(255, 165, 0, 0.15)',
  },
  statIconRow: {
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // DNA Card
  dnaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dnaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dnaTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  analysisBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analysisText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dnaSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  dnaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dnaPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  creativeText: {
    color: '#4A90E2',
    fontSize: 11,
    fontWeight: '900',
  },
  nightOwlText: {
    color: '#A55EEA',
    fontSize: 11,
    fontWeight: '900',
  },
  socialiteText: {
    color: '#F5A623',
    fontSize: 11,
    fontWeight: '900',
  },

  // Spotify Card
  spotifyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
    overflow: 'hidden',
  },
  spotifyTracks: {
    gap: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackIndex: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontWeight: '900',
    width: 12,
  },
  trackArt: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  trackArtist: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 1,
  },

  // Gallery
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: '31.2%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addPhotoBtn: {
    width: '31.2%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(194, 255, 61, 0.02)',
    gap: 8,
  },
  addPhotoText: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContentGlass: {
    backgroundColor: 'rgba(20, 20, 25, 0.72)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalHeaderIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(194, 255, 61, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20 },
  modalScroll: { marginTop: 4 },
  modalIntro: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  auditCardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.2)',
  },
  auditCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  auditSectionTitle: { color: '#C2FF3D', fontSize: 16, fontWeight: '800' },
  auditIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  auditRulesContainer: {
    marginTop: 8,
    gap: 10,
  },
  auditRuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  auditRuleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  auditIntroText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  auditDisclaimer: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyHistoryGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  historyLogCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyReason: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  historyDate: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 },
  historyChange: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  historyResult: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: '600' },
  noHistoryText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13 },
  headerLogo: {
    width: 155,
    height: 44,
  },
  historyLogLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  changePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bioText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  tagText: {
    color: '#C2FF3D',
    fontSize: 13,
    fontWeight: '700',
  },

  // Bottom action cards
  actionsContainer: {
    marginVertical: 10,
    gap: 12,
  },
  premiumCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  premiumTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  premiumSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },

  glassCardButton: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(194, 255, 61, 0.25)',
    overflow: 'hidden',
  },
  glassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  logoutCardButton: {
    borderColor: 'rgba(255, 82, 82, 0.25)',
    backgroundColor: 'rgba(255, 82, 82, 0.02)',
  },
  logoutIconBox: {
    borderColor: 'rgba(255, 82, 82, 0.3)',
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
  },
  editProfilePencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C2FF3D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfilePencilText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  vibeScoreExplanation: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  spotifyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  spotifyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spotifyHeaderTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.1,
  },
  spotifyHeaderUsername: {
    color: '#1DB954',
    fontSize: 13,
    fontWeight: '800',
  },
  connectPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 14,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '500',
  },
  spotifyConnectBadge: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 3,
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  spotifyConnectText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
    opacity: 0.3,
  },
  footerBrand: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerCopyright: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 4,
  },

  // Toggle Bar + Content Box
  toggleContentBox: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
    height: 520,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    padding: 6,
  },
  toggleContentScroll: {
    flex: 1,
    marginTop: 6,
  },
  toggleBarRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleBarTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleBarTabActive: {
    backgroundColor: '#C2FF3D',
  },
  toggleBarTabActivePremium: {
    backgroundColor: '#FFD700',
  },
  toggleBarTabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '800',
  },
  toggleBarTabTextActive: {
    color: '#000',
  },

  // View Profile Preview
  viewProfileContainer: {
    paddingHorizontal: 4,
  },
  previewProfileCard: {
    backgroundColor: '#0F0817',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewMainPhoto: {
    width: '100%',
    height: 480,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  previewGlassOverlay: {
    padding: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  previewDetailsInner: {
    gap: 8,
  },
  previewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewName: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  previewVibeBadge: {
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
  previewVibeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  previewCollegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  previewCollegeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  previewBio: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  previewChipsRow: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  previewChipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  previewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  previewTag: {
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.2)',
  },
  previewTagText: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '700',
  },
  previewSpotifyCard: {
    backgroundColor: '#000000',
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1DB954',
    borderRadius: 20,
    margin: 16,
  },
  previewSpotifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewSpotifyTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  previewSpotifyTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  previewSpotifyTrackName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewSpotifyArtistName: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  previewSecondaryCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewPromptHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewPromptLabel: {
    color: '#C2FF3D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  previewPromptText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 22,
  },
  previewSecondaryPhotoWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  previewSecondaryPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // OutThere Plus Premium Tab
  premiumTabContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  premiumHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumDiamondCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  premiumFeaturesList: {
    gap: 10,
    marginBottom: 24,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  premiumFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  premiumFeatureText: {
    color: '#FFF',
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  pricingSectionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 14,
  },
  pricingScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  pricingCard: {
    width: 130,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.06)',
  },
  pricingCardBestValue: {
    borderColor: '#FFD700',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestValueText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pricingMonths: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  pricingMonthsSelected: {
    color: '#C2FF3D',
  },
  pricingPrice: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  pricingPriceSelected: {
    color: '#C2FF3D',
  },
  pricingPerMonth: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  premiumBuyBtn: {
    marginTop: 24,
    borderRadius: 30,
    overflow: 'hidden',
  },
  premiumBuyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
  },
  premiumBuyBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 18,
  },
  premiumDisclaimer: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },

  // NEW PROFILE REDESIGN STYLES
  dashboardSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 12,
  },
  statsRowInline: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardInline: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  vibeStatCardInline: {
    borderColor: 'rgba(194, 255, 61, 0.15)',
    backgroundColor: 'rgba(194, 255, 61, 0.01)',
  },
  referStatCardInline: {
    borderColor: 'rgba(255, 107, 157, 0.15)',
    backgroundColor: 'rgba(255, 107, 157, 0.01)',
  },
  statIconRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabelInline: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statValueInline: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
  },
  statMaxInline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  statSubTextInline: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },

  // Spotify Redesigned
  spotifyCardRedesigned: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.2)',
    overflow: 'hidden',
    padding: 16,
  },
  spotifyTrackList: {
    gap: 8,
    marginTop: 12,
  },
  spotifyTrackRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  spotifyTrackText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    flex: 1,
  },
  spotifyPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  spotifyConnectedBadge: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.25)',
  },
  spotifyUsername: {
    color: '#1DB954',
    fontSize: 10,
    fontWeight: '800',
  },

  // Glass Tab Bar
  glassTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginVertical: 18,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  glassTabButtonActive: {
    backgroundColor: '#C2FF3D',
  },
  glassTabButtonActivePremium: {
    backgroundColor: '#FFD700',
  },
  glassTabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '800',
  },
  glassTabTextActive: {
    color: '#000',
  },

  // Preview profile container
  previewSectionContainer: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    gap: 16,
  },
  mainCardImageContainer: {
    width: '100%',
    height: 520,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainCardGradient: {
    padding: 20,
    paddingTop: 80,
  },
  mainCardDetails: {
    gap: 6,
  },
  mainCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainCardName: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  premiumGoldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  premiumGoldText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 2,
  },
  mainCardCollegeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '700',
  },
  mainCardCourseText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  mainCardBioContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  mainCardBioText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  cardCharacteristics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  charChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  charChipText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '800',
  },

  // Interests Card
  interestsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16,
  },
  interestsCardTitle: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  interestsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTagInline: {
    backgroundColor: 'rgba(194, 255, 61, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.25)',
  },
  interestTagTextInline: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '700',
  },

  // Secondary Photo Prompt cards
  secondaryPhotoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    overflow: 'hidden',
  },
  promptHeaderContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  promptLabelText: {
    color: '#C2FF3D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  promptValueText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 22,
  },
  secondaryImageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  secondaryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Premium Section Inline Styles
  premiumSectionContainer: {
    paddingHorizontal: 16,
  },
  premiumHeroCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  goldDiamondCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  premiumHeroTitle: {
    color: '#FFD700',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  premiumHeroSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  premiumBenefitsGrid: {
    gap: 8,
    marginBottom: 20,
  },
  benefitRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  benefitIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTextValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  premiumPlansSection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  plansSectionHeading: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 14,
    textAlign: 'center',
  },
  horizontalPlansContainer: {
    gap: 8,
    paddingBottom: 4,
  },
  planSelectCard: {
    width: 125,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    position: 'relative',
  },
  planSelectCardSelected: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
  },
  planSelectCardBestValue: {
    borderColor: '#FFD700',
  },
  planBestBadge: {
    position: 'absolute',
    top: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBestText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  planLabelText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  planLabelTextSelected: {
    color: '#C2FF3D',
  },
  planPriceText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },
  planPriceTextSelected: {
    color: '#C2FF3D',
  },
  planPerMonthText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  premiumActivateButton: {
    marginTop: 18,
    borderRadius: 24,
    overflow: 'hidden',
  },
  premiumActivateGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  premiumActivateText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  paymentDisclaimerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
  },

  // Unified Footer
  unifiedFooterContainer: {
    alignItems: 'center',
    marginVertical: 24,
    opacity: 0.35,
  },
  footerBrandText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  footerCopyrightText: {
    color: '#FFF',
    fontSize: 9,
    marginTop: 4,
  },
  profileActionRowContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },

  // WARNING POPUP OVERLAY STYLES
  warningOverlayBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 24,
  },
  warningCardGlass: {
    backgroundColor: 'rgba(25, 20, 30, 0.96)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  warningCrossBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  warningMainLineClickable: {
    alignItems: 'center',
    width: '100%',
  },
  warningMainText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  warningTapHint: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  warningExpandedContent: {
    width: '100%',
    alignItems: 'center',
  },
  warningSubText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  warningActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    width: '100%',
  },
  warningBtnVerify: {
    flex: 1,
    backgroundColor: '#C2FF3D',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBtnVerifyText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  warningBtnClose: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBtnCloseText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
