import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl, Modal, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
  const [refreshing, setRefreshing] = useState(false);
  const [confessionImage, setConfessionImage] = useState<string | null>(null);

  const selectConfImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Media library permission is required to select photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setConfessionImage(result.assets[0].base64);
    }
  };

  const [college, setCollege] = useState<any>(null);
  const [feedType, setFeedType] = useState<'global' | 'college'>('global');
  const [liveCountGlobal, setLiveCountGlobal] = useState(142);
  const [liveCountCollege, setLiveCountCollege] = useState(18);

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
            return updated;
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
      setStories(MOCK_STORIES);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${sessionToken}` };
      const [c, s, liveCountsRes] = await Promise.all([
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/feed`, { headers }).then(r => r.json()),
        fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/live-count`, { headers }).then(r => r.json()),
      ]);

      if (c.confessions) {
        setConfessions(c.confessions);
      } else {
        setConfessions(MOCK_CONFESSIONS);
      }

      if (s.users_with_stories) {
        setStories(s.users_with_stories);
      } else {
        setStories(MOCK_STORIES);
      }

      if (liveCountsRes) {
        setLiveCountGlobal(liveCountsRes.global || 0);
        setLiveCountCollege(liveCountsRes.college || 0);
      }
    } catch (e) {
      console.warn('fetchLive failed, using mock live data instead:', e);
      setConfessions(MOCK_CONFESSIONS);
      setStories(MOCK_STORIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const likeC = async (id: string) => {
    if (sessionToken === 'dummy_token') {
      setConfessions(prev => prev.map(c => c.confession_id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
      setSelectedConfession((prev: any) => prev && prev.confession_id === id ? { ...prev, likes: (prev.likes || 0) + 1 } : prev);
      return;
    }

    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${id}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionToken}` } });
      setConfessions(confessions.map(c => c.confession_id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
      setSelectedConfession((prev: any) => prev && prev.confession_id === id ? { ...prev, likes: (prev.likes || 0) + 1 } : prev);
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
  }).sort((a: any, b: any) => {
    if (feedType === 'college') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return (b.likes || 0) - (a.likes || 0);
    }
  });

  return (
    <View style={styles.container}>
      {/* Ambient background linear gradient */}
      <LinearGradient
        colors={['#050005', '#FF6CD2', '#5641FF', '#ACD0FF', '#050005']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Dark veil overlay for premium depth and text contrast */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />

      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={StyleSheet.absoluteFillObject}>
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
                  <Text style={styles.newLiveText}>{feedType === 'global' ? `${liveCountGlobal} Live` : `${liveCountCollege} Live`}</Text>
                </View>
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

            {/* Confessions Title */}
            <View style={styles.sectionHead}>
              <View style={styles.megaphoneIc}>
                <Ionicons name="megaphone" size={18} color="#FF1B6B" />
              </View>
              <Text style={styles.sectionT}>Live Confessions</Text>
            </View>

            {/* Premium Frosted Composer */}
            <View style={styles.premiumComposerWrapper}>
              {confessionImage && (
                <View style={styles.composerImagePreviewContainer}>
                  <Image source={{ uri: `data:image/jpeg;base64,${confessionImage}` }} style={styles.composerImagePreview} />
                  <TouchableOpacity style={styles.composerImageCloseBtn} onPress={() => setConfessionImage(null)}>
                    <Ionicons name="close-circle" size={20} color="#FF2D55" />
                  </TouchableOpacity>
                </View>
              )}

              <BlurView intensity={35} tint="light" style={styles.composerGlass}>
                <TouchableOpacity onPress={selectConfImage} style={styles.imageSelectBtn} activeOpacity={0.7}>
                  <Ionicons name="image" size={20} color={confessionImage ? '#C2FF3D' : '#FFF'} />
                </TouchableOpacity>

                <TextInput
                  style={styles.composerInput}
                  placeholder="Drop an anonymous confession..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={text}
                  onChangeText={setText}
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[styles.composerSendBtn, (!text.trim() && !confessionImage) && styles.composerSendBtnDisabled]}
                  onPress={post}
                  disabled={(!text.trim() && !confessionImage) || posting}
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
              </BlurView>            {/* Confessions List (Premium Slate Glass style) */}
            <View style={styles.gridContainer}>
              {filteredConfessions.map((c: any) => {
                return (
                  <TouchableOpacity
                    key={c.confession_id}
                    style={styles.twitterCard}
                    onPress={() => openComments(c)}
                    activeOpacity={0.9}
                  >
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
 
                    {/* Left: Minimal Slate Avatar */}
                    <View style={styles.twitterAvatarContainer}>
                      <View style={styles.twitterAvatarBg}>
                        <Ionicons name="eye-off" size={16} color="#A1A1AA" />
                      </View>
                    </View>
 
                    {/* Right: Content & Action buttons */}
                    <View style={styles.twitterContentContainer}>
                      {/* Premium Header row with subtle Badge */}
                      <View style={styles.twitterHeaderRow}>
                        <View style={styles.authorBadgeRow}>
                          <Text style={styles.twitterAuthorName}>Campus Voice</Text>
                          <View style={styles.collegeBadge}>
                            <Text style={styles.collegeBadgeText}>@{c.college_name?.toLowerCase() || 'campus'}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                          <Text style={styles.twitterTime}>
                            {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: false }).replace('about', '').trim() : 'now'}
                          </Text>
                          <Text style={styles.twitterDot}>·</Text>
                          <Ionicons name="ellipsis-horizontal" size={14} color="#71717A" />
                        </View>
                      </View>
 
                      {/* Premium text body */}
                      <Text style={styles.twitterText}>
                        {c.content}
                      </Text>
 
                      {/* Rounded attachment image */}
                      {c.image && (
                        <View style={styles.imageAttachmentWrapper}>
                          <Image
                            source={{ uri: c.image }}
                            style={styles.twitterAttachedImage}
                            resizeMode="cover"
                          />
                        </View>
                      )}
 
                      {/* Minimal actions footer */}
                      <View style={styles.twitterActionBar}>
                        <TouchableOpacity style={styles.twitterActionBtn} onPress={(e) => { e.stopPropagation(); likeC(c.confession_id); }}>
                          <Ionicons name="heart" size={16} color={c.likes > 0 ? "#FF3366" : "#71717A"} />
                          <Text style={[styles.twitterActionCount, { color: c.likes > 0 ? '#FF3366' : '#71717A' }]}>{c.likes || 0}</Text>
                        </TouchableOpacity>
 
                        <TouchableOpacity style={styles.twitterActionBtn} onPress={() => openComments(c)}>
                          <Ionicons name="chatbubble" size={14} color="#71717A" />
                          <Text style={[styles.twitterActionCount, { color: '#71717A' }]}>{c.comments || 0}</Text>
                        </TouchableOpacity>
 
                        <TouchableOpacity style={styles.twitterActionBtn} onPress={(e) => { e.stopPropagation(); }}>
                          <Ionicons name="share-social" size={14} color="#71717A" />
                        </TouchableOpacity>
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
                        Anonymous • {selectedConfession.college_name || 'Campus'}
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
                <TouchableOpacity style={styles.audienceOpt} onPress={() => {
                  Alert.alert(
                    'Premium Feature 🌟',
                    'Posting a story to the Global Network is a premium feature.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'OK', onPress: () => handlePostStory('global') }
                    ]
                  );
                }} activeOpacity={0.8}>
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
                <Image source={{ uri: activeStory.image }} style={styles.storyMainImg} />
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
    bottom: 0,
    right: 0,
    backgroundColor: '#FF1B6B',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  twitterCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
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
    justifyContent: 'space-between',
    paddingRight: 80,
    marginTop: 6,
  },
  twitterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  twitterActionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageSelectBtn: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerImagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  composerImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  composerImageCloseBtn: {
    marginLeft: -10,
    marginTop: -50,
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
