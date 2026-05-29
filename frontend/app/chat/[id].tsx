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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        {otherUser && (
          <>
            <Image
              source={{ uri: otherUser.photos?.[0] || otherUser.picture }}
              style={styles.headerAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName}>{otherUser.name}</Text>
              <Text style={styles.headerStatus}>{otherUser.is_on_campus ? 'On Campus' : 'Off Campus'}</Text>
            </View>
          </>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#FF3366" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.welcomeBox}>
                <Text style={styles.welcomeText}>🎉 You matched!</Text>
                <Text style={styles.welcomeSub}>Send the first message and break the ice</Text>
              </View>
            )}
            {messages.map((msg: any) => {
              const isMine = msg.from_user_id === user?.user_id;
              return (
                <View
                  key={msg.message_id}
                  style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}
                >
                  <Text style={isMine ? styles.myText : styles.theirText}>{msg.content}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
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
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  headerStatus: { color: '#999', fontSize: 12 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesContainer: { flex: 1 },
  welcomeBox: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 24,
  },
  welcomeText: { color: '#FF3366', fontSize: 18, fontWeight: 'bold' },
  welcomeSub: { color: '#999', fontSize: 14, marginTop: 4 },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    backgroundColor: '#FF3366',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#1E1E1E',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  myText: { color: '#FFF', fontSize: 15 },
  theirText: { color: '#FFF', fontSize: 15 },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FF3366',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
