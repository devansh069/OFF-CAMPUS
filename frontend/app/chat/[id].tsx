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
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import io from 'socket.io-client';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function VoiceMessageBubble({ audioUrl, isMine }: { audioUrl: string; isMine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          if (position >= duration) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.warn('Playback error:', error);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <TouchableOpacity
      onPress={playSound}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        minWidth: 150,
      }}
      activeOpacity={0.8}
    >
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isMine ? '#FFF' : '#C2FF3D'} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Voice Note</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 1 }}>
          {duration ? `${formatTime(position)} / ${formatTime(duration)}` : '0:00'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Spam / Fake Profile');
  const [customReason, setCustomReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Voice Recording States
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Start Audio Recording
  const startRecording = async () => {
    try {
      console.log('[VoiceNote] Requesting permissions...');
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required to record voice notes.');
        return;
      }

      console.log('[VoiceNote] Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Discard any previous unsaved recording
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }

      console.log('[VoiceNote] Creating Recording object...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = newRecording;
      setIsRecording(true);
      console.log('[VoiceNote] Recording started successfully!');
    } catch (err: any) {
      console.error('[VoiceNote] Failed to start recording', err);
      Alert.alert('Start Recording Error', err.message || String(err));
    }
  };

  // Stop Recording & Send Voice Note
  const stopRecording = async () => {
    console.log('[VoiceNote] stopRecording called. Active recording exists:', !!recordingRef.current);
    const activeRecording = recordingRef.current;
    if (!activeRecording) {
      Alert.alert('Stop Error', 'No active recording found.');
      return;
    }

    setIsRecording(false);
    recordingRef.current = null;

    try {
      console.log('[VoiceNote] Stopping and unloading recording...');
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      console.log('[VoiceNote] Recording URI:', uri);
      if (!uri) {
        Alert.alert('Error', 'Could not retrieve recording URI.');
        return;
      }

      console.log('[VoiceNote] Reading audio file as base64...');
      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[VoiceNote] Base64 length:', base64Audio.length);

      setSending(true);

      console.log('[VoiceNote] Uploading to backend...', `${EXPO_PUBLIC_BACKEND_URL}/api/messages/upload-audio`);
      const uploadRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/upload-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ audio: base64Audio })
      });

      console.log('[VoiceNote] Upload response status:', uploadRes.status);
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      const { audio_url } = await uploadRes.json();
      console.log('[VoiceNote] Uploaded audio URL:', audio_url);

      console.log('[VoiceNote] Sending message...');
      const sendRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          to_user_id: id,
          content: '🎵 Sent a voice note',
          message_type: 'audio',
          image_url: audio_url // store audio link in image_url DB column
        })
      });

      console.log('[VoiceNote] Message send response status:', sendRes.status);
      if (sendRes.ok) {
        const data = await sendRes.json();
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        const errorData = await sendRes.json();
        throw new Error(errorData.detail || 'Failed to send message reference');
      }
    } catch (err: any) {
      console.error('[VoiceNote] Failed to upload/send audio', err);
      Alert.alert('Send Error', err.message || String(err));
    } finally {
      setSending(false);
    }
  };

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
                router.replace('/(tabs)/messages');
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
    setSelectedReason('Spam / Fake Profile');
    setCustomReason('');
    setShowReportModal(true);
  };

  // Submit report to backend
  const handleReportSubmit = async () => {
    if (!id) return;
    
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
          target_user_id: id,
          reason: finalReason
        })
      });
      if (response.ok) {
        Alert.alert(
          'Report Submitted 🛡️',
          'Thank you for reporting. Our safety team will review this profile within 24 hours. The user has been unmatched and blocked.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/messages') }]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to submit report.');
      }
    } catch (err) {
      console.error('Report error:', err);
      Alert.alert('Network Error', 'Could not submit report. Please check connection.');
    } finally {
      setSubmittingReport(false);
      setShowReportModal(false);
    }
  };

  const handleHeaderMenu = () => {
    if (!otherUser) return;
    Alert.alert(
      'Chat Options ⚙️',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unmatch', 
          style: 'destructive',
          onPress: () => handleUnmatch(otherUser.user_id, otherUser.name)
        },
        { 
          text: 'Report User', 
          style: 'destructive',
          onPress: () => handleReportPress(otherUser.user_id) 
        }
      ]
    );
  };

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
    <View style={styles.container}>
      {/* Ambient background linear gradient matching Vibe page */}
      <LinearGradient
        colors={['#050005', '#FF6CD2', '#5641FF', '#ACD0FF', '#050005']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Dark veil overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />

      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }}>
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
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerInfoBtn} onPress={handleHeaderMenu}>
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
              const isAudio = msg.message_type === 'audio' || (msg.image_url && msg.image_url.includes('voice_notes'));
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
                      isAudio ? (
                        <VoiceMessageBubble audioUrl={msg.image_url} isMine={true} />
                      ) : (
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
                      )
                    ) : (
                      isAudio ? (
                        <VoiceMessageBubble audioUrl={msg.image_url} isMine={false} />
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
                      )
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
          <TouchableOpacity
            style={[styles.micBtn, isRecording && { backgroundColor: '#ee4d4d' }]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.7}
          >
            <Ionicons name="mic" size={20} color={isRecording ? '#FFF' : 'rgba(255, 255, 255, 0.6)'} />
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
      </BlurView>
    </View>
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

  // Report Modal Styling
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
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  modalContent: {
    paddingVertical: 12,
  },
  modalDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  reasonLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 10,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  reasonOptionActive: {},
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleActive: {
    borderColor: '#ee4d4d',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#ee4d4d',
  },
  reasonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  reasonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  reasonInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    color: '#FFF',
    padding: 12,
    fontSize: 13.5,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 6,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ee4d4d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
