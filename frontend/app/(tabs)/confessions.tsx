import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl, Modal, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

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

const MOCK_CONFESSIONS = [
  {
    confession_id: 'conf_1',
    content: 'Crushing on the girl who sits next to me in English literature. She has the most beautiful laugh! 📖💖',
    likes: 24,
    comments: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    college_id: 'col_stephens'
  },
  {
    confession_id: 'conf_2',
    content: 'Anyone else dynamic-routing their life into chaos, or is it just me? Semester projects are killing me. 💻😭',
    likes: 12,
    comments: 0,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    college_id: 'col_stephens'
  },
  {
    confession_id: 'conf_3',
    content: 'Spotted someone super cute at the Hauz Khas Social yesterday wearing a green varsity jacket. Find me! ✨👀',
    likes: 45,
    comments: 0,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    college_id: 'col_lsr'
  },
  {
    confession_id: 'conf_4',
    content: 'Can we agree that the canteen food this year is actually better? Best samosas ever. 😋',
    likes: 8,
    comments: 0,
    created_at: new Date(Date.now() - 28800000).toISOString(),
    college_id: 'col_stephens'
  }
];

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
  const [refreshing, setRefreshing] = useState(false);

  const [college, setCollege] = useState<any>(null);
  const [feedType, setFeedType] = useState<'global' | 'college'>('global');

  // New states for Story Creation Flow
  const [showPickModal, setShowPickModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showBuyPremiumPopup, setShowBuyPremiumPopup] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);

  // New states for Story Viewer Flow
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeStoryUserIndex, setActiveStoryUserIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [showViewersSheet, setShowViewersSheet] = useState(false);

  // Reddit Comments Thread states
  const [selectedConfession, setSelectedConfession] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    fetchAll();
    if (user?.college_id) {
      fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/colleges/${user.college_id}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.college) {
            setCollege(data.college);
          }
        })
        .catch(e => console.error('Error fetching college:', e));
    }
  }, [user?.college_id]);

  const fetchAll = async () => {
    if (sessionToken === 'dummy_token') {
      setConfessions(MOCK_CONFESSIONS);
      setStories(MOCK_STORIES);
      setTopVibes(MOCK_TOP_VIBES);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${sessionToken}` };
      const [c, s, l] = await Promise.all([
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/leaderboard/top-vibes?limit=3`, { headers }).then(r => r.json()),
      ]);
      setConfessions(c.confessions || []);
      setStories(s.users_with_stories || []);
      setTopVibes(l.top_vibes || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const post = async () => {
    if (!text.trim()) return;
    setPosting(true);

    if (sessionToken === 'dummy_token') {
      const newConf = {
        confession_id: `conf_local_${Date.now()}`,
        content: text.trim(),
        likes: 0,
        comments: 0,
        created_at: new Date().toISOString(),
        college_id: feedType === 'college' ? user?.college_id : null
      };
      setConfessions(prev => [newConf, ...prev]);
      setText('');
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
          college_id: feedType === 'college' ? user?.college_id : null 
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to post confession' }));
        Alert.alert('Error', errorData.detail || 'Failed to post confession');
        return;
      }
      setText('');
      await fetchAll();
    } catch (e: any) { 
      console.error(e);
      Alert.alert('Network Error', e.message || 'Could not connect to server');
    } finally { 
      setPosting(false); 
    }
  };

  const likeC = async (id: string) => {
    if (sessionToken === 'dummy_token') {
      setConfessions(prev => prev.map(c => c.confession_id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
      setSelectedConfession((prev: any) => prev && prev.confession_id === id ? { ...prev, likes: (prev.likes || 0) + 1 } : prev);
      return;
    }

    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${id}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionToken}` } });
      setConfessions(confessions.map(c => c.confession_id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
    } catch (e) { console.error(e); }
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
        allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
      });
      if (result.canceled) return;
      if (result.assets && result.assets[0].base64) {
        setStoryImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        setShowPickModal(false);
        setShowAudienceModal(true);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
      });
      if (result.canceled) return;
      if (result.assets && result.assets[0].base64) {
        setStoryImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        setShowPickModal(false);
        setShowAudienceModal(true);
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
            setShowAudienceModal(true);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Story Posting Handlers
  const handlePostStory = async (audience: 'matches' | 'college' | 'global') => {
    if (audience === 'global' && !user?.is_premium) {
      setShowAudienceModal(false);
      router.push('/premium');
      return;
    }

    if (!storyImage) {
      Alert.alert('Error', 'No image selected to post');
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
          if (existingUserIdx >= 0) {
            const updated = [...prev];
            updated[existingUserIdx] = {
              ...updated[existingUserIdx],
              has_unviewed: true,
              stories: [...(updated[existingUserIdx].stories || []), newStory]
            };
            return updated;
          } else {
            return [
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
        });

        Alert.alert('Story posted!', 'Your story will be live for 24 hours');
        setShowAudienceModal(false);
        setStoryImage(null);
        return;
      }

      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ image: storyImage, audience }),
      });
      if (!response.ok) throw new Error('Failed to post story');
      Alert.alert('Story posted!', 'Your story will be live for 24 hours');
      setShowAudienceModal(false);
      setStoryImage(null);
      await fetchAll();
    } catch (e) {
      console.error(e);
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
    if (!showStoryModal || showViewersSheet) return;

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          goNextStory();
          return 0;
        }
        return prev + 0.02; // Increment progress (5 seconds duration total)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showStoryModal, activeStoryUserIndex, activeStoryIndex, showViewersSheet]);

  const goNextStory = () => {
    setStoryProgress(0);
    if (activeStoryIndex < activeUserWithStories.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeStoryUserIndex < stories.length - 1) {
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
      setActiveStoryUserIndex(prev => prev - 1);
      const prevUser = stories[activeStoryUserIndex - 1];
      setActiveStoryIndex(prevUser.stories.length - 1);
    } else {
      // Restart current story
      setStoryProgress(0);
    }
  };

  const openStoryViewer = (userIndex: number) => {
    setActiveStoryUserIndex(userIndex);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setShowViewersSheet(false);
    setShowStoryModal(true);
  };

  const formatViewTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  const openComments = async (confession: any) => {
    setSelectedConfession(confession);
    setReplyingTo(null);
    setCommentText('');
    setComments([]);
    setLoadingComments(true);

    if (sessionToken === 'dummy_token') {
      setComments([
        { comment_id: 'c_1', content: 'Omg yes, totally agree with this! 🙌', created_at: new Date(Date.now() - 1800000).toISOString(), college_name: 'LSR', parent_id: null },
        { comment_id: 'c_2', content: 'Same here, let’s connect!', created_at: new Date(Date.now() - 900000).toISOString(), college_name: 'Stephens', parent_id: 'c_1' }
      ]);
      setLoadingComments(false);
      return;
    }

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

  const postComment = async () => {
    if (!commentText.trim() || !selectedConfession) return;
    setPostingComment(true);

    if (sessionToken === 'dummy_token') {
      const newComment = {
        comment_id: `comment_local_${Date.now()}`,
        content: commentText.trim(),
        created_at: new Date().toISOString(),
        college_name: college?.short_name || 'My Campus',
        parent_id: replyingTo ? replyingTo.comment_id : null
      };
      setComments(prev => [...prev, newComment]);

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
          <Text style={styles.commentAnon}>Anonymous • {node.college_name || 'Campus'}</Text>
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
    if (feedType === 'college') {
      return c.college_id === user?.college_id;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Grayscale aesthetic dark portrait background image */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop&q=80' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={Platform.OS === 'android' ? 25 : 0}
      />
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject}>
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
                <LinearGradient
                  colors={['#FF007F', '#7F00FF', '#00FFFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Ionicons name="sparkles" size={15} color="#FFF" />
                </LinearGradient>
                <TouchableOpacity
                  style={styles.newHeaderDropdown}
                  onPress={() => setFeedType(prev => prev === 'global' ? 'college' : 'global')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.newHeaderTitle} numberOfLines={1}>
                    {feedType === 'global' ? 'Global Live' : (college?.short_name || college?.name || 'My Campus')}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.newHeaderRight}>
                {/* Live count badge */}
                <View style={styles.newLiveBadge}>
                  <View style={styles.newLiveDot} />
                  <Text style={styles.newLiveText}>{feedType === 'global' ? '142 Live' : '18 Live'}</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                  <Ionicons name="notifications-outline" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.7}>
                  {user?.picture || user?.photos?.[0] ? (
                    <Image source={{ uri: user.picture || user.photos[0] }} style={styles.headerAvatar} />
                  ) : (
                    <View style={[styles.headerAvatar, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>{user?.name?.[0] || 'U'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Section Title: Stories */}
            <View style={styles.sectionHeadMini}>
              <Text style={styles.sectionHeadLabel}>Stories on Live</Text>
            </View>

            {/* Stories List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
              {/* Create Story Button */}
              <TouchableOpacity style={styles.storyItem} onPress={() => setShowPickModal(true)}>
                <View style={styles.addStoryCircle}>
                  <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFillObject} />
                  <Ionicons name="camera" size={24} color="#FF1B6B" />
                  <View style={styles.addPlus}><Ionicons name="add" size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.storyName}>Your Story</Text>
              </TouchableOpacity>

              {/* Display Active Stories */}
              {stories.map((s: any, userIndex: number) => (
                <TouchableOpacity key={s.user_id} style={styles.storyItem} onPress={() => openStoryViewer(userIndex)}>
                  <View style={{ position: 'relative' }}>
                    <LinearGradient
                      colors={s.has_unviewed ? ['#FF007F', '#7F00FF', '#00FFFF'] : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)']}
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
                    {s.user_id === user?.user_id ? 'My Stories' : s.user_name?.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

          {/* Slim Line Divider */}
          <View style={styles.divider} />

          {/* Top Vibes */}
          {topVibes.length > 0 && (
            <>
              <View style={styles.sectionHead}>
                <View style={styles.trophyIc}><Ionicons name="trophy" size={18} color="#FFD700" /></View>
                <Text style={styles.sectionT}>Top Campus Vibes</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
                style={{ marginBottom: 8, marginTop: 4 }}
              >
                {topVibes.map((u, i) => (
                  <View key={u.user_id} style={styles.newVibeCard}>
                    {u.photos?.[0] || u.picture ? (
                      <Image source={{ uri: u.photos?.[0] || u.picture }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
                    )}
                    <LinearGradient
                      colors={['rgba(7, 8, 15, 0.1)', 'rgba(7, 8, 15, 0.85)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    
                    {/* Rank tag floating on top */}
                    <LinearGradient
                      colors={i === 0 ? ['#007AFF', '#0055D0'] : i === 1 ? ['#9D4EDD', '#7B2CBF'] : ['#E29578', '#D76A03']}
                      style={styles.newRankTag}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.newRankTagText}>
                        {i === 0 ? '🏆 #1 Vibe' : i === 1 ? '✨ #2 Vibe' : '⭐ #3 Vibe'}
                      </Text>
                    </LinearGradient>

                    {/* User Info at the bottom of card */}
                    <View style={styles.newVibeCardBottom}>
                      <Text style={styles.newVibeName} numberOfLines={1}>{u.name}</Text>
                      <Text style={styles.newVibeBio} numberOfLines={1}>{u.bio || u.course || 'Campus star'}</Text>
                      
                      <View style={styles.newVibeScoreRow}>
                        <Ionicons name="sparkles" size={11} color="#FFD700" style={{ marginRight: 2 }} />
                        <Text style={styles.newVibeScoreText}>{u.vibe_score?.toFixed(1)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Confessions Title */}
          <View style={styles.sectionHead}>
            <View style={styles.megaphoneIc}>
              <Ionicons name="megaphone" size={18} color="#FF1B6B" />
            </View>
            <Text style={styles.sectionT}>Live Confessions</Text>
          </View>

          {/* Premium Frosted Composer */}
          <View style={styles.premiumComposerWrapper}>
            <BlurView intensity={35} tint="light" style={styles.composerGlass}>
              <TextInput
                style={styles.composerInput}
                placeholder="Drop an anonymous confession..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={text}
                onChangeText={setText}
                maxLength={300}
                returnKeyType="send"
                onSubmitEditing={post}
              />
              <TouchableOpacity
                style={[styles.composerSendBtn, !text.trim() && styles.composerSendBtnDisabled]}
                onPress={post}
                disabled={!text.trim() || posting}
                activeOpacity={0.7}
              >
                {posting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <LinearGradient
                    colors={['#C2FF3D', '#C2FF3D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendBtnGrad}
                  >
                    <Ionicons name="arrow-up" size={18} color="#000" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Confessions Grid */}
          <View style={styles.gridContainer}>
            {filteredConfessions.map((c: any) => {
              const bgImage = getCardBg(c.confession_id);
              return (
                <TouchableOpacity
                  key={c.confession_id}
                  style={styles.newConfGridCard}
                  onPress={() => openComments(c)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: bgImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  <LinearGradient
                    colors={['rgba(7, 8, 15, 0.4)', 'rgba(7, 8, 15, 0.88)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  
                  {/* Card Header Overlay */}
                  <View style={styles.cardHeader}>
                    <LinearGradient
                      colors={['#FF1B6B', '#FF8C00']}
                      style={styles.cardHeaderAvatar}
                    >
                      <Ionicons name="eye" size={10} color="#FFF" />
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.cardHeaderName} numberOfLines={1}>Anon</Text>
                      <Text style={styles.cardHeaderSub} numberOfLines={1}>
                        {c.college_id === user?.college_id ? (college?.short_name || 'Campus') : 'Global'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.cardFollowBtn} 
                      onPress={(e) => { e.stopPropagation(); openComments(c); }}
                      activeOpacity={0.8}
                    >
                      <BlurView intensity={25} tint="light" style={StyleSheet.absoluteFillObject} />
                      <Text style={styles.cardFollowBtnText}>Reply</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Card Confession Text Body */}
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTxt} numberOfLines={4}>
                      {c.content}
                    </Text>
                  </View>

                  {/* Bottom overlay badges */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.liveBadgeMini}>
                      <Text style={styles.liveBadgeMiniText}>LIVE</Text>
                    </View>
                    <Text style={styles.cardTimeText}>
                      {c.created_at && formatDistanceToNow(new Date(c.created_at), { addSuffix: false }).replace('about', '').trim()}
                    </Text>
                    
                    <View style={styles.cardStatsGroup}>
                      <TouchableOpacity style={styles.cardStatIconBtn} onPress={(e) => { e.stopPropagation(); likeC(c.confession_id); }}>
                        <Ionicons name="heart" size={11} color="#FF2D55" />
                        <Text style={styles.cardStatText}>{c.likes || 0}</Text>
                      </TouchableOpacity>
                      <View style={styles.cardStatIconBtn}>
                        <Ionicons name="chatbubble" size={10} color="#FFF" />
                        <Text style={styles.cardStatText}>{c.comments || 0}</Text>
                      </View>
                    </View>
                  </View>
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
          onRequestClose={() => setSelectedConfession(null)}
        >
          <SafeAreaView style={styles.commentsModalContainer}>
            {/* Modal Header */}
            <View style={styles.commentsModalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setSelectedConfession(null)}
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
                <View style={styles.modalConfCard}>
                  <View style={styles.modalConfTop}>
                    <Text style={styles.modalConfHeaderAnon}>
                      Anonymous • {selectedConfession.college_id === user?.college_id ? (college?.short_name || 'Campus') : 'Global'}
                    </Text>
                    <Text style={styles.modalConfTime}>
                      {selectedConfession.created_at && formatDistanceToNow(new Date(selectedConfession.created_at), { addSuffix: false })} ago
                    </Text>
                  </View>
                  <View style={styles.modalMessageBubble}>
                    <Text style={styles.modalConfTxt}>{selectedConfession.content}</Text>
                  </View>
                  <View style={styles.modalConfActions}>
                    <TouchableOpacity style={styles.modalConfAct} onPress={() => likeC(selectedConfession.confession_id)}>
                      <Ionicons name="heart" size={16} color="#FF2D55" />
                      <Text style={styles.modalConfActT}>{selectedConfession.likes || 0}</Text>
                    </TouchableOpacity>
                    <View style={styles.modalConfAct}>
                      <Ionicons name="chatbubble" size={14} color="#FFF" />
                      <Text style={styles.modalConfActT}>{selectedConfession.comments || 0}</Text>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.repliesTitleHeader}>Replies</Text>

              {loadingComments ? (
                <ActivityIndicator color="#ee4d4d" size="large" style={{ marginTop: 20 }} />
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
          </SafeAreaView>
        </Modal>

        {/* MODAL 1: PICK IMAGE METHOD DIALOG */}
        <Modal transparent={true} visible={showPickModal} animationType="fade" onRequestClose={() => setShowPickModal(false)}>
          <TouchableOpacity style={styles.dialogBackdrop} activeOpacity={1} onPress={() => setShowPickModal(false)}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add to your Story 📸</Text>
              <Text style={styles.dialogDesc}>Share a moment with campus mates, matches, or the global network.</Text>
              
              <TouchableOpacity style={styles.dialogOptBtn} onPress={handleCameraLaunch} activeOpacity={0.8}>
                <View style={[styles.dialogOptIcon, { backgroundColor: 'rgba(255, 27, 107, 0.1)' }]}>
                  <Ionicons name="camera" size={22} color="#FF1B6B" />
                </View>
                <Text style={styles.dialogOptText}>Open Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dialogOptBtn} onPress={handleGalleryLaunch} activeOpacity={0.8}>
                <View style={[styles.dialogOptIcon, { backgroundColor: 'rgba(6, 214, 160, 0.1)' }]}>
                  <Ionicons name="images" size={22} color="#06D6A0" />
                </View>
                <Text style={styles.dialogOptText}>Open Gallery</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MODAL 2: STORY AUDIENCE PRIVACY SETTING */}
        <Modal transparent={true} visible={showAudienceModal} animationType="slide" onRequestClose={() => setShowAudienceModal(false)}>
          <View style={styles.dialogBackdrop}>
            <View style={styles.audienceSheet}>
              <View style={styles.dragHandle} />
              <Text style={styles.sheetTitle}>Choose Story Audience 🔒</Text>
              <Text style={styles.sheetDesc}>Select who can view your active 24h story post.</Text>

              {/* College Visibility Option */}
              <TouchableOpacity style={styles.audienceOpt} onPress={() => handlePostStory('college')} activeOpacity={0.8}>
                <View style={styles.audienceIconWrapper}>
                  <Ionicons name="school" size={22} color="#9D4EDD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.audienceName}>My College</Text>
                  <Text style={styles.audienceDetail}>Only visible to campus mates at {college?.short_name || 'your college'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              {/* Matches Visibility Option */}
              <TouchableOpacity style={styles.audienceOpt} onPress={() => handlePostStory('matches')} activeOpacity={0.8}>
                <View style={styles.audienceIconWrapper}>
                  <Ionicons name="heart" size={22} color="#ee4d4d" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.audienceName}>My Matches</Text>
                  <Text style={styles.audienceDetail}>Only visible to people you have mutually matched with</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              {/* Global Network Visibility Option */}
              <TouchableOpacity style={styles.audienceOpt} onPress={() => handlePostStory('global')} activeOpacity={0.8}>
                <View style={styles.audienceIconWrapper}>
                  <Ionicons name="globe" size={22} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.audienceName}>Global Network</Text>
                    <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>PREMIUM</Text></View>
                  </View>
                  <Text style={styles.audienceDetail}>Visible globally to all colleges on the network</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => { setShowAudienceModal(false); setStoryImage(null); }} activeOpacity={0.8}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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

              <TouchableOpacity style={styles.premiumCloseBtn} onPress={() => setShowBuyPremiumPopup(false)} activeOpacity={0.8}>
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
                  <Text style={styles.storyHeadTime}>
                    {activeStory.createdAt ? formatViewTime(activeStory.createdAt) : ''}
                    {activeStory.audience ? ` • ${activeStory.audience.toUpperCase()}` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.storyClose} onPress={() => setShowStoryModal(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Left/Right Press Controls */}
            <TouchableOpacity style={styles.storyLeftTap} onPress={goPrevStory} activeOpacity={1} />
            <TouchableOpacity style={styles.storyRightTap} onPress={goNextStory} activeOpacity={1} />

            {/* Story Image */}
            {activeStory && (
              <Image source={{ uri: `${EXPO_PUBLIC_BACKEND_URL}/${activeStory.image}` }} style={styles.storyMainImg} />
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
                          const vName = hasDetails ? v.user_name : 'Campus Mate';
                          const vPic = hasDetails ? v.user_picture : null;
                          const vTime = hasDetails && v.viewed_at ? formatViewTime(v.viewed_at) : 'Some time ago';
                          
                          return (
                            <View key={index} style={styles.viewerRow}>
                              {vPic ? (
                                <Image source={{ uri: vPic }} style={styles.viewerPic} />
                              ) : (
                                <View style={[styles.viewerPic, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                                  <Text style={{ color: '#FFF', fontWeight: '800' }}>{vName[0]}</Text>
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={styles.viewerName}>{vName}</Text>
                                <Text style={styles.viewerTime}>{vTime}</Text>
                              </View>
                            </View>
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
      </SafeAreaView>
    </BlurView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },

  // Redesigned Header Styles
  newHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 36,
    paddingBottom: 16,
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
  storiesScroll: { flexGrow: 0, marginBottom: 16 },
  storyItem: { alignItems: 'center', gap: 6, width: 72 },
  addStoryCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'relative',
    overflow: 'hidden',
  },
  addPlus: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    backgroundColor: '#FF1B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0B0B0C',
  },
  storyRing: { width: 72, height: 72, borderRadius: 36, padding: 2, alignItems: 'center', justifyContent: 'center' },
  storyInner: { width: '100%', height: '100%', borderRadius: 36, backgroundColor: '#0B0B0C', padding: 2 },
  storyImg: { width: '100%', height: '100%', borderRadius: 32 },
  storyName: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  storyOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0B0B0C',
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

  // Confessions Grid Styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  newConfGridCard: {
    width: (width - 44) / 2,
    height: width * 0.62,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'space-between',
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  cardHeaderAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeaderSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '500',
    marginTop: -1,
  },
  cardFollowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.4)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFollowBtnText: {
    color: '#C2FF3D',
    fontSize: 9,
    fontWeight: '700',
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 5,
  },
  cardTxt: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  liveBadgeMini: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeMiniText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '900',
  },
  cardTimeText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    marginLeft: 5,
    fontWeight: '600',
  },
  cardStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
  },
  cardStatIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardStatText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 9,
    fontWeight: '700',
  },

  // Comments modal & threads styles
  commentsModalContainer: { flex: 1, backgroundColor: 'rgba(7, 8, 15, 0.98)' },
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
  commentBodyRow: { paddingLeft: 2 },
  commentText: { color: '#FFF', fontSize: 13, lineHeight: 17 },
  commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4 },
  commentReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  commentReplyText: { color: '#C2FF3D', fontSize: 11, fontWeight: '600' },
  nestedRepliesContainer: { borderLeftWidth: 1.5, borderLeftColor: 'rgba(255, 255, 255, 0.1)', marginLeft: 6, paddingLeft: 10, marginTop: 4 },
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
  audienceSheet: { backgroundColor: '#0B0B0C', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 36, gap: 16 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sheetDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  audienceOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 12 },
  audienceIconWrapper: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
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
});
