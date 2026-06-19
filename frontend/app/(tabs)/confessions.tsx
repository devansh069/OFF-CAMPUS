import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, RefreshControl, Modal, Dimensions } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

const { width, height: screenHeight } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ content: text, college_id: feedType === 'college' ? user?.college_id : null }),
      });
      setText('');
      await fetchAll();
    } catch (e) { console.error(e); }
    finally { setPosting(false); }
  };

  const likeC = async (id: string) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${id}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionToken}` } });
      setConfessions(confessions.map(c => c.confession_id === id ? { ...c, likes: (c.likes || 0) + 1 } : c));
    } catch (e) { console.error(e); }
  };

  // Image Picking Handlers
  const handleCameraLaunch = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setStoryImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setShowPickModal(false);
      setShowAudienceModal(true);
    }
  };

  const handleGalleryLaunch = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [9, 16], quality: 0.5, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setStoryImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setShowPickModal(false);
      setShowAudienceModal(true);
    }
  };

  // Story Posting Handlers
  const handlePostStory = async (audience: 'matches' | 'college' | 'global') => {
    if (audience === 'global' && !user?.is_premium) {
      setShowAudienceModal(false);
      setShowBuyPremiumPopup(true);
      return;
    }

    setPosting(true);
    try {
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF1B6B" /></View>;

  const filteredConfessions = confessions.filter((c: any) => {
    if (feedType === 'college') {
      return c.college_id === user?.college_id;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bg}>
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor="#FF1B6B" />}>
          <View style={styles.headerBar}>
            <View style={{ flex: 1 }} />
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>{feedType === 'global' ? '142 Live' : '18 Live'}</Text></View>
          </View>

          <TouchableOpacity
            style={styles.headerTitleContainer}
            onPress={() => setFeedType(prev => prev === 'global' ? 'college' : 'global')}
            activeOpacity={0.7}
          >
            <Text style={styles.heroT} numberOfLines={1}>
              {feedType === 'global' ? 'Global' : (college?.short_name || college?.name || 'My Campus')}
            </Text>
            <Ionicons name="chevron-down" size={24} color="#FFF" style={styles.chevronIcon} />
          </TouchableOpacity>

          {/* Stories List */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 14 }}>
            {/* Create Story Button */}
            <TouchableOpacity style={styles.storyItem} onPress={() => setShowPickModal(true)}>
              <View style={styles.addStoryCircle}>
                <Ionicons name="camera" size={28} color="#FF1B6B" />
                <View style={styles.addPlus}><Ionicons name="add" size={14} color="#FFF" /></View>
              </View>
              <Text style={styles.storyName}>Your Story</Text>
            </TouchableOpacity>

            {/* Display Active Stories */}
            {stories.map((s: any, userIndex: number) => (
              <TouchableOpacity key={s.user_id} style={styles.storyItem} onPress={() => openStoryViewer(userIndex)}>
                <LinearGradient colors={s.has_unviewed ? ['#FF1B6B', '#9D4EDD', '#FFD700'] : ['#3D2B4F', '#3D2B4F']} style={styles.storyRing}>
                  <View style={styles.storyInner}>
                    {s.user_picture ? <Image source={{ uri: s.user_picture }} style={styles.storyImg} /> : <View style={[styles.storyImg, { backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#FFF', fontWeight: '900', fontSize: 24 }}>{s.user_name?.[0]}</Text></View>}
                  </View>
                </LinearGradient>
                <Text style={styles.storyName} numberOfLines={1}>
                  {s.user_id === user?.user_id ? 'My Stories' : s.user_name?.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Slim Line Divider */}
          <View style={styles.divider} />

          {/* Sleek Inline Input */}
          <View style={styles.inlineInputRow}>
            <View style={styles.inlineEmojiCircle}>
              <Text style={{ fontSize: 18 }}>🤫</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              placeholder="Drop an anonymous confession..."
              placeholderTextColor="#6B5B7A"
              value={text}
              onChangeText={setText}
              maxLength={300}
              returnKeyType="send"
              onSubmitEditing={post}
            />
            <TouchableOpacity
              style={[styles.plusButton, !text.trim() && styles.plusButtonDisabled]}
              onPress={post}
              disabled={!text.trim() || posting}
              activeOpacity={0.7}
            >
              {posting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="add" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Slim Line Divider after input */}
          <View style={styles.divider} />

          {/* Top Vibes */}
          {topVibes.length > 0 && (
            <>
              <View style={styles.sectionHead}>
                <View style={styles.trophyIc}><Ionicons name="trophy" size={20} color="#06D6A0" /></View>
                <Text style={styles.sectionT}>Top Vibes</Text>
              </View>
              {topVibes.map((u, i) => (
                <View key={u.user_id} style={styles.vibeCard}>
                  <LinearGradient colors={i === 0 ? ['#FFD700', '#FFA500'] : i === 1 ? ['#C0C0C0', '#A8A8A8'] : ['#CD7F32', '#A05A2C']} style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{i + 1}</Text>
                  </LinearGradient>
                  {u.photos?.[0] || u.picture ? <Image source={{ uri: u.photos?.[0] || u.picture }} style={styles.vibePic} /> : <View style={[styles.vibePic, { backgroundColor: '#3D2B4F' }]} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vibeName}>{u.name}</Text>
                    <Text style={styles.vibeBio} numberOfLines={1}>{u.bio || u.course || 'Campus star ⭐'}</Text>
                  </View>
                  <View style={styles.vibeScoreBox}>
                    <Ionicons name="sparkles" size={14} color="#FFD700" />
                    <Text style={styles.vibeScoreT}>{u.vibe_score?.toFixed(1)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Confessions */}
          <View style={styles.sectionHead}>
            <Ionicons name="megaphone" size={20} color="#FF1B6B" />
            <Text style={styles.sectionT}>Confessions</Text>
          </View>
          {filteredConfessions.map((c: any) => (
            <View key={c.confession_id} style={styles.confCard}>
              <View style={styles.confTop}>
                <LinearGradient colors={['#FF1B6B', '#9D4EDD']} style={styles.confAv}>
                  <Text style={styles.confAvT}>🤫</Text>
                </LinearGradient>
                <View style={styles.confAnon}>
                  <Text style={styles.confAnonT}>Anonymous • {c.college_id === user?.college_id ? (college?.short_name || 'Campus') : 'Global'}</Text>
                </View>
                <Text style={styles.confTime}>{c.created_at && formatDistanceToNow(new Date(c.created_at), { addSuffix: false })}</Text>
              </View>
              <Text style={styles.confTxt}>{c.content}</Text>
              <View style={styles.confActions}>
                <TouchableOpacity style={styles.confAct} onPress={() => likeC(c.confession_id)}>
                  <Ionicons name="heart" size={18} color="#FF1B6B" />
                  <Text style={styles.confActT}>{c.likes || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confAct}>
                  <Ionicons name="chatbubble" size={16} color="#A899B8" />
                  <Text style={styles.confActT}>{c.comments || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>

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
                  <Ionicons name="heart" size={22} color="#FF1B6B" />
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
                <LinearGradient colors={['#FF1B6B', '#9D4EDD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buyBtnGradient}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3D1A2E', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#FF1B6B' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF1B6B' },
  liveText: { color: '#FF1B6B', fontSize: 12, fontWeight: '900' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  heroT: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  chevronIcon: { marginLeft: 8 },
  storiesScroll: { flexGrow: 0, marginBottom: 16 },
  storyItem: { alignItems: 'center', gap: 6, width: 72 },
  addStoryCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FF1B6B', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000', position: 'relative' },
  addPlus: { position: 'absolute', bottom: 0, right: 4, backgroundColor: '#FF1B6B', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000000' },
  storyRing: { width: 72, height: 72, borderRadius: 36, padding: 2, alignItems: 'center', justifyContent: 'center' },
  storyInner: { width: '100%', height: '100%', borderRadius: 36, backgroundColor: '#000000', padding: 2 },
  storyImg: { width: '100%', height: '100%', borderRadius: 32 },
  storyName: { color: '#C5B6D6', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255, 255, 255, 0.15)', marginHorizontal: 16, marginVertical: 12 },
  inlineInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  inlineEmojiCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  inlineInput: { flex: 1, color: '#FFF', fontSize: 15, paddingVertical: 8 },
  plusButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF1B6B', alignItems: 'center', justifyContent: 'center' },
  plusButtonDisabled: { backgroundColor: 'rgba(255, 255, 255, 0.2)', opacity: 0.5 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  trophyIc: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#06D6A022', alignItems: 'center', justifyContent: 'center' },
  sectionT: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  vibeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6, marginHorizontal: 16, padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 18, borderWidth: 1, borderColor: '#2A1B3D' },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  vibePic: { width: 50, height: 50, borderRadius: 25 },
  vibeName: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  vibeBio: { color: '#A899B8', fontSize: 12 },
  vibeScoreBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70022', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  vibeScoreT: { color: '#FFD700', fontWeight: '900' },
  confCard: { marginVertical: 8, marginHorizontal: 16, padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20, borderWidth: 1, borderColor: '#2A1B3D' },
  confTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  confAv: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  confAvT: { fontSize: 16, color: '#FFF' },
  confAnon: { backgroundColor: '#2A1B3D', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  confAnonT: { color: '#A899B8', fontSize: 12, fontWeight: '700' },
  confTime: { color: '#6B5B7A', fontSize: 12, marginLeft: 'auto' },
  confTxt: { color: '#FFF', fontSize: 16, lineHeight: 22 },
  confActions: { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  confAct: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confActT: { color: '#A899B8', fontWeight: '600' },

  // Picker modal and popups
  dialogBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.82)', justifyContent: 'center', alignItems: 'center' },
  dialogCard: { backgroundColor: '#0B0B0C', width: width - 48, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 24, gap: 16 },
  dialogTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  dialogDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20 },
  dialogOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14 },
  dialogOptIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dialogOptText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Audience settings styles
  audienceSheet: { backgroundColor: '#0B0B0C', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 36, gap: 16 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  sheetDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  audienceOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 14 },
  audienceIconWrapper: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  audienceName: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  audienceDetail: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  premiumBadge: { backgroundColor: 'rgba(255, 215, 0, 0.1)', borderWidth: 1, borderColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumBadgeText: { color: '#FFD700', fontSize: 8, fontWeight: '900' },
  sheetCancelBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 24, alignItems: 'center', marginTop: 8 },
  sheetCancelText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '700' },

  // Premium buy dialog
  premiumDialog: { backgroundColor: '#0B0B0C', width: width - 48, borderRadius: 28, borderWidth: 1, borderColor: '#FFD70022', padding: 28, alignItems: 'center', gap: 18 },
  diamondWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 215, 0, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' },
  premiumTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  premiumDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  buyBtn: { width: '100%', borderRadius: 24, overflow: 'hidden', marginTop: 8 },
  buyBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  premiumCloseBtn: { paddingVertical: 10, alignSelf: 'center' },
  premiumCloseText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },

  // Story fullscreen view overlay
  storyViewContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  progBarRow: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', gap: 6, zIndex: 100 },
  progBarWrapper: { flex: 1, height: 3, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 2, overflow: 'hidden' },
  progBarFill: { height: '100%', backgroundColor: '#FFF' },
  storyHeader: { position: 'absolute', top: 64, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  storyHeadPic: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  storyHeadName: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  storyHeadTime: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  storyClose: { marginLeft: 'auto', padding: 4 },
  storyLeftTap: { position: 'absolute', left: 0, top: 120, bottom: 120, width: width * 0.3, zIndex: 90 },
  storyRightTap: { position: 'absolute', right: 0, top: 120, bottom: 120, width: width * 0.7, zIndex: 90 },
  storyMainImg: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Viewers list drawer activator
  viewersIndicator: { position: 'absolute', bottom: 36, alignSelf: 'center', zIndex: 100, alignItems: 'center', gap: 6 },
  bounceUpIcon: { color: 'rgba(255,255,255,0.6)' },
  viewsCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  viewsCountText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

  // Viewers listing drawer sheet
  viewsDrawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  viewsDrawerSheet: { backgroundColor: '#0B0B0C', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: screenHeight * 0.6, paddingBottom: 24 },
  viewsDrawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  viewsDrawerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  viewsDrawerClose: { backgroundColor: 'rgba(255,255,255,0.08)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  viewsDrawerContent: { padding: 20, paddingBottom: 40 },
  emptyViewers: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyViewersText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  emptyViewersSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingHorizontal: 30 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
  viewerPic: { width: 44, height: 44, borderRadius: 22 },
  viewerName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  viewerTime: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
});
