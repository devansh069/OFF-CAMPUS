import React, { useState, useEffect } from 'react';
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
  const { sessionToken } = useAuth();
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

  useEffect(() => {
    fetchConversations();
    fetchMatches();
    const interval = setInterval(() => {
      fetchConversations();
      fetchMatches();
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
              <Text style={styles.title}>Inbox 💬</Text>
              <View style={styles.pulseBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.pulseText}>{matches.length} Matches</Text>
              </View>
            </View>
          </View>



      <View style={{ flex: 1 }}>
        {/* Horizontal Matches List */}
        {!searchQuery && newMatches.length > 0 && (
          <View style={styles.matchesSection}>
            <Text style={styles.sectionTitle}>New Matches ({newMatches.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchesScrollContent}>
              {newMatches.map((match: any) => (
                <TouchableOpacity
                  key={match.user_id}
                  style={styles.matchItem}
                  onPress={() => router.push(`/chat/${match.user_id}`)}
                >
                  <View style={styles.matchAvatarContainer}>
                    <Image
                      source={{ uri: match.photos?.[0] || match.picture }}
                      style={styles.matchAvatar}
                    />
                    <LinearGradient
                      colors={['#C2FF3D', '#C2FF3D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.matchRing}
                    />
                  </View>
                  <Text style={styles.matchName} numberOfLines={1}>
                    {match.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.conversationsHeaderRow}>
          <Text style={styles.sectionTitle}>Messages</Text>
        </View>

        <BlurView intensity={20} tint="dark" style={styles.glassContainer}>
          {filteredConversations.length === 0 ? (
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
              {filteredConversations.map((conv: any, index: number) => {
                const hasUnread = conv.unread_count > 0;
                return (
                  <View key={conv.user.user_id}>
                    <Swipeable
                      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, conv.user)}
                      containerStyle={styles.swipeContainer}
                    >
                      <TouchableOpacity
                        style={[styles.conversationItem, hasUnread && styles.conversationItemUnread]}
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
                          <View style={styles.convHeader}>
                            <Text style={styles.convName}>{conv.user.name}</Text>
                            {conv.last_message?.created_at && (
                              <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
                                {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                              </Text>
                            )}
                          </View>
                          <View style={styles.convPreview}>
                            <Text
                              style={[
                                styles.convMessage,
                                hasUnread && styles.convMessageUnread
                              ]}
                              numberOfLines={1}
                            >
                              {conv.last_message?.content || 'Say hi! 👋'}
                            </Text>
                            {hasUnread && (
                              <LinearGradient
                                colors={['#C2FF3D', '#C2FF3D']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.unreadBadge}
                              >
                                <Text style={styles.unreadCount}>{conv.unread_count}</Text>
                              </LinearGradient>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </Swipeable>
                    {index < filteredConversations.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </BlurView>
      </View>

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
  centerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandLogo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  pulseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(194, 255, 61, 0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(194, 255, 61, 0.25)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C2FF3D' },
  pulseText: { color: '#C2FF3D', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },

  // Search Bar
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '500' },
  clearSearchBtn: { padding: 4 },

  // Matches Section
  matchesSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 12 },
  matchesScrollContent: { paddingHorizontal: 16, gap: 16 },
  matchItem: { alignItems: 'center', width: 68 },
  matchAvatarContainer: { width: 58, height: 58, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  matchAvatar: { width: 50, height: 50, borderRadius: 25 },
  matchRing: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 29, borderWidth: 2, borderColor: 'transparent', zIndex: -1 },
  matchName: { color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 6, width: '100%', textAlign: 'center' },

  // Conversations Feed
  conversationsHeaderRow: { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    height: 550,
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
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: 'transparent',
  },
  conversationItemUnread: {
    backgroundColor: 'rgba(194, 255, 61, 0.03)',
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#06D6A0', borderWidth: 2, borderColor: '#000000' },
  convInfo: { flex: 1, gap: 3 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  convTime: { fontSize: 11, color: 'rgba(255, 255, 255, 0.35)' },
  convTimeUnread: { color: '#C2FF3D', fontWeight: '700' },
  convPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  convMessage: { fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', flex: 1 },
  convMessageUnread: { color: '#FFF', fontWeight: '700' },
  unreadBadge: { paddingHorizontal: 6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadCount: { color: '#000', fontSize: 10, fontWeight: '900' },
  emptyState: { flex: 1, alignItems: 'center', gap: 12, justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  emptySubText: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  exploreBtn: { backgroundColor: '#C2FF3D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16, shadowColor: '#C2FF3D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  exploreBtnText: { color: '#000', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Swipeable right actions
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

  // Modal styling
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
