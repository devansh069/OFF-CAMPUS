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
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Messages() {
  const { sessionToken } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      setConversations([
        {
          user: {
            user_id: 'user_priya',
            name: 'Priya Singh',
            photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'],
            is_on_campus: true
          },
          last_message: {
            content: 'Hey, did you finish the assignment? 📚',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          unread_count: 1
        },
        {
          user: {
            user_id: 'user_ananya',
            name: 'Ananya Kapoor',
            photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop'],
            is_on_campus: true
          },
          last_message: {
            content: 'I love that playlist you shared! 🎵',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          unread_count: 0
        }
      ]);
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
      console.warn('Error fetching conversations, using mock fallback:', error.message);
      setConversations([
        {
          user: {
            user_id: 'user_priya',
            name: 'Priya Singh',
            photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'],
            is_on_campus: true
          },
          last_message: {
            content: 'Hey, did you finish the assignment? 📚',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          unread_count: 1
        },
        {
          user: {
            user_id: 'user_ananya',
            name: 'Ananya Kapoor',
            photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop'],
            is_on_campus: true
          },
          last_message: {
            content: 'I love that playlist you shared! 🎵',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          unread_count: 0
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMatches = async () => {
    if (sessionToken === 'dummy_token') {
      setMatches([
        {
          user_id: 'user_rohan',
          name: 'Rohan Mehta',
          photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop'],
          is_on_campus: false
        },
        {
          user_id: 'user_kabir',
          name: 'Kabir Malhotra',
          photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop'],
          is_on_campus: true
        }
      ]);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Inbox 💬</Text>
          <View style={styles.pulseBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.pulseText}>{matches.length} Matches</Text>
          </View>
        </View>
      </View>



      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ee4d4d" />}
      >
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
                      colors={['#ee4d4d', '#780505']}
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

        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={70} color="rgba(255, 255, 255, 0.15)" />
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
              >
                <Text style={styles.exploreBtnText}>Go to Discover</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredConversations.map((conv: any) => {
            const hasUnread = conv.unread_count > 0;
            return (
              <TouchableOpacity
                key={conv.user.user_id}
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
                        colors={['#ee4d4d', '#780505']}
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
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
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
  pulseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(238, 77, 77, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(238, 77, 77, 0.25)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ee4d4d' },
  pulseText: { color: '#ee4d4d', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
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
  conversationItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)' },
  conversationItemUnread: { backgroundColor: 'rgba(255, 27, 107, 0.02)' },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  onlineBadge: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#06D6A0', borderWidth: 2, borderColor: '#000000' },
  convInfo: { flex: 1, gap: 3 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  convTime: { fontSize: 11, color: 'rgba(255, 255, 255, 0.35)' },
  convTimeUnread: { color: '#ee4d4d', fontWeight: '700' },
  convPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  convMessage: { fontSize: 13, color: 'rgba(255, 255, 255, 0.5)', flex: 1 },
  convMessageUnread: { color: '#FFF', fontWeight: '700' },
  unreadBadge: { paddingHorizontal: 6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadCount: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  emptyState: { padding: 60, alignItems: 'center', gap: 12, justifyContent: 'center' },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptySubText: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  exploreBtn: { backgroundColor: '#ee4d4d', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16 },
  exploreBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
