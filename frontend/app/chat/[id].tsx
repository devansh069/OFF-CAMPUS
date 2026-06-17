import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    fetchOtherUser();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchOtherUser = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      const conv = data.conversations.find((c: any) => c.user.user_id === id);
      if (conv) setOtherUser(conv.user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/${id}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      const data = await response.json();
      setMessages(data.messages || []);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ to_user_id: id, content }),
      });
      await fetchMessages();
    } catch (error) {
      console.error('Error sending:', error);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        {otherUser && (
          <TouchableOpacity 
            style={styles.headerUserRow}
            activeOpacity={0.7}
            onPress={() => {
              // Direct navigation to user's profile card if desired
            }}
          >
            <View style={styles.headerAvatarWrapper}>
              <Image
                source={{ uri: otherUser.photos?.[0] || otherUser.picture }}
                style={styles.headerAvatar}
              />
              {otherUser.is_on_campus && (
                <View style={styles.headerOnlineBadge} />
              )}
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.headerName}>{otherUser.name}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: otherUser.is_on_campus ? '#06D6A0' : 'rgba(255,255,255,0.3)' }]} />
                <Text style={styles.headerStatus}>
                  {otherUser.is_on_campus ? 'On Campus' : 'Off Campus'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerInfoBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#FF1B6B" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.welcomeBox}>
                <LinearGradient
                  colors={['rgba(255, 27, 107, 0.15)', 'rgba(157, 78, 221, 0.15)']}
                  style={styles.welcomeGradient}
                />
                <Ionicons name="sparkles" size={36} color="#FFD700" style={styles.sparkleIcon} />
                <Text style={styles.welcomeText}>It's a Connection! 🎉</Text>
                <Text style={styles.welcomeSub}>You matched with {otherUser?.name || 'them'}. Send a message to break the ice!</Text>
              </View>
            )}
            
            {messages.map((msg: any) => {
              const isMine = msg.from_user_id === user?.user_id;
              const msgDate = new Date(msg.created_at);
              const formattedTime = msgDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              return (
                <View
                  key={msg.message_id}
                  style={[styles.messageRow, isMine ? styles.myRow : styles.theirRow]}
                >
                  {!isMine && (
                    <Image
                      source={{ uri: otherUser?.photos?.[0] || otherUser?.picture }}
                      style={styles.bubbleAvatar}
                    />
                  )}
                  <View style={styles.bubbleWrapper}>
                    {isMine ? (
                      <LinearGradient
                        colors={['#FF1B6B', '#9D4EDD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.messageBubble, styles.myMessage]}
                      >
                        <Text style={styles.myText}>{msg.content}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.messageBubble, styles.theirMessage]}>
                        <Text style={styles.theirText}>{msg.content}</Text>
                      </View>
                    )}
                    <Text style={[styles.msgTime, isMine ? styles.myTime : styles.theirTime]}>
                      {formattedTime}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar Section */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={16} color="#FFF" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#000000',
    gap: 12,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerUserRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerOnlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#06D6A0',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  headerMeta: {
    gap: 1,
  },
  headerName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerStatus: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '600',
  },
  headerInfoBtn: {
    padding: 4,
  },

  // Messages Container
  messagesContainer: { flex: 1 },
  
  // Welcome Matched Box
  welcomeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  welcomeGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  sparkleIcon: {
    marginBottom: 12,
  },
  welcomeText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  welcomeSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  // Chat Bubbles
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 4,
    maxWidth: '85%',
  },
  myRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  theirRow: {
    alignSelf: 'flex-start',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bubbleWrapper: {
    gap: 2,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myMessage: {
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  myText: { color: '#FFF', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  theirText: { color: '#FFF', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  msgTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 2,
  },
  myTime: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  theirTime: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },

  // Input Box
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sendBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#FF1B6B',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.8,
  },
});
