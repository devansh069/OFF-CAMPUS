import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Swipeable from 'react-native-gesture-handler/Swipeable';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Messages() {
  const { sessionToken, user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetUserId, setReportTargetUserId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState('Spam / Fake Profile');
  const [customReason, setCustomReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Custom Tags Config States
  const [myChosenTags, setMyChosenTags] = useState<string[]>([]);
  const [showTagsSetupModal, setShowTagsSetupModal] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([
    'talking stage',
    'serious',
    'shadi material',
    'situationship',
    'relationship number 2',
    'fwd'
  ]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCustomTagText, setNewCustomTagText] = useState('');

  // Assign Tag Modal States
  const [showAssignTagModal, setShowAssignTagModal] = useState(false);
  const [selectedAssignPartnerId, setSelectedAssignPartnerId] = useState<string | null>(null);
  const [selectedAssignPartnerName, setSelectedAssignPartnerName] = useState<string | null>(null);
  const [selectedAssignPartnerCurrentTag, setSelectedAssignPartnerCurrentTag] = useState<string | null>(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'colleges' | 'tags'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showTagFilterDropdown, setShowTagFilterDropdown] = useState(false);

  // Stories States
  const [storiesFeed, setStoriesFeed] = useState<any[]>([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [activeStoryUserIndex, setActiveStoryUserIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
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

  useEffect(() => {
    if (!showStoryModal) {
      setIsStoryPaused(false);
    }
  }, [showStoryModal]);

  const reportReasons = [
    'Spam / Fake Profile',
    'Harassment or Abuse',
    'Inappropriate Content / Photos',
    'Underage User',
    'Other (describe below)'
  ];

  // Unmatch handler
  const handleUnmatch = (targetUserId: string, userName: string) => {
    Alert.alert(
      'Unmatch User ❌',
      `Are you sure you want to unmatch with ${userName}? This will permanently remove your match and conversation history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/unmatch`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ target_user_id: targetUserId })
              });
              if (response.ok) {
                Alert.alert('Unmatched', `You have successfully unmatched with ${userName}.`);
                fetchConversations();
                fetchMatches();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.detail || 'Failed to unmatch user.');
              }
            } catch (err) {
              console.error('Unmatch error:', err);
              Alert.alert('Network Error', 'Failed to reach the server.');
            }
          }
        }
      ]
    );
  };

  // Report handler (open modal)
  const handleReportPress = (targetUserId: string) => {
    setReportTargetUserId(targetUserId);
    setSelectedReason('Spam / Fake Profile');
    setCustomReason('');
    setShowReportModal(true);
  };

  // Submit report to backend
  const handleReportSubmit = async () => {
    if (!reportTargetUserId) return;
    
    let finalReason = selectedReason;
    if (selectedReason.startsWith('Other') && !customReason.trim()) {
      Alert.alert('Reason Required', 'Please type a reason for your report.');
      return;
    }
    if (customReason.trim()) {
      finalReason = `${selectedReason}: ${customReason.trim()}`;
    }

    setSubmittingReport(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          target_user_id: reportTargetUserId,
          reason: finalReason
        })
      });
      if (response.ok) {
        Alert.alert(
          'Report Submitted 🛡️',
          'Thank you for reporting. Our safety team will review this profile within 24 hours. The user has been unmatched and blocked.',
          [{ text: 'OK' }]
        );
        setShowReportModal(false);
        fetchConversations();
        fetchMatches();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to submit report.');
      }
    } catch (err) {
      console.error('Report error:', err);
      Alert.alert('Network Error', 'Could not submit report. Please check connection.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const renderRightActions = (progress: any, dragX: any, targetUser: any) => {
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.unmatchButton]}
          onPress={() => handleUnmatch(targetUser.user_id, targetUser.name)}
        >
          <Ionicons name="close-circle-outline" size={20} color="#FFF" />
          <Text style={styles.actionButtonText}>Unmatch</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.reportButton]}
          onPress={() => handleReportPress(targetUser.user_id)}
        >
          <Ionicons name="flag-outline" size={20} color="#FFF" />
          <Text style={styles.actionButtonText}>Report</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const fetchStories = async () => {
    if (sessionToken === 'dummy_token' || !sessionToken) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/stories/matches-feed`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      setStoriesFeed(data.feed || []);
    } catch (e) {
      console.error('Error fetching matches stories:', e);
    }
  };

  const fetchMyChosenTags = async () => {
    if (sessionToken === 'dummy_token' || !sessionToken) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/tags/my`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      const tags = data.tags || [];
      setMyChosenTags(tags);
    } catch (e) {
      console.error('Error fetching chosen tags:', e);
    }
  };

  const handleSaveChosenTags = async (tags: string[]) => {
    if (sessionToken === 'dummy_token' || !sessionToken) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/tags/my`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ tags })
      });
      if (response.ok) {
        setMyChosenTags(tags);
        setShowTagsSetupModal(false);
        fetchConversations();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to save tags.');
      }
    } catch (e) {
      console.error('Error saving tags:', e);
      Alert.alert('Error', 'Network error.');
    }
  };

  const handleAssignTag = async (partnerId: string, tag: string | null) => {
    if (sessionToken === 'dummy_token' || !sessionToken) return;
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/tags/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ target_user_id: partnerId, tag })
      });
      if (response.ok) {
        setShowAssignTagModal(false);
        fetchConversations();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to assign tag.');
      }
    } catch (e) {
      console.error('Error assigning tag:', e);
      Alert.alert('Error', 'Network error.');
    }
  };

  // Story viewer navigation helpers
  const activeUserWithStories = storiesFeed[activeStoryUserIndex];
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
      console.warn('Failed to view story:', e);
    }
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
              fetchStories();
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

  useEffect(() => {
    if (showStoryModal && activeStory && !isOwnStory) {
      registerStoryView(activeStory.story_id);
    }
  }, [showStoryModal, activeStoryUserIndex, activeStoryIndex]);

  useEffect(() => {
    if (!showStoryModal || showViewersSheet || isStoryPaused) return;

    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          goNextStory();
          return 0;
        }
        return prev + 0.01; // 10 seconds duration (0.01 every 100ms)
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showStoryModal, activeStoryUserIndex, activeStoryIndex, showViewersSheet, isStoryPaused]);

  const goNextStory = () => {
    setStoryProgress(0);
    if (activeStoryIndex < activeUserWithStories.stories.length - 1) {
      setActiveStoryIndex(prev => prev + 1);
    } else if (activeStoryUserIndex < storiesFeed.length - 1) {
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
      const prevUser = storiesFeed[activeStoryUserIndex - 1];
      setActiveStoryIndex(prevUser.stories.length - 1);
    } else {
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

  const formatViewTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  useEffect(() => {
    // Merge backend custom tags into available list
    if (myChosenTags.length > 0) {
      setAvailableTags(prev => {
        const merged = [...prev];
        myChosenTags.forEach(tag => {
          if (!merged.includes(tag)) {
            merged.push(tag);
          }
        });
        return merged;
      });
    }
  }, [myChosenTags]);

  useEffect(() => {
    fetchConversations();
    fetchMatches();
    fetchStories();
    fetchMyChosenTags();
    const interval = setInterval(() => {
      fetchConversations();
      fetchMatches();
      fetchStories();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    if (sessionToken === 'dummy_token') {
      setConversations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error: any) {
      console.warn('Error fetching conversations:', error.message);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMatches = async () => {
    if (sessionToken === 'dummy_token') {
      setMatches([]);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/matches`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
    fetchMatches();
    fetchStories();
    fetchMyChosenTags();
  };

  const activeUserIds = conversations.map(c => c.user.user_id);
  const newMatches = matches.filter(m => !activeUserIds.includes(m.user_id));

  const filteredConversations = conversations.filter(conv =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ee4d4d" />
      </View>
    );
  }

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
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.inboxHeading}>Inbox</Text>
            <Image
              source={require('../../assets/images/logo_off.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Horizontal Stories Carousel */}
        <View style={styles.storiesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScrollContent}>
            {(() => {
              const userMainPhoto = user?.photos?.[0] || user?.picture;
              return (
                <TouchableOpacity
                  style={styles.storyItem}
                  onPress={() => {
                    Alert.alert(
                      'Post Story 📸',
                      'Story can only be uploaded from the Feed page. Please go to the Feed page and select the appropriate audience.',
                      [
                        { text: 'Go to Feed', onPress: () => router.push('/(tabs)/confessions') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <View style={styles.storyAvatarWrapper}>
                    {userMainPhoto ? (
                      <Image source={{ uri: userMainPhoto }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatar, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: '#FFF', fontWeight: '800' }}>Y</Text>
                      </View>
                    )}
                    <View style={styles.storyPlusBadge}>
                      <Ionicons name="add" size={12} color="#000" />
                    </View>
                  </View>
                  <Text style={styles.storyUsername} numberOfLines={1}>Your Story</Text>
                </TouchableOpacity>
              );
            })()}

            {/* Matches stories bubbles */}
            {storiesFeed.filter(g => g.user_id !== user?.user_id).map((group) => {
              const absIdx = storiesFeed.findIndex(g => g.user_id === group.user_id);
              return (
                <TouchableOpacity
                  key={group.user_id}
                  style={styles.storyItem}
                  onPress={() => openStoryViewer(absIdx)}
                >
                  <View style={{ position: 'relative' }}>
                    <LinearGradient
                      colors={group.has_unviewed ? ['#C2FF3D', '#FF1B6B'] : ['#71717A', '#71717A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.inboxStoryRing}
                    >
                      <View style={styles.inboxStoryInner}>
                        {group.user_picture ? (
                          <Image source={{ uri: group.user_picture }} style={styles.inboxStoryImg} />
                        ) : (
                          <View style={[styles.inboxStoryImg, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 22 }}>{group.user_name?.[0]}</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </View>
                  <Text style={styles.storyUsername} numberOfLines={1}>
                    {group.user_name?.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            onPress={() => {
              setSelectedFilter('all');
              setSelectedTagFilter(null);
            }}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'colleges' && styles.filterTabActive]}
            onPress={() => {
              setSelectedFilter('colleges');
              setSelectedTagFilter(null);
            }}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'colleges' && styles.filterTabTextActive]}>Colleges</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'tags' && styles.filterTabActive]}
            onPress={() => {
              setSelectedFilter('tags');
              setShowTagFilterDropdown(true);
            }}
          >
            <Text style={[styles.filterTabText, selectedFilter === 'tags' && styles.filterTabTextActive]}>
              {selectedTagFilter ? `Tag: ${selectedTagFilter}` : 'Tags'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selectedFilter === 'tags' ? '#C2FF3D' : 'rgba(255,255,255,0.4)'} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manageTagsBtn}
            onPress={() => setShowTagsSetupModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={14} color="#FFF" />
            <Text style={styles.manageTagsBtnText}>Tags</Text>
          </TouchableOpacity>
        </View>

        {/* Chats feed list */}
        {(() => {
          const filteredConversations = conversations.filter(conv => {
            const matchesSearch = conv.user.name.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            if (selectedFilter === 'colleges') {
              return conv.user.college_id === user?.college_id;
            }
            if (selectedFilter === 'tags') {
              if (!selectedTagFilter) return true;
              return conv.assigned_tag === selectedTagFilter;
            }
            return true;
          });

          return filteredConversations.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyStateScroll}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ee4d4d" />}
            >
              <View style={styles.emptyState}>
                <Text style={styles.sadEmoji}>😢</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No chats found' : 'No active chats yet'}
                </Text>
                <Text style={styles.emptySubText}>
                  {searchQuery
                    ? 'Try searching for another match'
                    : 'Start swiping and connect with other college students!'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.exploreBtn}
                    onPress={() => router.push('/(tabs)/discover')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.exploreBtnText}>Go to Vibe Page</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.glassListScrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ee4d4d" />}
            >
              {filteredConversations.map((conv: any) => {
                const hasUnread = conv.unread_count > 0;
                return (
                  <View key={conv.user.user_id}>
                    <Swipeable
                      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, conv.user)}
                      containerStyle={styles.swipeContainer}
                    >
                      <TouchableOpacity
                        style={styles.conversationItem}
                        onPress={() => router.push(`/chat/${conv.user.user_id}`)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.avatarWrapper}>
                          <Image
                            source={{
                              uri: conv.user.photos?.[0] || conv.user.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAyIiBoZWlnaHQ9IjYwMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAyIiBoZWlnaHQ9IjYwMiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg=='
                            }}
                            style={styles.avatar}
                          />
                          {conv.user.is_on_campus && (
                            <View style={styles.onlineBadge} />
                          )}
                        </View>
                        <View style={styles.convInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.convName}>{conv.user.name}</Text>
                            {conv.assigned_tag && (
                              <View style={styles.assignedTagBadge}>
                                <Text style={styles.assignedTagBadgeText}>{conv.assigned_tag}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.convPreviewRow}>
                            <Text
                              style={[
                                styles.convMessage,
                                hasUnread && styles.convMessageUnread
                              ]}
                              numberOfLines={1}
                            >
                              {conv.last_message?.content || 'Say hi! 👋'}
                            </Text>
                            <Text style={styles.convDotSep}>•</Text>
                            <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
                              {conv.last_message?.created_at ? formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false }).replace('about', '').trim() : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {hasUnread && (
                            <View style={styles.unreadBadgeDot} />
                          )}
                          <TouchableOpacity
                            style={styles.assignTagTriggerBtn}
                            onPress={() => {
                              setSelectedAssignPartnerId(conv.user.user_id);
                              setSelectedAssignPartnerName(conv.user.name);
                              setSelectedAssignPartnerCurrentTag(conv.assigned_tag || null);
                              setShowAssignTagModal(true);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="pricetag-outline" size={16} color="rgba(255, 255, 255, 0.4)" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </Swipeable>
                  </View>
                );
              })}
            </ScrollView>
          );
        })()}
      </SafeAreaView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report User 🛡️</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalDesc}>
                Help us keep Off-Campus safe. Tell us why you are reporting this user. They will be unmatched and blocked instantly.
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

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowReportModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submittingReport && { opacity: 0.5 }]}
                  onPress={handleReportSubmit}
                  disabled={submittingReport}
                >
                  {submittingReport ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* Tag Filter Dropdown Modal */}
      <Modal
        visible={showTagFilterDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTagFilterDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowTagFilterDropdown(false)}
        >
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>Filter by Tag</Text>
            {myChosenTags.length === 0 ? (
              <Text style={styles.dropdownEmptyText}>
                You haven't set up any tags yet.{'\n'}Tap the ⚙️ Tags button to create tags first.
              </Text>
            ) : (
              myChosenTags.map((tag) => {
                const isActive = selectedTagFilter === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedTagFilter(tag);
                      setShowTagFilterDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {tag}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={18} color="#C2FF3D" />}
                  </TouchableOpacity>
                );
              })
            )}
            <View style={styles.dropdownActions}>
              <TouchableOpacity
                style={styles.dropdownResetBtn}
                onPress={() => {
                  setSelectedTagFilter(null);
                  setShowTagFilterDropdown(false);
                }}
              >
                <Text style={styles.dropdownResetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownCloseBtn}
                onPress={() => setShowTagFilterDropdown(false)}
              >
                <Text style={styles.dropdownCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tags Setup Modal */}
      <Modal
        visible={showTagsSetupModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTagsSetupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Tags ✏️</Text>
              <TouchableOpacity onPress={() => setShowTagsSetupModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalDesc}>
                Choose up to 5 tags to categorize your matches. You can assign one tag to each match later.
              </Text>
              <View style={styles.tagsCounterRow}>
                <Text style={styles.tagsCounterText}>
                  {myChosenTags.length}/5 selected
                </Text>
                <TouchableOpacity
                  style={styles.addCustomTagIconBtn}
                  onPress={() => setShowCustomInput(!showCustomInput)}
                >
                  <Ionicons name={showCustomInput ? 'close-circle' : 'add-circle'} size={24} color="#C2FF3D" />
                </TouchableOpacity>
              </View>
              {showCustomInput && (
                <View style={styles.customTagInputRow}>
                  <TextInput
                    style={styles.customTagTextInput}
                    placeholder="Type custom tag..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={newCustomTagText}
                    onChangeText={setNewCustomTagText}
                    maxLength={20}
                  />
                  <TouchableOpacity
                    style={[styles.addCustomTagBtn, !newCustomTagText.trim() && { opacity: 0.4 }]}
                    disabled={!newCustomTagText.trim()}
                    onPress={() => {
                      const trimmed = newCustomTagText.trim().toLowerCase();
                      if (trimmed && !availableTags.includes(trimmed)) {
                        setAvailableTags(prev => [...prev, trimmed]);
                      }
                      if (trimmed && !myChosenTags.includes(trimmed) && myChosenTags.length < 5) {
                        setMyChosenTags(prev => [...prev, trimmed]);
                      }
                      setNewCustomTagText('');
                      setShowCustomInput(false);
                    }}
                  >
                    <Text style={styles.addCustomTagBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.tagsSelectionGrid}>
                {availableTags.map((tag) => {
                  const isSelected = myChosenTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagSelectBubble, isSelected && styles.tagSelectBubbleActive]}
                      onPress={() => {
                        if (isSelected) {
                          setMyChosenTags(prev => prev.filter(t => t !== tag));
                        } else if (myChosenTags.length < 5) {
                          setMyChosenTags(prev => [...prev, tag]);
                        } else {
                          Alert.alert('Limit Reached', 'You can select up to 5 tags.');
                        }
                      }}
                    >
                      <Text style={[styles.tagSelectBubbleText, isSelected && styles.tagSelectBubbleTextActive]}>
                        {tag}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#000" style={{ marginLeft: 4 }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowTagsSetupModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#C2FF3D' }]}
                  onPress={() => handleSaveChosenTags(myChosenTags)}
                >
                  <Text style={[styles.submitBtnText, { color: '#000' }]}>Save Tags</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* Assign Tag to Match Modal */}
      <Modal
        visible={showAssignTagModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAssignTagModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowAssignTagModal(false)}
        >
          <View style={styles.dropdownCard}>
            <Text style={styles.dropdownTitle}>
              Tag {selectedAssignPartnerName || 'Match'}
            </Text>
            {myChosenTags.length === 0 ? (
              <Text style={styles.dropdownEmptyText}>
                Set up your tags first using the ⚙️ Tags button above.
              </Text>
            ) : (
              <View style={styles.assignTagsList}>
                {myChosenTags.map((tag) => {
                  const isActive = selectedAssignPartnerCurrentTag === tag;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.assignTagRow, isActive && styles.assignTagRowActive]}
                      onPress={() => {
                        if (selectedAssignPartnerId) {
                          handleAssignTag(selectedAssignPartnerId, isActive ? null : tag);
                        }
                      }}
                    >
                      <Ionicons
                        name={isActive ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isActive ? '#C2FF3D' : 'rgba(255,255,255,0.3)'}
                      />
                      <Text style={[styles.assignTagText, isActive && styles.assignTagTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={styles.dropdownActions}>
              <TouchableOpacity
                style={styles.dropdownResetBtn}
                onPress={() => {
                  if (selectedAssignPartnerId) {
                    handleAssignTag(selectedAssignPartnerId, null);
                  }
                }}
              >
                <Text style={styles.dropdownResetBtnText}>Remove Tag</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownCloseBtn}
                onPress={() => setShowAssignTagModal(false)}
              >
                <Text style={styles.dropdownCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryModal}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setShowStoryModal(false)}
      >
        {activeUserWithStories && activeStory && (
          <View style={styles.storyViewContainer}>
            {/* Progress bars */}
            <View style={styles.progBarRow}>
              {activeUserWithStories.stories.map((_: any, idx: number) => {
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

            {/* Story header */}
            <View style={styles.storyHeader}>
              {activeUserWithStories.user_picture ? (
                <Image source={{ uri: activeUserWithStories.user_picture }} style={styles.storyHeadPic} />
              ) : (
                <View style={[styles.storyHeadPic, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFF', fontWeight: '900' }}>{activeUserWithStories?.user_name?.[0]}</Text>
                </View>
              )}
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.storyHeadName}>
                  {activeUserWithStories.user_name}
                </Text>
                <Text style={styles.storyHeadTime}>
                  {activeStory.createdAt ? formatViewTime(activeStory.createdAt) : activeStory.created_at ? formatViewTime(activeStory.created_at) : ''}
                </Text>
                {activeStory.audience ? (
                  <Text style={[styles.storyHeadTime, { marginTop: 2, fontWeight: '600', color: '#C2FF3D' }]}>
                    {activeStory.audience.toUpperCase()}
                  </Text>
                ) : null}
              </View>
              {isOwnStory && (
                <TouchableOpacity
                  style={{ marginLeft: 'auto', marginRight: 14, padding: 4 }}
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
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Tap areas */}
            <TouchableOpacity
              style={styles.storyLeftTap}
              onPress={goPrevStory}
              onPressIn={() => setIsStoryPaused(true)}
              onPressOut={() => setIsStoryPaused(false)}
              activeOpacity={1}
            />
            <TouchableOpacity
              style={styles.storyRightTap}
              onPress={goNextStory}
              onPressIn={() => setIsStoryPaused(true)}
              onPressOut={() => setIsStoryPaused(false)}
              activeOpacity={1}
            />

            {/* Story image wrapper with transitions */}
            <Animated.View style={{ width: '100%', height: '100%', opacity: storyFadeAnim, transform: [{ translateX: storySlideAnim }] }}>
              <Image source={{ uri: activeStory.image || activeStory.image_url }} style={styles.storyMainImg} />
            </Animated.View>

            {/* Viewers indicator (own stories only) */}
            {isOwnStory && (
              <TouchableOpacity
                style={styles.viewersIndicator}
                onPress={() => setShowViewersSheet(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-up" size={22} color="#FFF" style={styles.bounceUpIcon} />
                <View style={styles.viewsCountBadge}>
                  <Ionicons name="eye" size={14} color="#FF1B6B" />
                  <Text style={styles.viewsCountText}>
                    {activeStory.views?.length || 0} Views
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Viewers Sheet */}
            {showViewersSheet && isOwnStory && (
              <Modal
                visible={showViewersSheet}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowViewersSheet(false)}
              >
                <View style={styles.viewsDrawerBackdrop}>
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowViewersSheet(false)} />
                  <View style={styles.viewsDrawerSheet}>
                    <View style={styles.dragHandle} />
                    <View style={styles.viewsDrawerHeader}>
                      <Text style={styles.viewsDrawerTitle}>
                        Views ({activeStory.views?.length || 0})
                      </Text>
                      <TouchableOpacity style={styles.viewsDrawerClose} onPress={() => setShowViewersSheet(false)}>
                        <Ionicons name="close" size={22} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.viewsDrawerContent}>
                      {(!activeStory.views || activeStory.views.length === 0) ? (
                        <View style={styles.emptyViewers}>
                          <Ionicons name="eye-off-outline" size={32} color="rgba(255,255,255,0.2)" />
                          <Text style={styles.emptyViewersText}>No views yet</Text>
                        </View>
                      ) : (
                        activeStory.views.map((view: any) => (
                          <View key={view.user_id} style={styles.viewerRow}>
                            <Image source={{ uri: view.picture }} style={styles.viewerAvatar} />
                            <Text style={styles.viewerName}>{view.name}</Text>
                          </View>
                        ))
                      )}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}
      </Modal>

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
  centerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  instaUsername: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerLogo: {
    width: 46,
    height: 46,
  },
  inboxHeading: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '500' },
  clearSearchBtn: { padding: 4 },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'transparent',
  },
  storiesScrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  storyAvatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRingUnviewed: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#C2FF3D',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  storyRingViewed: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#71717A',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inboxStoryRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inboxStoryInner: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inboxStoryImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  storyUsername: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  filterTabText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#C2FF3D',
  },
  manageTagsBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  manageTagsBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownCard: {
    width: '80%',
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#0F0F14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dropdownTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  dropdownEmptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dropdownItemActive: {
    borderBottomColor: 'rgba(194, 255, 61, 0.1)',
  },
  dropdownItemText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14.5,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: '#C2FF3D',
    fontWeight: '800',
  },
  dropdownActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  dropdownResetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownResetBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  dropdownCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dropdownCloseBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tagsCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  tagsCounterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  addCustomTagIconBtn: {
    padding: 2,
  },
  customTagInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  customTagTextInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: '#FFF',
    paddingHorizontal: 12,
    height: 38,
    fontSize: 13,
  },
  addCustomTagBtn: {
    backgroundColor: '#C2FF3D',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomTagBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  tagsSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  tagSelectBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagSelectBubbleActive: {
    backgroundColor: '#C2FF3D',
    borderColor: '#C2FF3D',
  },
  tagSelectBubbleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  tagSelectBubbleTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  assignTagsList: {
    marginVertical: 12,
    gap: 8,
  },
  assignTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  assignTagRowActive: {
    borderColor: '#C2FF3D',
    backgroundColor: 'rgba(194, 255, 61, 0.05)',
  },
  assignTagText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  assignTagTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: 'transparent',
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 6.5, backgroundColor: '#06D6A0', borderWidth: 2, borderColor: '#000000' },
  convInfo: { flex: 1, gap: 4 },
  convName: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  assignedTagBadge: {
    backgroundColor: 'rgba(194, 255, 61, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  assignedTagBadgeText: {
    color: '#C2FF3D',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  convPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  convMessage: { fontSize: 13, color: 'rgba(255, 255, 255, 0.45)', flex: 1 },
  convMessageUnread: { color: '#FFF', fontWeight: '700' },
  convDotSep: { color: 'rgba(255, 255, 255, 0.25)', fontSize: 10 },
  convTime: { fontSize: 12, color: 'rgba(255, 255, 255, 0.45)' },
  convTimeUnread: { color: '#FFF', fontWeight: '700' },
  unreadBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  assignTagTriggerBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  storyViewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyPlusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  progBarRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    height: 2.5,
    gap: 4,
    zIndex: 100,
  },
  progBarWrapper: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
    width: '0%',
  },
  storyHeader: {
    position: 'absolute',
    top: 62,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  storyHeadPic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  storyHeadName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  storyHeadTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 1,
  },
  storyClose: {
    marginLeft: 'auto',
    padding: 4,
  },
  storyLeftTap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    zIndex: 50,
  },
  storyRightTap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '65%',
    zIndex: 50,
  },
  storyMainImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viewersIndicator: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    zIndex: 100,
  },
  bounceUpIcon: {
    marginBottom: 4,
  },
  viewsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewsCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  viewsDrawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  viewsDrawerSheet: {
    backgroundColor: '#0F0F14',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  viewsDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewsDrawerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  viewsDrawerClose: {
    padding: 2,
  },
  viewsDrawerContent: {
    paddingBottom: 24,
  },
  emptyViewers: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyViewersText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  viewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  viewerName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  glassListScrollContent: {
    paddingVertical: 8,
  },
  emptyStateScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sadEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  emptyState: { flex: 1, alignItems: 'center', gap: 12, justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptySubText: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  exploreBtn: { backgroundColor: '#C2FF3D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16, shadowColor: '#C2FF3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  exploreBtnText: { color: '#000', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  swipeContainer: {
    backgroundColor: 'transparent',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    width: 170,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 85,
    height: '100%',
  },
  unmatchButton: {
    backgroundColor: '#475569',
  },
  reportButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    gap: 16,
  },
  modalDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    lineHeight: 18,
  },
  reasonLabel: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  reasonOptionActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#EF4444',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  reasonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  reasonTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  reasonInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    color: '#FFF',
    padding: 12,
    height: 90,
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
