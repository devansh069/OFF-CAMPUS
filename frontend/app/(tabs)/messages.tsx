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
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Messages() {
  const { sessionToken } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Chat with your matches 💬</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3366" />}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={80} color="#444" />
            <Text style={styles.emptyText}>No matches yet</Text>
            <Text style={styles.emptySubText}>Start swiping in Discover to find matches!</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/(tabs)/discover')}
            >
              <Text style={styles.exploreBtnText}>Go to Discover</Text>
            </TouchableOpacity>
          </View>
        ) : (
          conversations.map((conv: any) => (
            <TouchableOpacity
              key={conv.user.user_id}
              style={styles.conversationItem}
              onPress={() => router.push(`/chat/${conv.user.user_id}`)}
            >
              <Image
                source={{
                  uri: conv.user.photos?.[0] || conv.user.picture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMzMzIi8+PC9zdmc+'
                }}
                style={styles.avatar}
              />
              <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                  <Text style={styles.convName}>{conv.user.name}</Text>
                  {conv.last_message?.created_at && (
                    <Text style={styles.convTime}>
                      {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                    </Text>
                  )}
                </View>
                <View style={styles.convPreview}>
                  <Text
                    style={[
                      styles.convMessage,
                      conv.unread_count > 0 && styles.convMessageUnread
                    ]}
                    numberOfLines={1}
                  >
                    {conv.last_message?.content || 'Say hi! 👋'}
                  </Text>
                  {conv.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{conv.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  convInfo: { flex: 1, gap: 4 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  convTime: { fontSize: 12, color: '#666' },
  convPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convMessage: { fontSize: 14, color: '#999', flex: 1 },
  convMessageUnread: { color: '#FFF', fontWeight: '600' },
  unreadBadge: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyState: { padding: 60, alignItems: 'center', gap: 12 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubText: { color: '#888', fontSize: 14, textAlign: 'center' },
  exploreBtn: {
    backgroundColor: '#FF3366',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 16,
  },
  exploreBtnText: { color: '#FFF', fontWeight: 'bold' },
});
