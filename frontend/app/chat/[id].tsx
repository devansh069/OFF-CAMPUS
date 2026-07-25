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
import * as ImagePicker from 'expo-image-picker';
import io from 'socket.io-client';

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

  const socketRef = useRef<any>(null);

  useEffect(() => {
    fetchMessages();
    fetchOtherUser();

    if (sessionToken && sessionToken !== 'dummy_token') {
      console.log('[Socket] Connecting to:', EXPO_PUBLIC_BACKEND_URL);
      const socket = io(EXPO_PUBLIC_BACKEND_URL || 'http://localhost:5000', {
        transports: ['websocket'],
        forceNew: true
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[Socket] Connected! Registering room for user:', user?.user_id);
        socket.emit('join_room', user?.user_id);
      });

      socket.on('new_message', (newMessage: any) => {
        console.log('[Socket] Received new message:', newMessage);
        // Only append messages from the current conversation partner
        if (newMessage.from_user_id === id) {
          setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m.message_id === newMessage.message_id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [id, sessionToken, user]);

  const fetchOtherUser = async () => {
    const fallbackUsers = [
      { user_id: 'user_priya', name: 'Priya Singh', photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop'], is_on_campus: true },
      { user_id: 'user_ananya', name: 'Ananya Kapoor', photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop'], is_on_campus: true },
      { user_id: 'user_rohan', name: 'Rohan Mehta', photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop'], is_on_campus: false },
      { user_id: 'user_kabir', name: 'Kabir Malhotra', photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop'], is_on_campus: false }
    ];

    if (sessionToken === 'dummy_token') {
      const fb = fallbackUsers.find(u => u.user_id === id);
      if (fb) setOtherUser(fb);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      const conv = data.conversations.find((c: any) => c.user.user_id === id);
      if (conv) {
        setOtherUser(conv.user);
      } else {
        const fb = fallbackUsers.find(u => u.user_id === id);
        if (fb) setOtherUser(fb);
      }
    } catch (error: any) {
      console.warn('Error fetching user, using mock fallback:', error.message);
      const fb = fallbackUsers.find(u => u.user_id === id);
      if (fb) setOtherUser(fb);
    }
  };

  const fetchMessages = async () => {
    if (sessionToken === 'dummy_token') {
      const mockMsgLogs = [
        { message_id: 'msg_1', from_user_id: id, to_user_id: user?.user_id, content: 'Hey there! 😊 How is college life going?' },
        { message_id: 'msg_2', from_user_id: user?.user_id, to_user_id: id, content: 'Hey! It is pretty good. How about you?' },
        { message_id: 'msg_3', from_user_id: id, to_user_id: user?.user_id, content: 'Not bad, just finished an assignment. What are you up to?' }
      ];
      setMessages(mockMsgLogs);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/${id}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.warn('Error fetching messages, using mock fallback:', error.message);
      const mockMsgLogs = [
        { message_id: 'msg_1', from_user_id: id, to_user_id: user?.user_id, content: 'Hey there! 😊 How is college life going?' },
        { message_id: 'msg_2', from_user_id: user?.user_id, to_user_id: id, content: 'Hey! It is pretty good. How about you?' },
        { message_id: 'msg_3', from_user_id: id, to_user_id: user?.user_id, content: 'Not bad, just finished an assignment. What are you up to?' }
      ];
      setMessages(mockMsgLogs);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    
    // Local optimistic append so users can type and see messages instantly
    const newMsg = {
      message_id: `msg_local_${Date.now()}`,
      from_user_id: user?.user_id,
      to_user_id: id,
      content,
      message_type: 'text',
      image_url: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMsg]);
    
    if (sessionToken === 'dummy_token') {
      setSending(false);
      return;
    }
    
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ to_user_id: id, content, message_type: 'text' }),
      });
      if (response.ok) {
        const data = await response.json();
        // Replace optimistic msg with real db msg
        setMessages(prev =>
          prev.map(m => m.message_id === newMsg.message_id ? data.message : m)
        );
      }
    } catch (error: any) {
      console.warn('Error sending message via backend, kept locally in mock state:', error.message);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const pickChatImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access library was denied.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setSending(true);

        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // optimistic local message preview
        const localImgMsg = {
          message_id: `msg_local_${Date.now()}`,
          from_user_id: user?.user_id,
          to_user_id: id,
          content: 'Sent a photo',
          message_type: 'image',
          image_url: result.assets[0].uri,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, localImgMsg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        if (sessionToken === 'dummy_token') {
          setSending(false);
          return;
        }

        // Upload to Cloudinary via backend
        const uploadRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/upload-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({ image: base64Img })
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        const secureUrl = uploadData.image_url;

        // Send message
        const sendRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            to_user_id: id,
            content: 'Sent a photo',
            message_type: 'image',
            image_url: secureUrl
          })
        });

        if (sendRes.ok) {
          const data = await sendRes.json();
          // Update local optimistic message with the database message
          setMessages(prev =>
            prev.map(m => m.message_id === localImgMsg.message_id ? data.message : m)
          );
        }
      }
    } catch (error: any) {
      console.warn('Chat image sending failed:', error.message);
      alert('Failed to send image: ' + error.message);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
            <ActivityIndicator color="#ee4d4d" />
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
                        colors={['#ee4d4d', '#780505']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.messageBubble,
                          styles.myMessage,
                          msg.message_type === 'image' && { padding: 4, borderRadius: 12, overflow: 'hidden' }
                        ]}
                      >
                        {msg.message_type === 'image' ? (
                          <Image
                            source={{ uri: msg.image_url }}
                            style={{ width: 200, height: 200, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.myText}>{msg.content}</Text>
                        )}
                      </LinearGradient>
                    ) : (
                      <View style={[
                        styles.messageBubble,
                        styles.theirMessage,
                        msg.message_type === 'image' && { padding: 4, borderRadius: 12, overflow: 'hidden' }
                      ]}>
                        {msg.message_type === 'image' ? (
                          <Image
                            source={{ uri: msg.image_url }}
                            style={{ width: 200, height: 200, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.theirText}>{msg.content}</Text>
                        )}
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
          <TouchableOpacity style={styles.micBtn} activeOpacity={0.7} onPress={pickChatImage}>
            <Ionicons name="image-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
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
  micBtn: {
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
    backgroundColor: '#ee4d4d',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.8,
  },
});
