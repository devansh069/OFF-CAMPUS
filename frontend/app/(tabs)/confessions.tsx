import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl, Modal, Dimensions, Platform, Animated, KeyboardAvoidingView, Share, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import PremiumUpsellSheet from '@/src/components/PremiumUpsellSheet';
import io from 'socket.io-client';

const { width, height: screenHeight } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const CARD_BG_IMAGES = [
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80',
  'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80'
];

const getCardBg = (id: string) => {
  if (!id) return CARD_BG_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % CARD_BG_IMAGES.length;
  return CARD_BG_IMAGES[idx];
};

const MOCK_CONFESSIONS: any[] = [];

const MOCK_STORIES = [
  {
    user_id: 'user_priya',
    user_name: 'Priya Sharma',
    user_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    has_unviewed: true,
    stories: [
      { image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop', createdAt: new Date(Date.now() - 3600000).toISOString(), audience: 'global', views: [] }
    ]
  },
  {
    user_id: 'user_ananya',
    user_name: 'Ananya Kapoor',
    user_picture: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop',
    has_unviewed: true,
    stories: [
      { image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop', createdAt: new Date(Date.now() - 7200000).toISOString(), audience: 'college', views: [] }
    ]
  }
];

const MOCK_TOP_VIBES = [
  {
    user_id: 'user_priya',
    name: 'Priya Sharma',
    bio: 'Late-night coffee dates & indie music ☕📖',
    vibe_score: 4.9,
    photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop']
  },
  {
    user_id: 'user_aarav',
    name: 'Aarav Mehta',
    bio: 'Football enthusiast, guitar player ⚽🎸',
    vibe_score: 4.8,
    photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop']
  },
  {
    user_id: 'user_ananya',
    name: 'Ananya Kapoor',
    bio: 'Classical dancer and dog lover 🐕💃',
    vibe_score: 4.7,
    photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop']
  }
];

export default function CampusLive() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  const [confessions, setConfessions] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [topVibes, setTopVibes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);
  const [upsellTitle, setUpsellTitle] = useState("Unlock Premium Access 👑");
  const [upsellFeature, setUpsellFeature] = useState("Global Story Upload");
  const [refreshing, setRefreshing] = useState(false);
  const [confessionImage, setConfessionImage] = useState<string | null>(null);
  const [expandedConfessions, setExpandedConfessions] = useState<{ [key: string]: boolean }>({});
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  const toggleExpand = (id: string) => {
    setExpandedConfessions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const launchConfessionCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled) return;
      if (result.assets?.[0]?.base64) {
        setConfessionImage(result.assets[0].base64);
        setShowConfessionPickModal(false);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Camera is not available on this device.');
    }
  };

  const launchConfessionGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to choose photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (result.canceled) return;
      if (result.assets?.[0]?.base64) {
        setConfessionImage(result.assets[0].base64);
        setShowConfessionPickModal(false);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to launch gallery.');
    }
  };

  const selectConfImage = () => {
    setShowConfessionPickModal(true);
  };

  const [college, setCollege] = useState<any>(null);
  const [feedType, setFeedType] = useState<'global' | 'college'>('global');
  const [liveCountGlobal, setLiveCountGlobal] = useState(142);
  const [liveCountCollege, setLiveCountCollege] = useState(18);

  // New states for Story Creation Flow
  const [showPickModal, setShowPickModal] = useState(false);
  const [showConfessionPickModal, setShowConfessionPickModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showBuyPremiumPopup, setShowBuyPremiumPopup] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);

  // Animation refs for Story Audience bottom sheet
  const slideAnim = useRef(new Animated.Value(500)).current;

  // Single/Double tap references
  const lastCardTap = useRef<number>(0);
  const tapTimeout = useRef<any>(null);
  const lastDetailCardTap = useRef<number>(0);
  const storyPressStartTime = useRef<number>(0);

  // Confession Reporting States
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportConfession, setSelectedReportConfession] = useState<any | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [activeDoubleTapId, setActiveDoubleTapId] = useState<string | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const reportReasons = [
    "Inappropriate content/photos",
    "Harassment or abusive behavior",
    "Fake profile / Impersonation",
    "Spam, scam, or commercial",
    "Underage user",
    "Other"
  ];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Story transitions and sorting
  const storyFadeAnim = useRef(new Animated.Value(1)).current;
  const storySlideAnim = useRef(new Animated.Value(0)).current;

  const triggerUserTransition = () => {
    storySlideAnim.setValue(80);
    storyFadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(storySlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(storyFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  };

  const sortStoriesList = (storyGroups: any[], currentUserId?: string) => {
    if (!Array.isArray(storyGroups)) return [];
    const myGroup = storyGroups.find(g => g.user_id === currentUserId);
    const otherGroups = storyGroups.filter(g => g.user_id !== currentUserId);

    otherGroups.sort((a, b) => {
      const aUnviewed = a.has_unviewed ? 1 : 0;
      const bUnviewed = b.has_unviewed ? 1 : 0;
      if (aUnviewed !== bUnviewed) {
        return bUnviewed - aUnviewed;
      }

      const aLatestTime = a.stories && a.stories.length > 0
        ? Math.max(...a.stories.map((st: any) => new Date(st.createdAt || st.created_at || 0).getTime()))
        : 0;
      const bLatestTime = b.stories && b.stories.length > 0
        ? Math.max(...b.stories.map((st: any) => new Date(st.createdAt || st.created_at || 0).getTime()))
        : 0;
      return bLatestTime - aLatestTime;
    });

    return myGroup ? [myGroup, ...otherGroups] : otherGroups;
  };

  // Confessions Filters States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFeedScope, setTempFeedScope] = useState<'college' | 'global'>('college');
  const [tempSortBy, setTempSortBy] = useState<'latest' | 'engagement'>('latest');
  const [appliedFeedScope, setAppliedFeedScope] = useState<'college' | 'global'>('college');
  const [appliedSortBy, setAppliedSortBy] = useState<'latest' | 'engagement'>('latest');

  // Custom Options Modal State
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedOptionsConfession, setSelectedOptionsConfession] = useState<any | null>(null);

  // Custom Sharing Modal State
  const [sharingConfession, setSharingConfession] = useState<any | null>(null);
  const [shareChats, setShareChats] = useState<any[]>([]);
  const [loadingShareChats, setLoadingShareChats] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [sendingToUserId, setSendingToUserId] = useState<{ [key: string]: boolean }>({});
  const [sentToUserId, setSentToUserId] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (showAudienceModal) {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [showAudienceModal]);

  const closeAudienceModal = (callback?: () => void, clearImage = true) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowAudienceModal(false);
      if (clearImage) {
        setStoryImage(null);
      }
      if (callback) callback();
    });
  };

  // New states for Story Viewer Flow
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeStoryUserIndex, setActiveStoryUserIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  useEffect(() => {
    if (!showStoryModal) {
      setIsStoryPaused(false);
    }
  }, [showStoryModal]);

  // Reddit Comments Thread states
  const [selectedConfession, setSelectedConfession] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    fetchAll();
    if (user?.college_id && sessionToken !== 'dummy_token') {
      fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user.college_id}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.college) {
            setCollege(data.college);
          }
        })
        .catch(e => console.error('Error fetching college:', e));
    } else if (sessionToken === 'dummy_token') {
      setCollege({
        college_id: 'col_stephens',
        name: "St. Stephen's College",
        short_name: "Stephens"
      });
    }
  }, [user?.college_id]);

  // Connect to socket.io on confessions screen for real-time stories
  useEffect(() => {
    if (sessionToken && sessionToken !== 'dummy_token') {
      console.log('[Socket Stories] Connecting to socket.io...');
      const socket = io(EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000', {
        transports: ['websocket'],
        forceNew: true
      });

      socket.on('connect', () => {
        console.log('[Socket Stories] Connected, joining room:', user?.user_id);
        socket.emit('join_room', user?.user_id);
      });

      socket.on('new_story', (data: any) => {
        console.log('[Socket Stories] Received new story:', data);
        // If it's a story from another user, append to stories feed
        if (data.user_id !== user?.user_id) {
          setStories(prev => {
            const updated = [...prev];
            const existingUserIdx = updated.findIndex(u => u.user_id === data.user_id);
            const newStoryItem = {
              story_id: data.story_id,
              image: data.image,
              caption: data.caption,
              audience: data.audience,
              views: data.views,
              createdAt: data.createdAt
            };

            if (existingUserIdx > -1) {
              // Prevent duplicates
              if (updated[existingUserIdx].stories.some((st: any) => st.story_id === data.story_id)) {
                return prev;
              }
              updated[existingUserIdx] = {
                ...updated[existingUserIdx],
                has_unviewed: true,
                stories: [...(updated[existingUserIdx].stories || []), newStoryItem]
              };
            } else {
              updated.push({
                user_id: data.user_id,
                user_name: data.user_name,
                user_picture: data.user_picture,
                has_unviewed: true,
                stories: [newStoryItem]
              });
            }
            return sortStoriesList(updated, user?.user_id);
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('[Socket Stories] Disconnected');
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [sessionToken, user]);

  const fetchAll = async () => {
    if (sessionToken === 'dummy_token') {
      setConfessions(MOCK_CONFESSIONS);
      setStories(sortStoriesList(MOCK_STORIES, user?.user_id));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${sessionToken}` };
      const [c, s, liveCountsRes, notifsRes] = await Promise.all([
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/live-count`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/notifications`, { headers }).then(r => r.json()),
      ]);

      if (c.confessions) {
        setConfessions(c.confessions);
      } else {
        setConfessions(MOCK_CONFESSIONS);
      }

      if (s.users_with_stories) {
        setStories(sortStoriesList(s.users_with_stories, user?.user_id));
      } else {
        setStories(sortStoriesList(MOCK_STORIES, user?.user_id));
      }

      if (liveCountsRes) {
        setLiveCountGlobal(liveCountsRes.global || 0);
        setLiveCountCollege(liveCountsRes.college || 0);
      }

      if (notifsRes && notifsRes.notifications) {
        setNotifications(notifsRes.notifications);
      }
    } catch (e) {
      console.warn('fetchLive failed, using mock live data instead:', e);
      setConfessions(MOCK_CONFESSIONS);
      setStories(sortStoriesList(MOCK_STORIES, user?.user_id));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    if (sessionToken === 'dummy_token') return;
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
    } catch (e) {
      console.warn('[handleMarkNotifRead Error]:', e);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
    if (sessionToken === 'dummy_token') return;
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
    } catch (e) {
      console.warn('[handleDeleteNotif Error]:', e);
    }
  };

  const handleNotificationClick = async (item: any) => {
    // 1. Close notifications modal
    setShowNotificationsModal(false);

    // 2. Mark as read
    if (!item.is_read) {
      handleMarkNotifRead(item.notification_id);
    }

    // 3. Navigate/Select confession
    const localConf = confessions.find((c: any) => c.confession_id === item.confession_id);
    if (localConf) {
      openComments(localConf);
    } else {
      if (sessionToken === 'dummy_token') {
        Alert.alert('Not Found', 'Mock mode: this confession is not loaded in feed.');
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${item.confession_id}`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (!res.ok) throw new Error('Confession not found');
        const data = await res.json();
        if (data.confession) {
          openComments(data.confession);
        } else {
          Alert.alert('Not Found', 'This confession has been deleted or is no longer available.');
        }
      } catch (error) {
        console.warn('Failed to fetch confession details for notification:', error);
        Alert.alert('Not Found', 'This confession is no longer available.');
      } finally {
        setLoading(false);
      }
    }
  };

  const openShareModal = async (confession: any) => {
    setSharingConfession(confession);
    setShareSearchQuery('');
    setSentToUserId({});
    setSendingToUserId({});
    setLoadingShareChats(true);
    setShareChats([]);

    if (sessionToken === 'dummy_token') {
      const mockChats = [
        {
          user: {
            user_id: 'usr_mock1',
            name: 'Aishwarya Sen',
            picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
          }
        },
        {
          user: {
            user_id: 'usr_mock2',
            name: 'Kabir Malhotra',
            picture: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200'
          }
        },
        {
          user: {
            user_id: 'usr_mock3',
            name: 'Pooja Sharma',
            picture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200'
          }
        }
      ];
      setShareChats(mockChats);
      setLoadingShareChats(false);
      return;
    }

    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShareChats(data.conversations || []);
      }
    } catch (error) {
      console.warn('Failed to load sharing conversations:', error);
    } finally {
      setLoadingShareChats(false);
    }
  };

  const handleSendDM = async (partnerUserId: string) => {
    if (!sharingConfession) return;
    setSendingToUserId(prev => ({ ...prev, [partnerUserId]: true }));
    try {
      const textToSend = `Check out this confession:\n"${sharingConfession.content}"\n\nSee it here: https://offcampus.in/confessions/${sharingConfession.confession_id}`;
      
      if (sessionToken === 'dummy_token') {
        await new Promise(resolve => setTimeout(resolve, 600));
        setSentToUserId(prev => ({ ...prev, [partnerUserId]: true }));
        return;
      }

      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          to_user_id: partnerUserId,
          content: textToSend,
          message_type: 'text'
        })
      });
      if (res.ok) {
        setSentToUserId(prev => ({ ...prev, [partnerUserId]: true }));
      } else {
        Alert.alert('Error', 'Failed to send confession in chat.');
      }
    } catch (err) {
      console.warn('handleSendDM error:', err);
      Alert.alert('Error', 'Failed to connect to server.');
    } finally {
      setSendingToUserId(prev => ({ ...prev, [partnerUserId]: false }));
    }
  };

  const handleShareLink = async () => {
    if (!sharingConfession) return;
    try {
      const shareUrl = `https://offcampus.in/confessions/${sharingConfession.confession_id}`;
      await Share.share({
        message: `Check out this confession on Off-Campus: "${sharingConfession.content}"\n\nRead more at: ${shareUrl}`,
        url: shareUrl,
        title: 'Share Confession'
      });
    } catch (error) {
      console.warn('Native Share Error:', error);
    }
  };

  const post = async () => {
    if (!text.trim() && !confessionImage) return;
    setPosting(true);

    if (sessionToken === 'dummy_token') {
      const newConf = {
        confession_id: `conf_mock_${Date.now()}`,
        content: text.trim(),
        likes: 0,
        comments: 0,
        image: confessionImage ? `data:image/jpeg;base64,${confessionImage}` : null,
        created_at: new Date().toISOString(),
        college_id: feedType === 'college' ? user?.college_id : null
      };
      setConfessions(prev => [newConf, ...prev]);
      setText('');
      setConfessionImage(null);
      setPosting(false);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          content: text,
          college_id: feedType === 'college' ? user?.college_id : null,
          image: confessionImage
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to post confession' }));
        Alert.alert('Error', errorData.detail || 'Failed to post confession');
        setPosting(false);
        return;
      }
      setText('');
      setConfessionImage(null);
      await fetchAll();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Network Error', e.message || 'Could not connect to server');
    } finally {
      setPosting(false);
    }
  };

  const likeC = async (id: string, playAnimation: boolean = false) => {
    if (sessionToken === 'dummy_token') {
      let isLiking = false;
      setConfessions(prev => prev.map(c => {
        if (c.confession_id === id) {
          const alreadyLiked = c.has_liked;
          isLiking = !alreadyLiked;
          return {
            ...c,
            likes: alreadyLiked ? Math.max(0, (c.likes || 0) - 1) : (c.likes || 0) + 1,
            has_liked: !alreadyLiked
          };
        }
        return c;
      }));

      setSelectedConfession((prev: any) => {
        if (prev && prev.confession_id === id) {
          const alreadyLiked = prev.has_liked;
          isLiking = !alreadyLiked;
          return {
            ...prev,
            likes: alreadyLiked ? Math.max(0, (prev.likes || 0) - 1) : (prev.likes || 0) + 1,
            has_liked: !alreadyLiked
          };
        }
        return prev;
      });

      if (playAnimation && isLiking) {
        triggerHeartAnimation(id);
      }
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setConfessions(prev => prev.map(c =>
          c.confession_id === id ? { ...c, likes: data.likes, has_liked: data.liked } : c
        ));
        setSelectedConfession((prev: any) =>
          prev && prev.confession_id === id ? { ...prev, likes: data.likes, has_liked: data.liked } : prev
        );

        if (playAnimation && data.liked) {
          triggerHeartAnimation(id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerHeartAnimation = (id: string) => {
    setActiveDoubleTapId(id);
    heartScale.setValue(0.3);
    heartOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.2,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      Animated.parallel([
        Animated.timing(heartScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start(() => {
        setActiveDoubleTapId(null);
      });
    });
  };

  // Image Picking Handlers
  const handleCameraLaunch = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showSimulatorModeAlert('Camera permission denied or not granted.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
      });
      if (result.canceled) return;
      if (result.assets && result.assets[0].base64) {
        setStoryImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        setShowPickModal(false);
        setTimeout(() => {
          setShowAudienceModal(true);
        }, 800);
      } else {
        showSimulatorModeAlert('Could not read camera photo data.');
      }
    } catch (e) {
      console.warn('launchCameraAsync failed:', e);
      showSimulatorModeAlert('Camera is not available on this device/simulator.');
    }
  };

  const handleGalleryLaunch = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showSimulatorModeAlert('Gallery permission denied or not granted.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
      });
      if (result.canceled) return;
      if (result.assets && result.assets[0].base64) {
        setStoryImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        setShowPickModal(false);
        setTimeout(() => {
          setShowAudienceModal(true);
        }, 800);
      } else {
        showSimulatorModeAlert('Could not read gallery photo data.');
      }
    } catch (e) {
      console.warn('launchImageLibraryAsync failed:', e);
      showSimulatorModeAlert('Gallery is not available on this device/simulator.');
    }
  };

  const showSimulatorModeAlert = (message: string) => {
    Alert.alert(
      'Simulator Mode 📸',
      `${message} Would you like to use a mock student story photo instead for testing?`,
      [
        {
          text: 'Use Mock Photo',
          onPress: () => {
            // High quality portrait photo of student life
            setStoryImage('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop');
            setShowPickModal(false);
            setTimeout(() => {
              setShowAudienceModal(true);
            }, 800);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Story Posting Handlers
  const handlePostStory = async (audience: 'matches' | 'college' | 'global') => {

    if (!storyImage) {
      Alert.alert('Error', 'No image selected to post');
      return;
    }

    if (audience === 'global' && !user?.is_premium) {
      closeAudienceModal(() => {
        setShowBuyPremiumPopup(true);
      }, false);
      return;
    }

    setPosting(true);
    try {
      if (sessionToken === 'dummy_token') {
        const newStory = {
          story_id: `story_mock_${Date.now()}`,
          user_id: user?.user_id || 'user_dummy',
          user_name: user?.name || 'Dummy Student',
          user_picture: user?.picture || user?.photos?.[0] || null,
          college_id: user?.college_id || 'col_stephens',
          image: storyImage,
          caption: null,
          audience,
          views: [],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        setStories(prev => {
          const existingUserIdx = prev.findIndex(u => u.user_id === newStory.user_id);
          let updated;
          if (existingUserIdx >= 0) {
            updated = [...prev];
            updated[existingUserIdx] = {
              ...updated[existingUserIdx],
              has_unviewed: true,
              stories: [...(updated[existingUserIdx].stories || []), newStory]
            };
          } else {
            updated = [
              {
                user_id: newStory.user_id,
                user_name: newStory.user_name,
                user_picture: newStory.user_picture,
                has_unviewed: true,
                stories: [newStory]
              },
              ...prev
            ];
          }
          return sortStoriesList(updated, user?.user_id);
        });

        Alert.alert('Story posted!', 'Your story will be live for 24 hours');
        closeAudienceModal();
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ image: storyImage, audience }),
      });

      if (response.status === 403) {
        const errData = await response.json();
        if (errData.error === 'premium_required') {
          closeAudienceModal(() => {
            setShowBuyPremiumPopup(true);
          }, false);
          return;
        }
      }

      if (!response.ok) throw new Error('Failed to post story');
      Alert.alert('Story posted!', 'Your story will be live for 24 hours');
      closeAudienceModal(async () => {
        await fetchAll();
      });
    } catch (e) {
      console.error(e);
      closeAudienceModal();
      Alert.alert('Error', 'Failed to upload story');
    } finally {
      setPosting(false);
    }
  };

  // Story Viewer Navigation Logic
  const activeUserWithStories = stories[activeStoryUserIndex];
  const activeStory = activeUserWithStories?.stories?.[activeStoryIndex];
  const isOwnStory = activeUserWithStories?.user_id === user?.user_id;

  const registerStoryView = async (storyId: string) => {
    if (sessionToken === 'dummy_token') return;
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
    } catch (e) {
      console.error('Failed to view story:', e);
    }
  };

  useEffect(() => {
    if (showStoryModal && activeStory && !isOwnStory) {
      registerStoryView(activeStory.story_id);
    }
  }, [showStoryModal, activeStoryUserIndex, activeStoryIndex]);

  // Story Progression Loop
  useEffect(() => {
    if (!showStoryModal || showViewersSheet || isStoryPaused) return;

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          goNextStory();
          return 0;
        }
        return prev + 0.01; // Increment progress (10 seconds duration total)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showStoryModal, activeStoryUserIndex, activeStoryIndex, showViewersSheet, isStoryPaused]);

  const goNextStory = () => {
    setStoryProgress(0);
    if (activeStoryIndex < activeUserWithStories.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeStoryUserIndex < stories.length - 1) {
      triggerUserTransition();
      setActiveStoryUserIndex(prev => prev + 1);
      setActiveStoryIndex(0);
    } else {
      setShowStoryModal(false);
    }
  };

  const goPrevStory = () => {
    setStoryProgress(0);
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(prev => prev - 1);
    } else if (activeStoryUserIndex > 0) {
      triggerUserTransition();
      setActiveStoryUserIndex(prev => prev - 1);
      const prevUser = stories[activeStoryUserIndex - 1];
      setActiveStoryIndex(prevUser.stories.length - 1);
    } else {
      // Restart current story
      setStoryProgress(0);
    }
  };

  const openStoryViewer = (userIndex: number) => {
    triggerUserTransition();
    setActiveStoryUserIndex(userIndex);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setShowViewersSheet(false);
    setShowStoryModal(true);
  };

  const handleDeleteStory = () => {
    if (!activeStory) return;

    Alert.alert(
      'Delete Story?',
      'Are you sure you want to delete this story? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (sessionToken && sessionToken !== 'dummy_token') {
                const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/${activeStory.story_id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${sessionToken}` }
                });
                if (!response.ok) {
                  Alert.alert('Error', 'Failed to delete story.');
                  return;
                }
              }

              setShowStoryModal(false);
              fetchAll();
              Alert.alert('Deleted', 'Your story has been deleted successfully.');
            } catch (e) {
              console.error('Error deleting story:', e);
              Alert.alert('Error', 'Failed to delete story.');
            }
          }
        }
      ]
    );
  };

  const formatViewTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  const handleUserProfileClick = (targetUserId?: string, targetIsMatch?: boolean) => {
    if (!targetUserId) return;
    if (targetUserId === user?.user_id) {
      router.push('/(tabs)/profile');
      return;
    }

    closeComments();
    setShowViewersSheet(false);
    setShowStoryModal(false);

    if (targetIsMatch) {
      router.push(`/chat/${targetUserId}`);
    } else {
      router.push(`/(tabs)/discover?targetUserId=${targetUserId}`);
    }
  };

  const handleViewerClick = (viewer: any) => {
    if (!viewer || !viewer.user_id) return;

    setShowViewersSheet(false);
    setShowStoryModal(false);

    if (viewer.is_match) {
      router.push(`/chat/${viewer.user_id}`);
    } else {
      router.push(`/(tabs)/discover?targetUserId=${viewer.user_id}`);
    }
  };

  const closeComments = () => {
    setSelectedConfession(null);
    router.setParams({ id: '' });
  };

  const openComments = async (confession: any) => {
    setSelectedConfession(confession);
    setReplyingTo(null);
    setCommentText('');
    setComments([]);

    if (sessionToken === 'dummy_token') {
      const mockComments = [
        {
          comment_id: 'cmt_1',
          confession_id: confession.confession_id,
          content: "Same here... I have read zero chapters for psychology.",
          parent_id: null,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          college_name: 'LSR'
        },
        {
          comment_id: 'cmt_2',
          confession_id: confession.confession_id,
          content: "Wait, isn't exam cancelled? 😮",
          parent_id: 'cmt_1',
          created_at: new Date(Date.now() - 900000).toISOString(),
          college_name: 'Stephens'
        }
      ];
      setComments(mockComments);
      setLoadingComments(false);
      return;
    }

    setLoadingComments(true);

    try {
      const headers = { 'Authorization': `Bearer ${sessionToken}` };
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${confession.confession_id}/comments`, { headers });
      const data = await response.json();
      setComments(data.comments || []);
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCardPress = (c: any) => {
    const now = Date.now();
    const isDouble = now - lastCardTap.current < 300;
    lastCardTap.current = now;

    if (isDouble) {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      likeC(c.confession_id, true);
    } else {
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
      tapTimeout.current = setTimeout(() => {
        openComments(c);
      }, 250);
    }
  };

  const handleDetailCardPress = (c: any) => {
    const now = Date.now();
    if (now - lastDetailCardTap.current < 300) {
      likeC(c.confession_id, true);
    }
    lastDetailCardTap.current = now;
  };

  const handleShare = async (confession: any) => {
    try {
      const shareUrl = `https://offcampus.app/confessions?id=${confession.confession_id}`;
      const message = `Check out this confession on Off-Campus: "${confession.content.substring(0, 120)}..."\n\nRead here: ${shareUrl}`;
      await Share.share({
        message,
        url: shareUrl,
        title: 'Share Confession'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const { id } = useLocalSearchParams();

  useEffect(() => {
    const handleDeepLink = async () => {
      if (!id) return;
      const targetId = Array.isArray(id) ? id[0] : id;

      // If already opened, do nothing
      if (selectedConfession?.confession_id === targetId) return;

      // 1. Try to find in the local confessions list first
      const match = confessions.find((c: any) => c.confession_id === targetId);
      if (match) {
        openComments(match);
        return;
      }

      // 2. If not found locally, fetch it from the backend
      if (sessionToken && sessionToken !== 'dummy_token') {
        try {
          const headers = { 'Authorization': `Bearer ${sessionToken}` };
          const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${targetId}`, { headers });
          if (response.ok) {
            const data = await response.json();
            if (data.confession) {
              openComments(data.confession);
            }
          } else {
            console.warn('Failed to fetch deep-linked confession, status:', response.status);
          }
        } catch (e) {
          console.error('Error fetching deep-linked confession:', e);
        }
      }
    };

    handleDeepLink();
  }, [id, confessions, sessionToken, selectedConfession?.confession_id]);

  const openOptions = (confession: any) => {
    setSelectedOptionsConfession(confession);
    setShowOptionsModal(true);
  };

  const handleReportSubmit = async () => {
    if (!selectedReason && !customReason.trim()) {
      Alert.alert('Reason Required', 'Please select or enter a reason for your report.');
      return;
    }
    if (!selectedReportConfession) return;

    setSubmittingReport(true);
    const finalReason = selectedReason ? `${selectedReason}. ${customReason.trim()}` : customReason.trim();

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          confession_id: selectedReportConfession.confession_id,
          target_user_id: selectedReportConfession.user_id,
          reason: finalReason
        })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert(
          'Report Submitted 🛡️',
          'Thank you for reporting. Our safety team will review this confession within 24 hours. The poster\'s vibe score has been penalized.'
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to submit report.');
      }
    } catch (err: any) {
      console.error('Report error:', err);
      Alert.alert('Network Error', 'Could not submit report. Please check connection.');
    } finally {
      setSubmittingReport(false);
      setShowReportModal(false);
      setSelectedReportConfession(null);
    }
  };

  const handleScopeChange = (scope: 'college' | 'global') => {
    setTempFeedScope(scope);
    if (scope === 'college') {
      setTempSortBy('latest');
    } else {
      setTempSortBy('engagement');
    }
  };

  const postComment = async () => {
    if (!commentText.trim() || !selectedConfession) return;
    setPostingComment(true);

    if (sessionToken === 'dummy_token') {
      const newComment = {
        comment_id: `cmt_mock_${Date.now()}`,
        confession_id: selectedConfession.confession_id,
        content: commentText.trim(),
        created_at: new Date().toISOString(),
        college_name: college?.short_name || 'My Campus',
        parent_id: replyingTo ? replyingTo.comment_id : null
      };
      setComments(prev => [...prev, newComment]);
      setConfessions(prev => prev.map(c =>
        c.confession_id === selectedConfession.confession_id
          ? { ...c, comments: (c.comments || 0) + 1 }
          : c
      ));
      setSelectedConfession((prev: any) => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);
      setCommentText('');
      setReplyingTo(null);
      setPostingComment(false);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${selectedConfession.confession_id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({
          content: commentText,
          parent_id: replyingTo ? replyingTo.comment_id : null
        })
      });
      const data = await response.json();
      if (response.ok && data.comment) {
        // Refresh comments list
        const updatedResponse = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${selectedConfession.confession_id}/comments`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        const updatedData = await updatedResponse.json();
        setComments(updatedData.comments || []);

        // Increment count in feed list
        setConfessions(prev => prev.map(c =>
          c.confession_id === selectedConfession.confession_id
            ? { ...c, comments: (c.comments || 0) + 1 }
            : c
        ));
        // Increment count in active confession modal
        setSelectedConfession((prev: any) => prev ? { ...prev, comments: (prev.comments || 0) + 1 } : null);

        setCommentText('');
        setReplyingTo(null);
      } else {
        Alert.alert('Error', data.detail || 'Failed to add comment');
      }
    } catch (e) {
      console.error('Error posting comment:', e);
      Alert.alert('Error', 'Network error while posting comment');
    } finally {
      setPostingComment(false);
    }
  };

  const buildCommentTree = (flatComments: any[]) => {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    flatComments.forEach(c => {
      map[c.comment_id] = { ...c, replies: [] };
    });

    flatComments.forEach(c => {
      const mapped = map[c.comment_id];
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(mapped);
      } else {
        roots.push(mapped);
      }
    });

    return roots;
  };

  const renderCommentNode = (node: any, depth: number = 0) => {
    return (
      <View key={node.comment_id} style={styles.commentNodeContainer}>
        <View style={styles.commentTop}>
          <TouchableOpacity
            style={styles.commentAuthorRow}
            onPress={() => handleUserProfileClick(node.user_id, node.is_match)}
            activeOpacity={0.7}
          >
            <View style={styles.commentAvatarCircle}>
              {node.user_picture ? (
                <Image source={{ uri: node.user_picture }} style={styles.commentAvatarImage} />
              ) : (
                <Ionicons name="person-circle" size={18} color="rgba(255,255,255,0.4)" />
              )}
            </View>
            <Text style={styles.commentAnon}>{node.user_name || 'Campus Voice'} • {node.college_name || 'Campus'}</Text>
          </TouchableOpacity>
          <Text style={styles.commentTime}>
            {node.created_at && formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}
          </Text>
        </View>

        <View style={styles.commentBodyRow}>
          <Text style={styles.commentText}>{node.content}</Text>
        </View>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentReplyBtn}
            onPress={() => setReplyingTo(node)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo-outline" size={14} color="#C2FF3D" />
            <Text style={styles.commentReplyText}>Reply</Text>
          </TouchableOpacity>
        </View>

        {node.replies && node.replies.length > 0 && (
          <View style={styles.nestedRepliesContainer}>
            {node.replies.map((reply: any) => renderCommentNode(reply, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF1B6B" /></View>;

  const filteredConfessions = confessions.filter((c: any) => {
    if (appliedFeedScope === 'college') {
      return c.college_id === user?.college_id;
    }
    return true;
  }).sort((a: any, b: any) => {
    if (appliedSortBy === 'latest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      const aEngagement = (a.likes || 0) + (a.comments || 0);
      const bEngagement = (b.likes || 0) + (b.comments || 0);
      return bEngagement - aEngagement;
    }
  });

  let myUserPicture = user?.picture;
  if (user?.photos) {
    try {
      const photos = typeof user.photos === 'string' ? JSON.parse(user.photos) : user.photos;
      if (Array.isArray(photos) && photos.length > 0) {
        myUserPicture = photos[0];
      }
    } catch (e) {}
  }

  const myStoryIndex = stories.findIndex((s: any) => s.user_id === user?.user_id);
  const hasMyStory = myStoryIndex !== -1;

  return (
    <View style={styles.container}>
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(); }}
              tintColor="#FF1B6B"
            />
          }
        >
          {/* Redesigned Premium Header Bar */}
          <View style={styles.newHeaderBar}>
            <View style={styles.newHeaderLeft}>
              <TouchableOpacity
                style={styles.newHeaderDropdown}
                onPress={() => {
                  const newScope = appliedFeedScope === 'global' ? 'college' : 'global';
                  setAppliedFeedScope(newScope);
                  setAppliedSortBy(newScope === 'college' ? 'latest' : 'engagement');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.newHeaderTitle} numberOfLines={1}>
                  {appliedFeedScope === 'global' ? 'Global Live' : (college?.short_name || college?.name || 'My Campus')}
                </Text>
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              {/* Inline Live Indicator */}
              <View style={[styles.newLiveBadge, { marginLeft: 8 }]}>
                <View style={styles.newLiveDot} />
                <Text style={styles.newLiveText}>
                  {appliedFeedScope === 'global' ? `${liveCountGlobal} Live` : `${liveCountCollege} Live`}
                </Text>
              </View>
            </View>

            <View style={styles.newHeaderRight}>
              <TouchableOpacity 
                style={styles.bellBtn} 
                onPress={() => setShowNotificationsModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={22} color="#FFF" />
                {unreadNotifCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Image
                source={require('../../assets/images/logo_off.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Stories List */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
            {/* Create / View Your Story Button */}
            {hasMyStory ? (
              <TouchableOpacity style={styles.storyItem} onPress={() => openStoryViewer(myStoryIndex)}>
                <View style={{ position: 'relative' }}>
                  <LinearGradient
                    colors={['#71717A', '#71717A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyRing}
                  >
                    <View style={styles.storyInner}>
                      {myUserPicture ? (
                        <Image source={{ uri: myUserPicture }} style={styles.storyImg} />
                      ) : (
                        <View style={[styles.storyImg, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 24 }}>{user?.name?.[0] || 'Y'}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
                <Text style={styles.storyName}>Your Story</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.storyItem} onPress={() => setShowPickModal(true)}>
                <View style={{ position: 'relative' }}>
                  <View style={styles.addStoryCircle}>
                    {myUserPicture ? (
                      <Image source={{ uri: myUserPicture }} style={styles.storyImg} />
                    ) : (
                      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderRadius: 28 }}>
                        <Ionicons name="camera" size={24} color="#FF1B6B" />
                      </View>
                    )}
                  </View>
                  <View style={styles.addPlus}><Ionicons name="add" size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.storyName}>Your Story</Text>
              </TouchableOpacity>
            )}

            {/* Display Active Stories (excluding myself) */}
            {stories
              .map((s: any, originalIndex: number) => ({ ...s, originalIndex }))
              .filter((s: any) => s.user_id !== user?.user_id)
              .map((s: any) => (
                <TouchableOpacity key={s.user_id} style={styles.storyItem} onPress={() => openStoryViewer(s.originalIndex)}>
                  <View style={{ position: 'relative' }}>
                    <LinearGradient
                      colors={s.has_unviewed ? ['#C2FF3D', '#FF1B6B'] : ['#71717A', '#71717A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.storyRing}
                    >
                      <View style={styles.storyInner}>
                        {s.user_picture ? (
                          <Image source={{ uri: s.user_picture }} style={styles.storyImg} />
                        ) : (
                          <View style={[styles.storyImg, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 24 }}>{s.user_name?.[0]}</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                    {/* Green Online Dot */}
                    <View style={styles.storyOnlineDot} />
                  </View>
                  <Text style={styles.storyName} numberOfLines={1}>
                    {s.user_name?.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          {/* Confessions Title */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionT}>Live Confessions</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => {
                setTempFeedScope(appliedFeedScope);
                setTempSortBy(appliedSortBy);
                setShowFilterModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="filter" size={18} color="#C2FF3D" />
              {(appliedFeedScope !== 'college' || appliedSortBy !== 'latest') && (
                <View style={styles.filterActiveDot} />
              )}
            </TouchableOpacity>
          </View>

          {/* Confession Composer matching Events page Search bar */}
          {/* Confession Composer Card */}
          <BlurView intensity={25} tint="dark" style={styles.premiumComposerCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)']}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Image Preview Container (Inside the card) */}
            {confessionImage && (
              <View style={styles.composerImagePreviewWrapper}>
                <Image source={{ uri: `data:image/jpeg;base64,${confessionImage}` }} style={styles.composerImagePreviewNew} />
                <BlurView intensity={40} tint="dark" style={styles.imageCloseBlur}>
                  <TouchableOpacity style={styles.composerImageCloseBtnNew} onPress={() => setConfessionImage(null)}>
                    <Ionicons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </BlurView>
              </View>
            )}

            {/* TextInput Area */}
            <TextInput
              style={styles.composerTextInputNew}
              placeholder="Drop an anonymous confession... What's on your mind?"
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              value={text}
              onChangeText={setText}
              maxLength={300}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Bottom Action & Status Bar */}
            <View style={styles.composerActionBarNew}>
              {/* Left side actions */}
              <TouchableOpacity onPress={selectConfImage} style={styles.composerImageSelectBtnNew} activeOpacity={0.7}>
                <Ionicons name="image" size={18} color={confessionImage ? '#C2FF3D' : '#FFF'} />
                <Text style={[styles.composerImageSelectText, { color: confessionImage ? '#C2FF3D' : 'rgba(255, 255, 255, 0.6)' }]}>
                  {confessionImage ? 'Photo Added' : 'Add Photo'}
                </Text>
              </TouchableOpacity>

              {/* Right side status & send */}
              <View style={styles.composerRightActions}>
                <Text style={styles.charCountText}>{text.length}/300</Text>

                <TouchableOpacity
                  onPress={post}
                  disabled={!text.trim() && !confessionImage || posting}
                  activeOpacity={0.7}
                  style={[
                    styles.composerSendBtnNew,
                    (!text.trim() && !confessionImage) && styles.composerSendBtnDisabledNew
                  ]}
                >
                  {posting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <LinearGradient
                      colors={['#C2FF3D', '#A4E020']}
                      style={styles.sendBtnGradNew}
                    >
                      <Ionicons name="send" size={14} color="#000" />
                      <Text style={styles.sendBtnTextNew}>Post</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>

          {/* Confessions List (Simplified 100% width layout with divider line) */}
          <View style={styles.gridContainer}>
            {filteredConfessions.map((c: any) => {
              return (
                <TouchableOpacity
                  key={c.confession_id}
                  style={styles.simpleConfessionContainer}
                  onPress={() => handleCardPress(c)}
                  activeOpacity={0.9}
                >
                  {/* Header Row */}
                  <View style={styles.simpleHeaderRow}>
                    <TouchableOpacity
                      style={styles.simpleHeaderLeft}
                      onPress={(e) => { e.stopPropagation(); handleUserProfileClick(c.user_id, c.is_match); }}
                      activeOpacity={0.7}
                    >
                      {c.user_picture ? (
                        <Image source={{ uri: c.user_picture }} style={styles.simpleAvatar} />
                      ) : (
                        <View style={styles.simpleAvatarPlaceholder}>
                          <Ionicons name="eye-off" size={16} color="#C2FF3D" />
                        </View>
                      )}
                      <View style={styles.simpleHeaderText}>
                        <Text style={styles.simpleAuthorName}>{c.user_name || 'Campus Voice'}</Text>
                        <Text style={styles.simpleCollegeName}>@{c.college_name?.toLowerCase() || 'campus'}</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.simpleHeaderRight}>
                      <Text style={styles.simpleTimeText}>
                        {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: false }).replace('about', '').trim() : 'now'}
                      </Text>
                      <TouchableOpacity style={styles.simpleDotsBtn} onPress={(e) => { e.stopPropagation(); openOptions(c); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.6)" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Content Body */}
                  <View style={styles.simpleBodyContainer}>
                    {/* Caption / Text first */}
                    {c.content ? (
                      <Text style={styles.simpleContentText}>{c.content}</Text>
                    ) : null}

                    {/* Photo attachment below text if it exists */}
                    {c.image ? (
                      <View style={styles.simpleImageWrapper}>
                        <Image source={{ uri: c.image }} style={styles.simpleAttachedImage} resizeMode="cover" />
                      </View>
                    ) : null}
                  </View>

                  {/* Simple Action Bar (Likes and Comments) */}
                  <View style={styles.simpleActionBar}>
                    <TouchableOpacity style={styles.simpleActionBtn} onPress={(e) => { e.stopPropagation(); likeC(c.confession_id); }}>
                      <Ionicons name="heart" size={18} color={c.has_liked ? "#FF3366" : "rgba(255, 255, 255, 0.4)"} />
                      <Text style={[styles.simpleActionText, { color: c.has_liked ? '#FF3366' : 'rgba(255, 255, 255, 0.4)' }]}>{c.likes || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.simpleActionBtn} onPress={(e) => { e.stopPropagation(); openComments(c); }}>
                      <Ionicons name="chatbubble" size={16} color="rgba(255, 255, 255, 0.4)" />
                      <Text style={styles.simpleActionText}>{c.comments || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.simpleActionBtn} onPress={(e) => { e.stopPropagation(); openShareModal(c); }}>
                      <Ionicons name="share-social-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                      <Text style={styles.simpleActionText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Double Tap Animation Overlay */}
                  {activeDoubleTapId === c.confession_id && (
                    <Animated.View style={[
                      styles.doubleTapHeartContainer,
                      {
                        transform: [{ scale: heartScale }],
                        opacity: heartOpacity
                      }
                    ]}>
                      <Ionicons name="heart" size={72} color="#FF3366" />
                    </Animated.View>
                  )}

                  {/* Stroke Divider Line */}
                  <View style={styles.simpleDivider} />
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* REDDIT STYLE COMMENTS THREAD MODAL */}
        <Modal
          visible={selectedConfession !== null}
          animationType="slide"
          onRequestClose={closeComments}
        >
          <SafeAreaView style={styles.commentsModalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              {/* Top-Left Dark Purple Glow Ball */}
              <View style={styles.glowBallContainer}>
                <LinearGradient
                  colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.8, y: 0.8 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>

              {/* Modal Header */}
              <View style={styles.commentsModalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={closeComments}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>Confession Thread</Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView
                style={styles.commentsScrollView}
                contentContainerStyle={styles.commentsContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {selectedConfession && (
                  <TouchableOpacity activeOpacity={1} onPress={() => handleDetailCardPress(selectedConfession)}>
                    <View style={styles.modalConfCard}>
                      <View style={styles.modalConfTop}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                          onPress={() => handleUserProfileClick(selectedConfession.user_id, selectedConfession.is_match)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.anonAvatarBadge}>
                            {selectedConfession.user_picture ? (
                              <Image source={{ uri: selectedConfession.user_picture }} style={styles.anonAvatarImage} />
                            ) : (
                              <Ionicons name="eye-off" size={14} color="#C2FF3D" />
                            )}
                          </View>
                          <View>
                            <Text style={styles.authorNameTextOnly}>
                              {selectedConfession.user_name || 'Campus Voice'}
                            </Text>
                            <Text style={styles.collegeNameTextOnly}>
                              @{selectedConfession.college_name?.toLowerCase() || 'campus'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={styles.modalConfTime}>
                            {selectedConfession.created_at && formatDistanceToNow(new Date(selectedConfession.created_at), { addSuffix: false })} ago
                          </Text>
                          <TouchableOpacity
                            style={styles.threeDotsBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              openOptions(selectedConfession);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="ellipsis-vertical" size={16} color="rgba(255,255,255,0.6)" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.modalMessageBubble}>
                        <Text style={styles.modalConfTxt}>{selectedConfession.content}</Text>
                        {selectedConfession.image && (
                          <View style={styles.modalConfImageWrapper}>
                            <Image source={{ uri: selectedConfession.image }} style={styles.modalConfImage} />
                          </View>
                        )}
                      </View>
                      <View style={styles.modalConfActions}>
                        <TouchableOpacity style={styles.modalConfAct} onPress={() => likeC(selectedConfession.confession_id)}>
                          <Ionicons name="heart" size={16} color={selectedConfession.has_liked ? "#FF2D55" : "#FFF"} />
                          <Text style={[styles.modalConfActT, { color: selectedConfession.has_liked ? "#FF2D55" : "rgba(255, 255, 255, 0.75)" }]}>{selectedConfession.likes || 0}</Text>
                        </TouchableOpacity>
                        <View style={styles.modalConfAct}>
                          <Ionicons name="chatbubble" size={14} color="#FFF" />
                          <Text style={styles.modalConfActT}>{selectedConfession.comments || 0}</Text>
                        </View>
                        <TouchableOpacity style={styles.modalConfAct} onPress={() => openShareModal(selectedConfession)}>
                          <Ionicons name="share-social" size={14} color="#FFF" />
                          <Text style={styles.modalConfActT}>Share</Text>
                        </TouchableOpacity>
                      </View>

                      {activeDoubleTapId === selectedConfession.confession_id && (
                        <Animated.View style={[
                          styles.doubleTapHeartContainer,
                          {
                            transform: [{ scale: heartScale }],
                            opacity: heartOpacity
                          }
                        ]}>
                          <Ionicons name="heart" size={72} color="#FF3366" />
                        </Animated.View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <Text style={styles.repliesTitleHeader}>Replies</Text>

                {loadingComments ? (
                  <ActivityIndicator color="#C2FF3D" size="large" style={{ marginTop: 20 }} />
                ) : comments.length === 0 ? (
                  <View style={styles.emptyCommentsBox}>
                    <Ionicons name="chatbubbles-outline" size={48} color="rgba(255,255,255,0.15)" />
                    <Text style={styles.emptyCommentsText}>Be the first to reply!</Text>
                  </View>
                ) : (
                  <View style={styles.commentsTreeBox}>
                    {buildCommentTree(comments).map(commentNode => renderCommentNode(commentNode, 0))}
                  </View>
                )}
              </ScrollView>

              {/* Input container at the bottom */}
              <View style={styles.commentInputWrapper}>
                {replyingTo && (
                  <View style={styles.replyingToHeader}>
                    <Text style={styles.replyingToText} numberOfLines={1}>
                      Replying to Anonymous: "{replyingTo.content}"
                    </Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                      <Ionicons name="close-circle" size={18} color="#ee4d4d" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentTextInput}
                    placeholder={replyingTo ? "Add a reply..." : "Add a comment..."}
                    placeholderTextColor="#6B5B7A"
                    value={commentText}
                    onChangeText={setCommentText}
                    maxLength={250}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.commentSendBtn, !commentText.trim() && styles.commentSendBtnDisabled]}
                    disabled={!commentText.trim() || postingComment}
                    onPress={postComment}
                  >
                    {postingComment ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <LinearGradient
                        colors={['#C2FF3D', '#C2FF3D']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sendGrad}
                      >
                        <Ionicons name="send" size={16} color="#000" />
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>

            {/* RENDER OPTIONS & REPORT MODALS INSIDE THREAD MODAL TO PREVENT IOS MULTI-MODAL CONFLICTS */}
            {/* REPORT POPUP MODAL (INNER) */}
            <Modal
              visible={showReportModal && selectedConfession !== null}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowReportModal(false)}
            >
              <View style={styles.reportModalOverlay}>
                <BlurView intensity={90} tint="dark" style={styles.reportModalContainer}>
                  <View style={styles.reportModalHeader}>
                    <Text style={styles.reportModalTitle}>Report Confession 🛡️</Text>
                    <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.reportModalCloseBtn}>
                      <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView contentContainerStyle={styles.reportModalContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.reportModalDesc}>
                      Help us keep Off-Campus safe. Tell us why you are reporting this confession. The author's vibe score will be penalized.
                    </Text>

                    <Text style={styles.reasonLabel}>SELECT A REASON</Text>
                    {reportReasons.map((reason) => {
                      const isSelected = selectedReason === reason;
                      return (
                        <TouchableOpacity
                          key={reason}
                          style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                          onPress={() => setSelectedReason(reason)}
                        >
                          <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                            {reason}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <Text style={styles.reasonLabel}>DETAILED DETAILS (OPTIONAL)</Text>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="Enter details here..."
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      multiline={true}
                      numberOfLines={4}
                      value={customReason}
                      onChangeText={setCustomReason}
                    />

                    <View style={styles.reportModalActions}>
                      <TouchableOpacity
                        style={styles.reportCancelBtn}
                        onPress={() => setShowReportModal(false)}
                      >
                        <Text style={styles.reportCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reportSubmitBtn, submittingReport && { opacity: 0.5 }]}
                        onPress={handleReportSubmit}
                        disabled={submittingReport}
                      >
                        {submittingReport ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <Text style={styles.reportSubmitBtnText}>Submit Report</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </BlurView>
              </View>
            </Modal>

            {/* CUSTOM OPTIONS MENU BOTTOM SHEET MODAL (INNER) */}
            <Modal
              visible={showOptionsModal && selectedConfession !== null}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowOptionsModal(false)}
            >
              <TouchableOpacity
                style={styles.optionsModalOverlay}
                activeOpacity={1}
                onPress={() => setShowOptionsModal(false)}
              >
                <BlurView intensity={90} tint="dark" style={styles.optionsModalContainer}>
                  <View style={styles.optionsHeader}>
                    <View style={styles.optionsHeaderBar} />
                    <Text style={styles.optionsTitle}>Confession Options </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.optionsItem, styles.optionsItemDanger]}
                    onPress={() => {
                      setShowOptionsModal(false);
                      if (selectedOptionsConfession) {
                        setSelectedReportConfession(selectedOptionsConfession);
                        setSelectedReason('');
                        setCustomReason('');
                        setShowReportModal(true);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="alert-circle-outline" size={20} color="#FF4B4B" />
                    <Text style={[styles.optionsItemText, styles.optionsItemTextDanger]}>Report Confession</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionsCancelBtn}
                    onPress={() => setShowOptionsModal(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionsCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </BlurView>
              </TouchableOpacity>
            </Modal>
          </SafeAreaView>
        </Modal>

        {/* MODAL 1: PICK IMAGE METHOD DIALOG */}
        <Modal transparent={true} visible={showPickModal} animationType="fade" onRequestClose={() => setShowPickModal(false)}>
          <TouchableOpacity style={styles.dialogBackdrop} activeOpacity={1} onPress={() => setShowPickModal(false)}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add to your Story </Text>
              <Text style={styles.dialogDesc}>Share a moment with campus mates, matches, or the global network.</Text>

              <TouchableOpacity
                style={styles.dialogOptBtn}
                onPress={() => {
                  setShowPickModal(false);
                  setTimeout(() => {
                    handleCameraLaunch();
                  }, 350);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.dialogOptIcon, { backgroundColor: 'rgba(255, 27, 107, 0.1)' }]}>
                  <Ionicons name="camera" size={22} color="#FF1B6B" />
                </View>
                <Text style={styles.dialogOptText}>Open Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogOptBtn}
                onPress={() => {
                  setShowPickModal(false);
                  setTimeout(() => {
                    handleGalleryLaunch();
                  }, 350);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.dialogOptIcon, { backgroundColor: 'rgba(6, 214, 160, 0.1)' }]}>
                  <Ionicons name="images" size={22} color="#06D6A0" />
                </View>
                <Text style={styles.dialogOptText}>Open Gallery</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL 1.5: PICK IMAGE FOR CONFESSION DIALOG */}
        <Modal transparent={true} visible={showConfessionPickModal} animationType="fade" onRequestClose={() => setShowConfessionPickModal(false)}>
          <TouchableOpacity style={styles.dialogBackdrop} activeOpacity={1} onPress={() => setShowConfessionPickModal(false)}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add Photo </Text>
              <Text style={styles.dialogDesc}>Select a photo to attach to your confession.</Text>

              <TouchableOpacity
                style={styles.dialogOptBtn}
                onPress={() => {
                  setShowConfessionPickModal(false);
                  setTimeout(() => {
                    launchConfessionCamera();
                  }, 350);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.dialogOptIcon, { backgroundColor: 'rgba(255, 27, 107, 0.1)' }]}>
                  <Ionicons name="camera" size={22} color="#FF1B6B" />
                </View>
                <Text style={styles.dialogOptText}>Open Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogOptBtn}
                onPress={() => {
                  setShowConfessionPickModal(false);
                  setTimeout(() => {
                    launchConfessionGallery();
                  }, 350);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.dialogOptIcon, { backgroundColor: 'rgba(6, 214, 160, 0.1)' }]}>
                  <Ionicons name="images" size={22} color="#06D6A0" />
                </View>
                <Text style={styles.dialogOptText}>Open Gallery</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL 2: STORY AUDIENCE PRIVACY SETTING */}
        <Modal transparent={true} visible={showAudienceModal} animationType="none" onRequestClose={() => closeAudienceModal()}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.75)', opacity: fadeAnim }]}>
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => closeAudienceModal()} />
            </Animated.View>
            <Animated.View style={[
              styles.audienceSheetContainer,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}>
              <BlurView intensity={45} tint="dark" style={styles.audienceSheet}>
                <View style={styles.dragHandle} />
                <Text style={styles.sheetTitle}>Choose Story Audience 🔒</Text>
                <Text style={styles.sheetDesc}>Select who can view your active 24h story post.</Text>

                {/* College Visibility Option */}
                <TouchableOpacity style={styles.audienceOpt} onPress={() => handlePostStory('college')} activeOpacity={0.8}>
                  <View style={[styles.audienceIconWrapper, { backgroundColor: 'rgba(157, 78, 221, 0.15)', borderColor: 'rgba(157, 78, 221, 0.3)' }]}>
                    <Ionicons name="school" size={20} color="#9D4EDD" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.audienceName}>My College</Text>
                    <Text style={styles.audienceDetail}>Only visible to campus mates at {college?.short_name || 'your college'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>

                {/* Matches Visibility Option */}
                <TouchableOpacity style={styles.audienceOpt} onPress={() => handlePostStory('matches')} activeOpacity={0.8}>
                  <View style={[styles.audienceIconWrapper, { backgroundColor: 'rgba(255, 45, 85, 0.15)', borderColor: 'rgba(255, 45, 85, 0.3)' }]}>
                    <Ionicons name="heart" size={20} color="#FF1B6B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.audienceName}>My Matches</Text>
                    <Text style={styles.audienceDetail}>Only visible to people you have mutually matched with</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>

                {/* Global Network Visibility Option */}
                <TouchableOpacity style={styles.audienceOpt} onPress={() => {
                  if (!user?.is_premium) {
                    closeAudienceModal(() => {
                      setShowBuyPremiumPopup(true);
                    }, false);
                    return;
                  }
                  handlePostStory('global');
                }} activeOpacity={0.8}>
                  <View style={[styles.audienceIconWrapper, { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderColor: 'rgba(255, 215, 0, 0.3)' }]}>
                    <Ionicons name="globe" size={20} color="#FFD700" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.audienceName}>Global Network</Text>
                      <TouchableOpacity
                        onPress={() => {
                          closeAudienceModal(() => {
                            setShowBuyPremiumPopup(true);
                          }, false);
                        }}
                        style={styles.premiumBadge}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.premiumBadgeText}>PREMIUM 👑</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.audienceDetail}>Visible globally to all colleges on the network</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => closeAudienceModal()} activeOpacity={0.8}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </BlurView>
            </Animated.View>
          </View>
        </Modal>

        {/* MODAL 3: PREMIUM BUY POPUP */}
        <Modal transparent={true} visible={showBuyPremiumPopup} animationType="fade" onRequestClose={() => setShowBuyPremiumPopup(false)}>
          <TouchableOpacity style={styles.dialogBackdrop} activeOpacity={1} onPress={() => setShowBuyPremiumPopup(false)}>
            <View style={styles.premiumDialog}>
              <View style={styles.diamondWrapper}>
                <Ionicons name="diamond" size={40} color="#FFD700" />
              </View>
              <Text style={styles.premiumTitle}>Unlock Global Network 🌟</Text>
              <Text style={styles.premiumDesc}>
                Posting stories to the Global Network is a premium feature. Upgrade now to connect with students across all campuses!
              </Text>

              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => {
                  setShowBuyPremiumPopup(false);
                  router.push('/premium');
                }}
                activeOpacity={0.8}
              >
                <LinearGradient colors={['#ee4d4d', '#780505']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyBtnGradient}>
                  <Text style={styles.buyBtnText}>Upgrade to Premium</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.premiumCloseBtn}
                onPress={() => {
                  setShowBuyPremiumPopup(false);
                  setTimeout(() => {
                    setShowAudienceModal(true);
                  }, 300);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumCloseText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL 4: FULLSCREEN STORY VIEW OVERLAY */}
        <Modal transparent={true} visible={showStoryModal} animationType="fade" onRequestClose={() => setShowStoryModal(false)}>
          <View style={styles.storyViewContainer}>
            {/* Top Indicator Bars */}
            <View style={styles.progBarRow}>
              {activeUserWithStories?.stories?.map((_: any, idx: number) => {
                const isCompleted = idx < activeStoryIndex;
                const isActive = idx === activeStoryIndex;
                return (
                  <View key={idx} style={styles.progBarWrapper}>
                    <View
                      style={[
                        styles.progBarFill,
                        isCompleted && { width: '100%' },
                        isActive && { width: `${storyProgress * 100}%` }
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            {/* Story Header */}
            <View style={styles.storyHeader}>
              {activeUserWithStories?.user_picture ? (
                <Image source={{ uri: activeUserWithStories.user_picture }} style={styles.storyHeadPic} />
              ) : (
                <View style={[styles.storyHeadPic, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFF', fontWeight: '900' }}>{activeUserWithStories?.user_name?.[0]}</Text>
                </View>
              )}
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.storyHeadName}>{activeUserWithStories?.user_name}</Text>
                {activeStory && (
                  <>
                    <Text style={styles.storyHeadTime}>
                      {activeStory.createdAt ? formatViewTime(activeStory.createdAt) : ''}
                    </Text>
                    {activeStory.audience ? (
                      <Text style={[styles.storyHeadTime, { marginTop: 2, fontWeight: '600', color: '#C2FF3D' }]}>
                        {activeStory.audience.toUpperCase()}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
              {isOwnStory && (
                <TouchableOpacity
                  style={{ marginLeft: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 14 }}
                  onPress={() => {
                    setShowStoryModal(false);
                    setShowPickModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>Add story</Text>
                </TouchableOpacity>
              )}
              {isOwnStory && (
                <TouchableOpacity
                  style={[isOwnStory ? {} : { marginLeft: 'auto' }, { marginRight: 14, padding: 4 }]}
                  onPress={handleDeleteStory}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3366" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={isOwnStory ? { padding: 4 } : styles.storyClose}
                onPress={() => setShowStoryModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Left/Right Press Controls */}
            <TouchableOpacity
              style={styles.storyLeftTap}
              onPress={() => {
                const duration = Date.now() - storyPressStartTime.current;
                if (duration < 250) {
                  goPrevStory();
                }
              }}
              onPressIn={() => {
                storyPressStartTime.current = Date.now();
                setIsStoryPaused(true);
              }}
              onPressOut={() => setIsStoryPaused(false)}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.storyRightTap}
              onPress={() => {
                const duration = Date.now() - storyPressStartTime.current;
                if (duration < 250) {
                  goNextStory();
                }
              }}
              onPressIn={() => {
                storyPressStartTime.current = Date.now();
                setIsStoryPaused(true);
              }}
              onPressOut={() => setIsStoryPaused(false)}
              activeOpacity={1}
            />

            {/* Story Image */}
            {activeStory && (
              <Animated.View style={{ width: '100%', height: '100%', opacity: storyFadeAnim, transform: [{ translateX: storySlideAnim }] }}>
                <Image source={{ uri: activeStory.image }} style={styles.storyMainImg} />
              </Animated.View>
            )}

            {/* Viewers list Drawer activator (Only visible on OWN stories) */}
            {isOwnStory && activeStory && (
              <TouchableOpacity style={styles.viewersIndicator} onPress={() => setShowViewersSheet(true)} activeOpacity={0.8}>
                <Ionicons name="chevron-up" size={22} color="#FFF" style={styles.bounceUpIcon} />
                <View style={styles.viewsCountBadge}>
                  <Ionicons name="eye" size={14} color="#FF1B6B" />
                  <Text style={styles.viewsCountText}>{activeStory.views?.length || 0} Views</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* MODAL BOTTOM SHEET (Inside Fullscreen Overlay): Story Viewers Drawer */}
            {showViewersSheet && (
              <Modal transparent={true} visible={showViewersSheet} animationType="slide">
                <View style={styles.viewsDrawerBackdrop}>
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowViewersSheet(false)} />
                  <View style={styles.viewsDrawerSheet}>
                    <View style={styles.dragHandle} />

                    <View style={styles.viewsDrawerHeader}>
                      <Text style={styles.viewsDrawerTitle}>Viewers ({activeStory?.views?.length || 0})</Text>
                      <TouchableOpacity style={styles.viewsDrawerClose} onPress={() => setShowViewersSheet(false)}>
                        <Ionicons name="close" size={22} color="#FFF" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.viewsDrawerContent}>
                      {(!activeStory?.views || activeStory.views.length === 0) ? (
                        <View style={styles.emptyViewers}>
                          <Ionicons name="eye-off-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                          <Text style={styles.emptyViewersText}>No views yet</Text>
                          <Text style={styles.emptyViewersSub}>We'll list users here as soon as they view your story.</Text>
                        </View>
                      ) : (
                        activeStory.views.map((v: any, index: number) => {
                          const hasDetails = typeof v === 'object';
                          const vName = hasDetails ? (v.name || v.user_name || 'Campus Mate') : 'Campus Mate';
                          const vPic = hasDetails ? (v.picture || v.user_picture || null) : null;
                          return (
                            <TouchableOpacity
                              key={index}
                              style={styles.viewerRow}
                              onPress={() => handleViewerClick(v)}
                              activeOpacity={0.7}
                            >
                              {vPic ? (
                                <Image source={{ uri: vPic }} style={styles.viewerPic} />
                              ) : (
                                <View style={[styles.viewerPic, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                                  <Text style={{ color: '#FFF', fontWeight: '800' }}>{vName[0]}</Text>
                                </View>
                              )}
                              <View style={{ flex: 1, justifyContent: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={styles.viewerName}>{vName}</Text>
                                  {hasDetails && !v.is_match && (
                                    <Text style={{ color: '#FF3366', fontSize: 11, fontWeight: '700', marginLeft: 6 }}>
                                      (not in match list)
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        </Modal>

        {/* REPORT POPUP MODAL */}
        <Modal
          visible={showReportModal && selectedConfession === null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReportModal(false)}
        >
          <View style={styles.reportModalOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.reportModalContainer}>
              <View style={styles.reportModalHeader}>
                <Text style={styles.reportModalTitle}>Report Confession 🛡️</Text>
                <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.reportModalCloseBtn}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.reportModalContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.reportModalDesc}>
                  Help us keep Off-Campus safe. Tell us why you are reporting this confession. The author's vibe score will be penalized.
                </Text>

                <Text style={styles.reasonLabel}>SELECT A REASON</Text>
                {reportReasons.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionActive]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <Text style={styles.reasonLabel}>DETAILED DETAILS (OPTIONAL)</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter details here..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  multiline={true}
                  numberOfLines={4}
                  value={customReason}
                  onChangeText={setCustomReason}
                />

                <View style={styles.reportModalActions}>
                  <TouchableOpacity
                    style={styles.reportCancelBtn}
                    onPress={() => setShowReportModal(false)}
                  >
                    <Text style={styles.reportCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportSubmitBtn, submittingReport && { opacity: 0.5 }]}
                    onPress={handleReportSubmit}
                    disabled={submittingReport}
                  >
                    {submittingReport ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.reportSubmitBtnText}>Submit Report</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>
          </View>
        </Modal>

        {/* FILTER POPUP MODAL */}
        <Modal
          visible={showFilterModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalOverlay}>
            <BlurView intensity={90} tint="dark" style={styles.filterModalContainer}>
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>Filter Confessions</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.filterModalCloseBtn}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.reportModalContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.filterSectionLabel}>POST SOURCE</Text>
                <View style={styles.filterButtonGroup}>
                  <TouchableOpacity
                    style={[styles.filterButtonOpt, tempFeedScope === 'college' && styles.filterButtonOptActive]}
                    onPress={() => handleScopeChange('college')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="school" size={16} color={tempFeedScope === 'college' ? '#000' : '#FFF'} />
                    <Text style={[styles.filterButtonOptText, tempFeedScope === 'college' && styles.filterButtonOptTextActive]}>
                      My College
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterButtonOpt, tempFeedScope === 'global' && styles.filterButtonOptActive]}
                    onPress={() => handleScopeChange('global')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="globe" size={16} color={tempFeedScope === 'global' ? '#000' : '#FFF'} />
                    <Text style={[styles.filterButtonOptText, tempFeedScope === 'global' && styles.filterButtonOptTextActive]}>
                      Global Network
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.filterSectionLabel}>SORT BY</Text>

                <TouchableOpacity
                  style={styles.filterSortRow}
                  onPress={() => setTempSortBy('latest')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, tempSortBy === 'latest' && styles.radioCircleActive]}>
                    {tempSortBy === 'latest' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.filterSortName, tempSortBy === 'latest' && styles.filterSortNameActive]}>
                      Latest Posts
                    </Text>
                    <Text style={styles.filterSortDesc}>Show newest confessions first</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterSortRow}
                  onPress={() => setTempSortBy('engagement')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, tempSortBy === 'engagement' && styles.radioCircleActive]}>
                    {tempSortBy === 'engagement' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.filterSortName, tempSortBy === 'engagement' && styles.filterSortNameActive]}>
                      Most Engaged
                    </Text>
                    <Text style={styles.filterSortDesc}>Sort by max engagements (likes + comments)</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.filterModalActions}>
                  <TouchableOpacity
                    style={styles.filterResetBtn}
                    onPress={() => {
                      setTempFeedScope('college');
                      setTempSortBy('latest');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterResetBtnText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filterApplyBtn}
                    onPress={() => {
                      setAppliedFeedScope(tempFeedScope);
                      setAppliedSortBy(tempSortBy);
                      setShowFilterModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterApplyBtnText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>
          </View>
        </Modal>

        {/* CUSTOM OPTIONS MENU BOTTOM SHEET MODAL */}
        <Modal
          visible={showOptionsModal && selectedConfession === null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsModalOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsModal(false)}
          >
            <BlurView intensity={90} tint="dark" style={styles.optionsModalContainer}>
              <View style={styles.optionsHeader}>
                <View style={styles.optionsHeaderBar} />
                <Text style={styles.optionsTitle}>Confession Options 🛡️</Text>
              </View>

              <TouchableOpacity
                style={[styles.optionsItem, styles.optionsItemDanger]}
                onPress={() => {
                  setShowOptionsModal(false);
                  if (selectedOptionsConfession) {
                    setSelectedReportConfession(selectedOptionsConfession);
                    setSelectedReason('');
                    setCustomReason('');
                    setShowReportModal(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#FF4B4B" />
                <Text style={[styles.optionsItemText, styles.optionsItemTextDanger]}>Report Confession</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionsCancelBtn}
                onPress={() => setShowOptionsModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionsCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </BlurView>
          </TouchableOpacity>
        </Modal>

        {/* CUSTOM SHARE BOTTOM SHEET MODAL */}
        <Modal
          visible={sharingConfession !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSharingConfession(null)}
        >
          <TouchableOpacity
            style={styles.optionsModalOverlay}
            activeOpacity={1}
            onPress={() => setSharingConfession(null)}
          >
            <BlurView intensity={90} tint="dark" style={[styles.optionsModalContainer, { height: screenHeight * 0.7 }]}>
              {/* Header Drag Bar */}
              <View style={styles.optionsHeader}>
                <View style={styles.optionsHeaderBar} />
                <Text style={styles.optionsTitle}>Share Confession</Text>
              </View>

              {/* Action: Share via Link / Copy */}
              <TouchableOpacity
                style={styles.shareViaLinkBtn}
                onPress={handleShareLink}
                activeOpacity={0.8}
              >
                <View style={styles.shareLinkIconContainer}>
                  <Ionicons name="link-outline" size={20} color="#000" />
                </View>
                <Text style={styles.shareLinkText}>Share via Link / Copy</Text>
              </TouchableOpacity>

              {/* Search Bar for DMs */}
              <View style={styles.shareSearchContainer}>
                <Ionicons name="search-outline" size={16} color="rgba(255, 255, 255, 0.4)" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.shareSearchInput}
                  placeholder="Search chats..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={shareSearchQuery}
                  onChangeText={setShareSearchQuery}
                />
                {shareSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setShareSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>
                )}
              </View>

              {/* DMs List */}
              {loadingShareChats ? (
                <ActivityIndicator color="#C2FF3D" size="small" style={{ marginTop: 20 }} />
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  style={{ flex: 1, width: '100%', marginTop: 10 }}
                >
                  {shareChats
                    .filter(conv =>
                      conv.user?.name?.toLowerCase().includes(shareSearchQuery.toLowerCase())
                    )
                    .map((conv: any) => {
                      const partner = conv.user;
                      if (!partner) return null;
                      const isSending = sendingToUserId[partner.user_id];
                      const isSent = sentToUserId[partner.user_id];

                      return (
                        <View key={partner.user_id} style={styles.shareChatRow}>
                          <View style={styles.shareChatLeft}>
                            <Image
                              source={{ uri: partner.picture || (partner.photos && partner.photos[0]) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
                              style={styles.shareChatPfp}
                            />
                            <Text style={styles.shareChatName} numberOfLines={1}>
                              {partner.name}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.shareSendBtn,
                              isSent && styles.shareSendBtnSent,
                              isSending && { opacity: 0.6 }
                            ]}
                            disabled={isSending || isSent}
                            onPress={() => handleSendDM(partner.user_id)}
                          >
                            {isSending ? (
                              <ActivityIndicator color="#000" size="small" />
                            ) : (
                              <Text style={[styles.shareSendBtnText, isSent && styles.shareSendBtnTextSent]}>
                                {isSent ? 'Sent' : 'Send'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                  {shareChats.filter(conv =>
                    conv.user?.name?.toLowerCase().includes(shareSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <Text style={styles.noChatsText}>No matches or chats found.</Text>
                  )}
                </ScrollView>
              )}
            </BlurView>
          </TouchableOpacity>
        </Modal>

        {/* Premium Upsell Bottom Sheet */}
        <PremiumUpsellSheet
          visible={upsellVisible}
          onClose={() => setUpsellVisible(false)}
          title={upsellTitle}
          featureName={upsellFeature}
        />

        {/* Notifications Modal */}
        <Modal
          visible={showNotificationsModal}
          animationType="slide"
          onRequestClose={() => setShowNotificationsModal(false)}
        >
          <SafeAreaView style={styles.notifModalContainer}>
            <BlurView intensity={70} tint="dark" style={styles.notifModalHeaderBar}>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)} activeOpacity={0.8} style={styles.notifBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.notifModalTitle}>Notifications</Text>
              {unreadNotifCount > 0 && (
                <View style={styles.notifHeaderBadge}>
                  <Text style={styles.notifHeaderBadgeText}>{unreadNotifCount} New</Text>
                </View>
              )}
              <View style={{ width: 40 }} />
            </BlurView>

            {notifications.length === 0 ? (
              <View style={styles.notifEmptyState}>
                <Ionicons name="notifications-off-outline" size={60} color="rgba(255,255,255,0.15)" />
                <Text style={styles.notifEmptyTitle}>No notifications yet</Text>
                <Text style={styles.notifEmptySub}>Likes and replies on your confessions will appear here</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                {notifications.map((item) => (
                  <NotificationRow
                    key={item.notification_id}
                    item={item}
                    onRead={handleMarkNotifRead}
                    onDelete={handleDeleteNotif}
                    onPress={handleNotificationClick}
                  />
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

// Swipeable Notification Item Row
const NotificationRow = ({ item, onRead, onDelete, onPress }) => {
  const panX = useRef(new Animated.Value(0)).current;
  const currentTranslateX = useRef(0);

  useEffect(() => {
    const listenerId = panX.addListener(({ value }) => {
      currentTranslateX.current = value;
    });
    return () => {
      panX.removeListener(listenerId);
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderGrant: () => {
        // start
      },
      onPanResponderMove: (evt, gestureState) => {
        let newX = currentTranslateX.current + gestureState.dx;
        if (newX > 0) newX = 0;
        if (newX < -150) newX = -150;
        panX.setValue(newX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.spring(panX, {
            toValue: -140,
            useNativeDriver: true,
            bounciness: 4
          }).start(() => {
            currentTranslateX.current = -140;
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4
          }).start(() => {
            currentTranslateX.current = 0;
          });
        }
      }
    })
  ).current;

  const isLike = item.type === 'like';

  return (
    <View style={styles.notifRowContainer}>
      {/* Action Buttons underneath */}
      <View style={styles.notifActionsBack}>
        {!item.is_read && (
          <TouchableOpacity
            style={[styles.notifActionBtn, { backgroundColor: '#007AFF' }]}
            onPress={() => {
              Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
              currentTranslateX.current = 0;
              onRead(item.notification_id);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            <Text style={styles.notifActionText}>Read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.notifActionBtn, { backgroundColor: '#FF3B30' }]}
          onPress={() => {
            Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
            currentTranslateX.current = 0;
            onDelete(item.notification_id);
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#FFF" />
          <Text style={styles.notifActionText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable foreground card */}
      <Animated.View
        style={[
          styles.notifFront,
          { transform: [{ translateX: panX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPress(item)}
          style={styles.notifContentWrapper}
        >
          <Image
            source={{ uri: item.sender_picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200' }}
            style={styles.notifPfp}
          />
          
          <View style={styles.notifTextContainer}>
            <Text style={styles.notifBodyText}>
              <Text style={styles.notifBoldText}>{item.sender_name} </Text>
              {isLike ? 'liked your confession: ' : 'replied on your confession: '}
              <Text style={styles.notifSnippetText} numberOfLines={1}>
                "{item.content}"
              </Text>
            </Text>
          </View>

          <View style={styles.notifIndicator}>
            {isLike ? (
              <Text style={{ fontSize: 16 }}>❤️</Text>
            ) : (
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#C2FF3D" />
            )}
          </View>
        </TouchableOpacity>

        {!item.is_read && <View style={styles.unreadDot} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bellBtn: {
    position: 'relative',
    marginRight: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF2D55',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  notifModalContainer: {
    flex: 1,
    backgroundColor: '#0F0E17',
  },
  notifModalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  notifBackBtn: {
    padding: 4,
  },
  notifModalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  notifHeaderBadge: {
    backgroundColor: '#FF2D55',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  notifHeaderBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  notifEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  notifEmptyTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  notifEmptySub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  notifRowContainer: {
    width: '100%',
    height: 72,
    backgroundColor: '#0F0E17',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  notifActionsBack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 140,
    flexDirection: 'row',
    zIndex: 1,
  },
  notifActionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  notifActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  notifFront: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F0E17',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  notifContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notifPfp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notifTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notifBodyText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  notifBoldText: {
    color: '#FFF',
    fontWeight: '700',
  },
  notifSnippetText: {
    color: 'rgba(255,255,255,0.45)',
    fontStyle: 'italic',
  },
  notifIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2D55',
    marginLeft: 8,
  },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  bg: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },

  // Redesigned Header Styles
  newHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 36,
    paddingBottom: 4,
  },
  newHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoGradient: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newHeaderDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newHeaderTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  liveBadgeSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  newLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.35)',
  },
  newLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2D55',
  },
  newLiveText: {
    color: '#FF2D55',
    fontSize: 10,
    fontWeight: '800',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Stories Section Headers & Items
  sectionHeadMini: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeadLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storiesScroll: {
    flexGrow: 0,
    marginBottom: 16,
    paddingVertical: 4,
  },
  storyItem: {
    alignItems: 'center',
    gap: 4,
    width: 64,
  },
  addStoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    position: 'relative',
    overflow: 'hidden',
  },
  addPlus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FF1B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#050005',
    shadowColor: '#FF1B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  storyInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#050005',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28
  },
  storyName: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  storyOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#050005',
    zIndex: 10,
  },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginHorizontal: 16, marginVertical: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 14, marginBottom: 8 },
  trophyIc: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255, 215, 0, 0.1)', alignItems: 'center', justifyContent: 'center' },
  megaphoneIc: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255, 27, 107, 0.1)', alignItems: 'center', justifyContent: 'center' },
  sectionT: { color: '#FFF', fontSize: 18, fontWeight: '800' },

  // Redesigned Top Vibes Card (Horizontal Scroll)
  newVibeCard: {
    width: 130,
    height: 170,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  newRankTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 5,
  },
  newRankTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  newVibeCardBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  newVibeName: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  newVibeBio: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginTop: 1,
  },
  newVibeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  newVibeScoreText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 10,
  },

  // Premium Composer Styles
  premiumComposerWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  composerInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingVertical: 8,
  },
  composerSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  composerSendBtnDisabled: {
    opacity: 0.35,
  },
  sendBtnGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Confessions List (Twitter Styles)
  gridContainer: {
    flexDirection: 'column',
    paddingHorizontal: 0,
    paddingTop: 10,
    width: '100%',
  },
  simpleConfessionContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'relative',
  },
  simpleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  simpleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  simpleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  simpleAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  simpleHeaderText: {
    flexDirection: 'column',
  },
  simpleAuthorName: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  simpleCollegeName: {
    color: '#C2FF3D',
    fontSize: 12,
    marginTop: 1,
  },
  simpleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  simpleTimeText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  simpleDotsBtn: {
    padding: 4,
  },
  simpleBodyContainer: {
    marginTop: 12,
    width: '100%',
  },
  simpleContentText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  simpleImageWrapper: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  simpleAttachedImage: {
    width: '100%',
    height: 240,
  },
  simpleActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 14,
    paddingBottom: 16,
  },
  simpleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  simpleActionText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
  simpleDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: -16,
  },
  confessionCardWrapper: {
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  imageCard: {
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  imageCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
    paddingLeft: 22,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  anonAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  collegeName: {
    color: '#C2FF3D',
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  textContainer: {
    marginVertical: 12,
  },
  confessionText: {
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  readMoreTextNew: {
    color: '#C2FF3D',
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 4,
  },
  cardActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionCountNew: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  glassTextCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  accentRibbon: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 2,
  },
  textCardContent: {
    padding: 18,
    paddingLeft: 22,
  },
  authorNameTextOnly: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  collegeNameTextOnly: {
    color: '#C2FF3D',
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardTimeTextOnly: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 11,
    fontWeight: '500',
  },
  confessionTextTextOnly: {
    color: '#E4E4E7',
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '400',
  },
  twitterCard: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  twitterAvatarContainer: {
    marginRight: 12,
  },
  twitterAvatarBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  twitterAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  twitterContentContainer: {
    flex: 1,
  },
  twitterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  twitterAuthorName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  collegeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  collegeBadgeText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },
  twitterDot: {
    color: '#3F3F46',
    marginHorizontal: 6,
    fontSize: 12,
  },
  twitterTime: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  twitterText: {
    color: '#E4E4E7',
    fontSize: 14.5,
    lineHeight: 21,
    marginBottom: 8,
    fontWeight: '400',
  },
  imageAttachmentWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 8,
  },
  twitterAttachedImage: {
    width: '100%',
    height: 180,
  },
  twitterActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    marginTop: 8,
  },
  twitterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Search/Composer Input Styles
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  imageSelectBtn: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerImagePreviewContainer: {
    position: 'relative',
    width: 66,
    height: 66,
    marginBottom: 12,
  },
  composerImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  composerImageCloseBtn: {
    position: 'absolute',
    top: -4,
    right: 2,
    backgroundColor: '#000',
    borderRadius: 10,
    zIndex: 10,
  },
  readMoreText: {
    color: '#FF3366',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
  },

  // Comments modal & threads styles
  commentsModalContainer: { flex: 1, backgroundColor: '#000000' },
  commentsModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalCloseBtn: { padding: 4 },
  modalHeaderTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  commentsScrollView: { flex: 1 },
  commentsContentContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  repliesTitleHeader: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  emptyCommentsBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyCommentsText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  commentsTreeBox: { paddingBottom: 20 },
  commentNodeContainer: { marginVertical: 8 },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentAnon: { color: '#A899B8', fontSize: 12, fontWeight: '700' },
  commentTime: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
  commentBodyRow: {
    paddingLeft: 26,
    marginTop: 4,
  },
  commentText: { color: '#FFF', fontSize: 13, lineHeight: 17 },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingLeft: 26,
  },
  commentReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  commentReplyText: { color: '#C2FF3D', fontSize: 11, fontWeight: '600' },
  nestedRepliesContainer: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(194, 255, 61, 0.35)', // glowing lime green line
    marginLeft: 9,
    paddingLeft: 16,
    marginTop: 4,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAvatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  anonAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  commentInputWrapper: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: 12, backgroundColor: 'rgba(15, 15, 20, 0.95)' },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  commentTextInput: { flex: 1, color: '#FFF', fontSize: 13, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', maxHeight: 100 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  commentSendBtnDisabled: { opacity: 0.5 },
  sendGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  replyingToHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 45, 85, 0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  replyingToText: { color: '#FF2D55', fontSize: 11, flex: 1, marginRight: 8 },

  // Picker modal and popups
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
  dialogCard: { backgroundColor: '#0B0B0C', width: width - 48, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24, gap: 16 },
  dialogTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  dialogDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 18 },
  dialogOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 12 },
  dialogOptIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dialogOptText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Audience settings styles
  audienceSheet: { padding: 24, paddingBottom: 36, gap: 16, backgroundColor: 'rgba(11, 11, 12, 0.9)' },
  audienceSheetContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sheetDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  audienceOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 12 },
  audienceIconWrapper: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  audienceName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  audienceDetail: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 },
  premiumBadge: { backgroundColor: 'rgba(255, 215, 0, 0.08)', borderWidth: 1, borderColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumBadgeText: { color: '#FFD700', fontSize: 8, fontWeight: '900' },
  sheetCancelBtn: { backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 12, borderRadius: 24, alignItems: 'center', marginTop: 8 },
  sheetCancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },

  // Premium buy dialog
  premiumDialog: { backgroundColor: '#0B0B0C', width: width - 48, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.15)', padding: 28, alignItems: 'center', gap: 18 },
  diamondWrapper: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255, 215, 0, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.15)' },
  premiumTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  premiumDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  buyBtn: { width: '100%', borderRadius: 24, overflow: 'hidden', marginTop: 8 },
  buyBtnGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  premiumCloseBtn: { paddingVertical: 10, alignSelf: 'center' },
  premiumCloseText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600' },

  // Story fullscreen view overlay
  storyViewContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  progBarRow: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', gap: 6, zIndex: 100 },
  progBarWrapper: { flex: 1, height: 3, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, overflow: 'hidden' },
  progBarFill: { height: '100%', backgroundColor: '#FFF' },
  storyHeader: { position: 'absolute', top: 64, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  storyHeadPic: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  storyHeadName: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  storyHeadTime: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  storyClose: { marginLeft: 'auto', padding: 4 },
  storyLeftTap: { position: 'absolute', left: 0, top: 120, bottom: 120, width: width * 0.3, zIndex: 90 },
  storyRightTap: { position: 'absolute', right: 0, top: 120, bottom: 120, width: width * 0.7, zIndex: 90 },
  storyMainImg: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Viewers list drawer activator
  viewersIndicator: { position: 'absolute', bottom: 36, alignSelf: 'center', zIndex: 100, alignItems: 'center', gap: 6 },
  bounceUpIcon: { color: 'rgba(255,255,255,0.5)' },
  viewsCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  viewsCountText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  // Viewers listing drawer sheet
  viewsDrawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  viewsDrawerSheet: { backgroundColor: '#0B0B0C', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: screenHeight * 0.6, paddingBottom: 24 },
  viewsDrawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  viewsDrawerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  viewsDrawerClose: { backgroundColor: 'rgba(255,255,255,0.05)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  viewsDrawerContent: { padding: 20, paddingBottom: 40 },
  emptyViewers: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyViewersText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  emptyViewersSub: { color: 'rgba(255,255,255,0.35)', fontSize: 11, textAlign: 'center', paddingHorizontal: 30 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  viewerPic: { width: 38, height: 38, borderRadius: 19 },
  viewerName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  viewerTime: { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 },

  // Comments modal confession banner styles
  modalConfCard: {
    marginVertical: 10,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalConfTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalConfHeaderAnon: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfTime: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  modalMessageBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalConfTxt: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  modalConfActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalConfAct: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalConfActT: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '700',
    fontSize: 12,
  },
  premiumComposerCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
    padding: 16,
    position: 'relative',
  },
  composerImagePreviewWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  composerImagePreviewNew: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageCloseBlur: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  composerImageCloseBtnNew: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  composerTextInputNew: {
    color: '#FFF',
    fontSize: 14.5,
    lineHeight: 20,
    minHeight: 52,
    textAlignVertical: 'top',
    padding: 0,
    marginBottom: 12,
    fontWeight: '500',
  },
  composerActionBarNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  composerImageSelectBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  composerImageSelectText: {
    fontSize: 12,
    fontWeight: '700',
  },
  composerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  charCountText: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 12,
    fontWeight: '700',
  },
  composerSendBtnNew: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  composerSendBtnDisabledNew: {
    opacity: 0.4,
  },
  sendBtnGradNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendBtnTextNew: {
    color: '#000',
    fontSize: 12.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalConfImageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalConfImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  reportModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F0F14',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  reportModalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  reportModalCloseBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  reportModalContent: {
    paddingVertical: 12,
  },
  reportModalDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  threeDotsBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  reasonOptionActive: {},
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleActive: {
    borderColor: '#C2FF3D',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C2FF3D',
  },
  reasonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13.5,
    fontWeight: '500',
  },
  reasonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  reasonInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    color: '#FFF',
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 6,
    marginBottom: 16,
  },
  reportModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  reportCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reportCancelBtnText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  reportSubmitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitBtnText: {
    color: '#000',
    fontSize: 13.5,
    fontWeight: '800',
  },
  doubleTapHeartContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -36,
    marginTop: -36,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF1B6B',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#0F0F14',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterModalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  filterModalCloseBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  filterSectionLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  filterButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
  },
  filterButtonOpt: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  filterButtonOptActive: {
    backgroundColor: '#C2FF3D',
    borderColor: '#C2FF3D',
  },
  filterButtonOptText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  filterButtonOptTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
  },
  filterSortName: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    fontWeight: '600',
  },
  filterSortNameActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  filterSortDesc: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  filterModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 10,
  },
  filterResetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterResetBtnText: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  filterApplyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyBtnText: {
    color: '#000',
    fontSize: 13.5,
    fontWeight: '800',
  },
  globalToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#C2FF3D',
  },
  globalToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  globalToggleActive: {
    backgroundColor: '#FFFFFF',
  },
  globalToggleText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '700',
  },
  globalToggleTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  optionsModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    backgroundColor: '#0F0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionsHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  optionsHeaderBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  optionsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 10,
    gap: 12,
  },
  optionsItemDanger: {
    backgroundColor: 'rgba(255, 75, 75, 0.05)',
    borderColor: 'rgba(255, 75, 75, 0.1)',
    borderWidth: 1,
  },
  optionsItemText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '600',
  },
  optionsItemTextDanger: {
    color: '#FF4B4B',
  },
  optionsCancelBtn: {
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionsCancelBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareViaLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#C2FF3D',
    marginBottom: 14,
    gap: 12,
    width: '100%',
  },
  shareLinkIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkText: {
    color: '#000',
    fontSize: 14.5,
    fontWeight: '800',
  },
  shareSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
    width: '100%',
  },
  shareSearchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 13.5,
    padding: 0,
  },
  shareChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    width: '100%',
  },
  shareChatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shareChatPfp: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  shareChatName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  shareSendBtn: {
    height: 30,
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  shareSendBtnSent: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  shareSendBtnText: {
    color: '#000',
    fontSize: 12.5,
    fontWeight: '800',
  },
  shareSendBtnTextSent: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  noChatsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 30,
  },
});
