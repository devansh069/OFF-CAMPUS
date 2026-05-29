import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Confessions() {
  const { user, sessionToken } = useAuth();
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newConfession, setNewConfession] = useState('');
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<'my-college' | 'all'>('my-college');

  useEffect(() => {
    fetchConfessions();
  }, [filter]);

  const fetchConfessions = async () => {
    try {
      const url = filter === 'my-college' && user?.college_id
        ? `${EXPO_PUBLIC_BACKEND_URL}/api/confessions/feed?college_id=${user.college_id}`
        : `${EXPO_PUBLIC_BACKEND_URL}/api/confessions/feed`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      setConfessions(data.confessions || []);
    } catch (error) {
      console.error('Error fetching confessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePost = async () => {
    if (!newConfession.trim()) return;
    
    setPosting(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          content: newConfession,
          college_id: filter === 'my-college' ? user?.college_id : null,
        }),
      });

      if (response.ok) {
        setNewConfession('');
        setShowCreate(false);
        await fetchConfessions();
      } else {
        Alert.alert('Error', 'Failed to post confession');
      }
    } catch (error) {
      console.error('Error posting confession:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (confessionId: string) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/confessions/${confessionId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      // Optimistically update UI
      setConfessions(confessions.map(c =>
        c.confession_id === confessionId ? { ...c, likes: c.likes + 1 } : c
      ));
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConfessions();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Confessions</Text>
          <Text style={styles.subtitle}>Anonymous campus tea ☕</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)} testID="create-confession-btn">
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'my-college' && styles.filterBtnActive]}
          onPress={() => setFilter('my-college')}
        >
          <Text style={[styles.filterText, filter === 'my-college' && styles.filterTextActive]}>
            My College
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF3366" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF3366" />
          }
        >
          {confessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={80} color="#444" />
              <Text style={styles.emptyText}>No confessions yet</Text>
              <Text style={styles.emptySubText}>Be the first to share!</Text>
            </View>
          ) : (
            confessions.map((confession: any) => (
              <View key={confession.confession_id} style={styles.confessionCard}>
                <View style={styles.confessionHeader}>
                  <View style={styles.anonAvatar}>
                    <Ionicons name="person" size={20} color="#FF3366" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anonName}>Anonymous</Text>
                    <Text style={styles.timeText}>
                      {confession.created_at && formatDistanceToNow(new Date(confession.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.confessionContent}>{confession.content}</Text>
                <View style={styles.confessionActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleLike(confession.confession_id)}
                    testID={`like-confession-${confession.confession_id}`}
                  >
                    <Ionicons name="heart-outline" size={20} color="#FF3366" />
                    <Text style={styles.actionText}>{confession.likes || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={20} color="#999" />
                    <Text style={styles.actionText}>{confession.comments || 0}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={showCreate} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Confess</Text>
              <TouchableOpacity
                onPress={handlePost}
                disabled={!newConfession.trim() || posting}
              >
                <Text style={[
                  styles.postBtn,
                  (!newConfession.trim() || posting) && { opacity: 0.5 }
                ]}>
                  {posting ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.anonNote}>
              <Ionicons name="lock-closed" size={16} color="#FF3366" />
              <Text style={styles.anonNoteText}>Your identity is hidden</Text>
            </View>

            <TextInput
              style={styles.confessionInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#666"
              value={newConfession}
              onChangeText={setNewConfession}
              multiline
              maxLength={500}
              autoFocus
              testID="confession-input"
            />
            <Text style={styles.charCount}>{newConfession.length}/500</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 2 },
  createBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterBtnActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  filterText: { color: '#999', fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: '#FFF' },
  confessionCard: {
    backgroundColor: '#1E1E1E',
    margin: 12,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  confessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  anonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF336633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonName: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  timeText: { fontSize: 12, color: '#888' },
  confessionContent: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 22,
    marginBottom: 12,
  },
  confessionActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: { color: '#999', fontSize: 14 },
  emptyState: {
    alignItems: 'center',
    padding: 60,
    gap: 12,
  },
  emptyText: { fontSize: 18, color: '#FFF', fontWeight: '600', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#888' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  postBtn: { color: '#FF3366', fontSize: 16, fontWeight: 'bold' },
  anonNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#FF336622',
    borderRadius: 8,
    marginBottom: 16,
  },
  anonNoteText: { color: '#FF3366', fontSize: 13 },
  confessionInput: {
    color: '#FFF',
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
});
