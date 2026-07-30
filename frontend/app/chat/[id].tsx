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
  Dimensions,
  Animated,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import io from 'socket.io-client';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const getScrollableItems = (profile: any) => {
  let height = profile?.height;
  let religion = profile?.religion;
  let drink = profile?.drink;
  let smoke = profile?.smoke;
  let weed = profile?.weed;

  const hash = (profile?.name || '').split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

  if (!height) {
    height = profile?.gender === 'female' ? 155 + (hash % 15) : 170 + (hash % 18);
  }
  if (!religion) {
    const religions = ['Hindu', 'Sikh', 'Christian', 'Muslim', 'Jain'];
    religion = religions[hash % religions.length];
  }
  if (!drink) drink = (hash % 3 === 0) ? 'yes' : 'no';
  if (!smoke) smoke = (hash % 4 === 0) ? 'yes' : 'no';
  if (!weed) weed = (hash % 5 === 0) ? 'yes' : 'no';

  const items = [
    { icon: 'person-outline', text: (profile?.gender || 'Student').toUpperCase() },
    { icon: 'resize-outline', text: `${height} cm` },
    { icon: 'sparkles-outline', text: religion },
    { icon: 'wine-outline', text: `Drink: ${drink}` },
    { icon: 'flame-outline', text: `Smoke: ${smoke}` },
    { icon: 'leaf-outline', text: `Weed: ${weed}` },
  ];
  if (profile?.looking_for) {
    items.push({ icon: 'heart-outline', text: profile.looking_for });
  }
  return items;
};

const getProfilePhotos = (profile: any) => {
  if (!profile) return [];
  let photos: string[] = [];

  if (Array.isArray(profile.photos)) {
    photos = [...profile.photos];
  } else if (typeof profile.photos === 'string') {
    try {
      const parsed = JSON.parse(profile.photos);
      if (Array.isArray(parsed)) photos = parsed;
    } catch (e) {}
  }

  if (photos.length === 0 && profile.picture) {
    photos = [profile.picture];
  }

  const mockFemalePhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
  ];

  const mockMalePhotos = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop',
  ];

  const fallbackPool = profile?.gender === 'female' ? mockFemalePhotos : mockMalePhotos;

  while (photos.length < 5) {
    const nextIdx = (photos.length - 1) % fallbackPool.length;
    const photoToPush = fallbackPool[nextIdx >= 0 ? nextIdx : 0];
    photos.push(photoToPush);
  }

  return photos;
};

function VoiceMessageBubble({ audioUrl, isMine }: { audioUrl: string; isMine: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let localSound: Audio.Sound | null = null;

    const loadMetadata = async () => {
      try {
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false },
          (status: any) => {
            if (!isMounted) return;
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              setDuration(status.durationMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        localSound = newSound;
        if (isMounted) {
          setSound(newSound);
          setIsLoaded(true);
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
          }
        }
      } catch (err) {
        console.warn('Metadata load error:', err);
      }
    };

    loadMetadata();

    return () => {
      isMounted = false;
      if (localSound) {
        localSound.unloadAsync();
      }
    };
  }, [audioUrl]);

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          if (position >= duration && duration > 0) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setIsPlaying(true);
        }
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

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: isMine ? 'rgba(194, 255, 61, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        minWidth: 220,
        maxWidth: 280,
        borderWidth: 1,
        borderColor: isMine ? 'rgba(194, 255, 61, 0.3)' : 'rgba(255, 255, 255, 0.1)'
      }}
    >
      <TouchableOpacity
        onPress={playSound}
        disabled={!isLoaded}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: isMine ? '#C2FF3D' : 'rgba(255, 255, 255, 0.15)',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        activeOpacity={0.7}
      >
        {!isLoaded ? (
          <ActivityIndicator size="small" color={isMine ? "#000" : "#FFF"} />
        ) : (
          <Ionicons 
            name={isPlaying ? 'pause' : 'play'} 
            size={22} 
            color={isMine ? "#000" : "#FFF"} 
            style={{ marginLeft: isPlaying ? 0 : 3 }} 
          />
        )}
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Progress Bar Track */}
        <View style={{ 
          height: 4, 
          backgroundColor: isMine ? 'rgba(194, 255, 61, 0.3)' : 'rgba(255, 255, 255, 0.2)', 
          borderRadius: 2, 
          overflow: 'hidden' 
        }}>
          <View style={{ 
            height: '100%', 
            width: `${progressPercent}%`, 
            backgroundColor: isMine ? '#C2FF3D' : '#FFF', 
            borderRadius: 2 
          }} />
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ 
            color: isMine ? '#C2FF3D' : 'rgba(255,255,255,0.7)', 
            fontSize: 11, 
            fontWeight: '600',
            fontVariant: ['tabular-nums'] 
          }}>
            {formatTime(position)}
          </Text>
          {duration > 0 && (
            <Text style={{ 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: 10, 
              fontVariant: ['tabular-nums'] 
            }}>
              {formatTime(duration)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function RecordingWaveformBar({ levels }: { levels: number[] }) {
  const displayLevels = levels.length > 0 ? levels.slice(-20) : [6, 12, 8, 16, 24, 18, 10, 14, 22, 28, 16, 8, 14, 20, 12, 6, 10, 18, 12, 8];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1, paddingHorizontal: 8, height: 36, overflow: 'hidden', justifyContent: 'center' }}>
      {displayLevels.map((h, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: Math.max(4, Math.min(28, h)),
            backgroundColor: '#C2FF3D',
            borderRadius: 1.5,
          }}
        />
      ))}
    </View>
  );
}

function WhatsAppVoicePreviewBar({
  audioUri,
  onCancel,
  onSend,
  sending
}: {
  audioUri: string;
  onCancel: () => void;
  onSend: () => void;
  sending: boolean;
}) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let localSound: Audio.Sound | null = null;

    const loadAudio = async () => {
      try {
        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false },
          (status: any) => {
            if (!isMounted) return;
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              setDuration(status.durationMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(0);
              }
            }
          }
        );
        localSound = newSound;
        if (isMounted) {
          setSound(newSound);
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
          }
        }
      } catch (err) {
        console.warn('Preview audio load error:', err);
      }
    };

    loadAudio();

    return () => {
      isMounted = false;
      if (localSound) {
        localSound.unloadAsync();
      }
    };
  }, [audioUri]);

  const togglePlayback = async () => {
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        if (position >= duration && duration > 0) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Preview play error:', e);
    }
  };

  const formatTime = (millis: number) => {
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={styles.inputContainer}>
      {/* Left Button: Cancel/Trash */}
      <BlurView intensity={65} tint="dark" style={styles.micBtnGlass}>
        <TouchableOpacity
          style={styles.micBtnInner}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#FF4B4B" />
        </TouchableOpacity>
      </BlurView>

      {/* Middle Pill: Play/Pause & Track Progress */}
      <BlurView intensity={65} tint="dark" style={styles.inputGlassWrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, gap: 10 }}>
          {/* Play/Pause Button inside Pill */}
          <TouchableOpacity
            onPress={togglePlayback}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.8}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={14} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 2 }} />
          </TouchableOpacity>

          {/* Track Visualizer */}
          <View style={styles.previewTrackWrapper}>
            <View style={styles.previewTrackBackground}>
              <View style={[styles.previewTrackFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.previewTimerText}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
      </BlurView>

      {/* Right Button: Send */}
      <TouchableOpacity
        onPress={onSend}
        disabled={sending}
        activeOpacity={0.8}
        style={styles.sendBtnTouch}
      >
        <LinearGradient
          colors={['#D2FF52', '#8BE000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendBtnActive}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="send" size={17} color="#000" style={{ marginLeft: 2 }} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
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

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Spam / Fake Profile');
  const [customReason, setCustomReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Voice Recording States
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [previewAudioUri, setPreviewAudioUri] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      pulseAnim.setValue(1);
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true
          })
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isRecording]);

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

      setPreviewAudioUri(null);
      setRecordingDuration(0);
      setAudioLevels([]);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      console.log('[VoiceNote] Creating Recording object with live metering...');
      const customOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };

      let attempt = 0;
      let newRecording = null;
      while (attempt < 3) {
        try {
          const result = await Audio.Recording.createAsync(
            customOptions,
            (status: any) => {
              if (status.isRecording && status.metering !== undefined) {
                const db = status.metering; // dB from -160 to 0 (silence around -60)
                const norm = Math.max(0, Math.min(1, (db + 60) / 60)); // normalized 0..1
                const barHeight = Math.max(6, Math.floor(norm * 32));

                setAudioLevels(prev => {
                  const updated = [...prev, barHeight];
                  if (updated.length > 20) updated.shift();
                  return updated;
                });
              }
            },
            80
          );
          newRecording = result.recording;
          break; // Success! Break retry loop
        } catch (err: any) {
          attempt++;
          console.warn(`[VoiceNote] Recording start attempt ${attempt} failed:`, err);
          if (attempt >= 3) {
            throw err; // Throw after all retries fail
          }
          // Wait 350ms before retrying
          await new Promise(resolve => setTimeout(resolve, 350));
          
          // Re-set audio mode to try to force reset session category on iOS
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });
          } catch (e) {}
        }
      }

      if (newRecording) {
        recordingRef.current = newRecording;
        setIsRecording(true);
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        console.log('[VoiceNote] Recording started successfully!');
      }
    } catch (err: any) {
      console.error('[VoiceNote] Failed to start recording after retries', err);
      Alert.alert('Start Recording Error', err.message || String(err));
    }
  };

  // Cancel & Discard Recording
  const cancelRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setPreviewAudioUri(null);
    setRecordingDuration(0);
  };

  // Stop Recording & Enter WhatsApp Preview Mode
  const stopRecordingToPreview = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    setIsRecording(false);
    recordingRef.current = null;

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (uri) {
        setPreviewAudioUri(uri);
      }
    } catch (err: any) {
      console.error('[VoiceNote] Failed to stop recording to preview', err);
      Alert.alert('Error', 'Failed to stop recording for preview.');
    }
  };

  // Upload and Send Voice Note
  const sendVoiceNote = async (audioUriToUpload?: string) => {
    const targetUri = audioUriToUpload || previewAudioUri;
    if (!targetUri) return;

    setSending(true);

    try {
      console.log('[VoiceNote] Reading audio file as base64...');
      const base64Audio = await FileSystem.readAsStringAsync(targetUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[VoiceNote] Uploading to backend...', `${EXPO_PUBLIC_BACKEND_URL}/api/messages/upload-audio`);
      const uploadRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/upload-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      const { audio_url } = await uploadRes.json();

      const sendRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          to_user_id: id,
          content: '🎵 Sent a voice note',
          message_type: 'image',
          image_url: audio_url
        })
      });

      if (sendRes.ok) {
        const data = await sendRes.json();
        setMessages(prev => [...prev, data.message]);
        setPreviewAudioUri(null);
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

  const stopAndDirectSend = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    setIsRecording(false);
    recordingRef.current = null;

    try {
      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      if (uri) {
        await sendVoiceNote(uri);
      }
    } catch (err: any) {
      console.error('[VoiceNote] Failed direct send', err);
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
      // 1. Fetch conversation partner basic info
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        const conv = data.conversations.find((c: any) => c.user.user_id === id);
        if (conv) {
          setOtherUser(conv.user);
        }
      }

      // 2. Fetch target user's full Vibe profile details
      const profileRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/profiles?targetUserId=${id}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.profiles && profileData.profiles.length > 0) {
          const targetProf = profileData.profiles.find((p: any) => p.user_id === id) || profileData.profiles[0];
          setOtherUser(prev => {
            let photosList = targetProf.photos;
            if (typeof photosList === 'string') {
              try { photosList = JSON.parse(photosList); } catch (e) {}
            }
            if (!Array.isArray(photosList) || photosList.length === 0) {
              photosList = prev?.photos || [targetProf.picture || prev?.picture];
            }
            return {
              ...prev,
              ...targetProf,
              photos: photosList
            };
          });
        }
      }
    } catch (error: any) {
      console.warn('Error fetching user profile:', error.message);
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

  const getOtherUserCards = () => {
    if (!otherUser) return [];
    const list: any[] = [];
    const photosList = getProfilePhotos(otherUser);

    // 1. Main card (index 0)
    list.push({
      type: 'main',
      photo: photosList[0]
    });

    // 2. Spotify card
    let topTracks: any[] = [];
    try {
      if (otherUser?.spotify_data) {
        const sData = typeof otherUser.spotify_data === 'string'
          ? JSON.parse(otherUser.spotify_data)
          : otherUser.spotify_data;
        if (sData && sData.top_tracks) {
          topTracks = sData.top_tracks;
        }
      }
    } catch (e) {}

    if (topTracks.length > 0) {
      list.push({
        type: 'spotify',
        tracks: topTracks
      });
    }

    // 3. Secondary photo cards
    const MOCK_PROMPTS = [
      { index: 1, title: "A non-negotiable for my college squad...", answer: "Post-exam chai & deep midnight conversations!" },
      { index: 2, title: "The secret to winning my heart...", answer: "Spontaneous night drives and sending wholesome memes." },
      { index: 3, title: "Worst habit I can't seem to break...", answer: "Studying only 2 hours before the semester exam." }
    ];

    photosList.slice(1).forEach((photoUri: string, index: number) => {
      const photoIndex = index + 1;
      const prompt = MOCK_PROMPTS.find(p => p.index === photoIndex);
      list.push({
        type: 'secondary',
        photo: photoUri,
        prompt: prompt,
        index: photoIndex
      });
    });

    return list;
  };

  const renderMessageText = (content: string, isMine: boolean) => {
    // Check if the message contains a confession link
    const confessionIdMatch = content.match(/confessions\/(conf_[a-zA-Z0-9]+)/);
    if (confessionIdMatch) {
      const confessionId = confessionIdMatch[1];
      // Extract confession text if possible (contained within quotation marks in content)
      const textQuoteMatch = content.match(/"([^"]+)"/);
      const confessionSnippet = textQuoteMatch ? textQuoteMatch[1] : 'Shared Confession';

      return (
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/(tabs)/confessions',
              params: { id: confessionId }
            });
          }}
          activeOpacity={0.8}
          style={[
            styles.shareConfCard,
            isMine ? styles.shareConfCardMine : styles.shareConfCardTheir
          ]}
        >
          <View style={styles.shareConfHeader}>
            <Ionicons name="planet" size={14} color="#C2FF3D" />
            <Text style={styles.shareConfHeaderText}>SHARED CONFESSION</Text>
          </View>
          <Text style={styles.shareConfSnippet} numberOfLines={3}>
            "{confessionSnippet}"
          </Text>
          <View style={styles.shareConfDivider} />
          <View style={styles.shareConfFooter}>
            <Text style={styles.shareConfActionText}>Tap to View Thread</Text>
            <Ionicons name="chevron-forward" size={14} color={isMine ? '#FFF' : '#C2FF3D'} />
          </View>
        </TouchableOpacity>
      );
    }

    // Check if the message contains an event link
    const eventIdMatch = content.match(/events\/(evt_[a-zA-Z0-9]+)/);
    if (eventIdMatch) {
      const eventId = eventIdMatch[1];
      // Extract event title if possible (contained within quotation marks in content)
      const textQuoteMatch = content.match(/"([^"]+)"/);
      const eventTitle = textQuoteMatch ? textQuoteMatch[1] : 'Shared Event';

      return (
        <TouchableOpacity
          onPress={() => {
            router.push({
              pathname: '/(tabs)/events',
              params: { id: eventId }
            });
          }}
          activeOpacity={0.8}
          style={[
            styles.shareConfCard,
            isMine ? styles.shareConfCardMine : styles.shareConfCardTheir
          ]}
        >
          <View style={styles.shareConfHeader}>
            <Ionicons name="calendar" size={14} color="#C2FF3D" />
            <Text style={styles.shareConfHeaderText}>SHARED EVENT</Text>
          </View>
          <Text style={styles.shareConfSnippet} numberOfLines={2}>
            {eventTitle}
          </Text>
          <View style={styles.shareConfDivider} />
          <View style={styles.shareConfFooter}>
            <Text style={styles.shareConfActionText}>Tap to View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={isMine ? '#FFF' : '#C2FF3D'} />
          </View>
        </TouchableOpacity>
      );
    }

    // Default text rendering
    return (
      <Text style={isMine ? styles.myText : styles.theirText}>
        {content}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top-Left Dark Purple Glow Ball matching Chat Inbox */}
      <View style={styles.glowBallContainer} pointerEvents="none">
        <LinearGradient
          colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 0.8 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          {otherUser && (
            <TouchableOpacity 
              style={styles.headerUserRow}
              activeOpacity={0.7}
              onPress={() => setShowProfileModal(true)}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.headerName}>{otherUser.name}</Text>
                  {otherUser.verification_status === 'verified' && (
                    <Ionicons name="checkmark-circle" size={14} color="#00D2FF" />
                  )}
                  {otherUser.is_premium && (
                    <Ionicons name="crown" size={14} color="#FFD700" />
                  )}
                </View>
                {otherUser.college?.name && (
                  <Text style={styles.headerStatus} numberOfLines={1}>{otherUser.college.name}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerInfoBtn} onPress={handleHeaderMenu} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="rgba(255, 255, 255, 0.9)" />
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
                          colors={['#C2FF3D', '#98D014']}
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
                            renderMessageText(msg.content, true)
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
                            renderMessageText(msg.content, false)
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

        {/* Dynamic Floating Glass Input Controls (No Container Div) */}
        {previewAudioUri ? (
          <WhatsAppVoicePreviewBar
            audioUri={previewAudioUri}
            onCancel={cancelRecording}
            onSend={() => sendVoiceNote(previewAudioUri)}
            sending={sending}
          />
        ) : isRecording ? (
          <View style={styles.inputContainer}>
            {/* Left Button: Cancel/Trash */}
            <BlurView intensity={65} tint="dark" style={styles.micBtnGlass}>
              <TouchableOpacity
                style={styles.micBtnInner}
                onPress={cancelRecording}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#FF4B4B" />
              </TouchableOpacity>
            </BlurView>

            {/* Middle Pill: Waveform & Timer & Stop */}
            <BlurView intensity={65} tint="dark" style={styles.inputGlassWrapper}>
              <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 12, gap: 8 }}>
                {/* Timer Indicator */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Animated.View style={[styles.redPulsingDot, { opacity: pulseAnim }]} />
                  <Text style={[styles.recordingTimerText, { fontSize: 13 }]}>
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60) < 10 ? '0' : ''}{recordingDuration % 60}
                  </Text>
                </View>

                {/* Waveform visualizer */}
                <RecordingWaveformBar levels={audioLevels} />

                {/* Stop & Preview button inside pill */}
                <TouchableOpacity
                  onPress={stopRecordingToPreview}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="stop" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            </BlurView>

            {/* Right Button: Direct Send */}
            <TouchableOpacity
              onPress={stopAndDirectSend}
              activeOpacity={0.8}
              style={styles.sendBtnTouch}
            >
              <LinearGradient
                colors={['#D2FF52', '#8BE000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtnActive}
              >
                <Ionicons name="send" size={17} color="#000" style={{ marginLeft: 2 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <BlurView intensity={65} tint="dark" style={styles.micBtnGlass}>
              <TouchableOpacity
                style={styles.micBtnInner}
                onPress={startRecording}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={20} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>
            </BlurView>
            <BlurView intensity={65} tint="dark" style={styles.inputGlassWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
            </BlurView>
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!text.trim() || sending}
              activeOpacity={0.7}
              style={styles.sendBtnTouch}
            >
              {text.trim() && !sending ? (
                <LinearGradient
                  colors={['#D2FF52', '#8BE000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendBtnActive}
                >
                  <Ionicons name="send" size={17} color="#000" style={{ marginLeft: 2 }} />
                </LinearGradient>
              ) : (
                <View style={styles.sendBtnDisabled}>
                  {sending ? (
                    <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.5)" />
                  ) : (
                    <Ionicons name="send" size={16} color="rgba(255, 255, 255, 0.3)" style={{ marginLeft: 2 }} />
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 100% Exact Vibe Card Profile Preview Modal (Identical Snap-Paging Layout to discover.tsx) */}
      <Modal
        visible={showProfileModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.vibeCardModalContainer}>
          {/* Top-Left Dark Purple Glow Ball */}
          <View style={styles.glowBallContainer} pointerEvents="none">
            <LinearGradient
              colors={['#510A68', '#260334', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.8, y: 0.8 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>

          {/* Floating Header Bar */}
          <View style={styles.vibeModalFloatingHeader}>
            <TouchableOpacity
              onPress={() => setShowProfileModal(false)}
              style={styles.vibeModalBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.vibeModalTitle}>View Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Vertical Card Stack Scroll View */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: Platform.OS === 'ios' ? 90 : 70,
              paddingHorizontal: 16,
              paddingBottom: 40
            }}
            showsVerticalScrollIndicator={false}
          >
            {getOtherUserCards().map((card: any, i: number) => (
              <View key={i} style={[styles.vibeAnimatedCardItem, { height: screenHeight * 0.78, marginBottom: 20 }]}>
                {card.type === 'main' && (
                  <View style={styles.vibeMainCardInner}>
                    <Image
                      source={{ uri: card.photo }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    {/* Glass Shine Overlay */}
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.0)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)']}
                      locations={[0.0, 0.25, 0.5, 0.75, 1.0]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />

                    {/* Glass Details Card Overlay */}
                    <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.vibeGlassDetailsCard}>
                      <View style={styles.vibeCardDetailsContent}>
                        {/* Name & Age Row */}
                        <View style={[styles.vibeCardNameRow, { justifyContent: 'space-between' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 }}>
                            <Text style={styles.vibeCardNameText} numberOfLines={1} ellipsizeMode="tail">
                              {otherUser?.name || 'Student'}{otherUser?.age ? `, ${otherUser.age}` : ''}
                            </Text>
                            {otherUser?.verification_status === 'verified' && (
                              <Ionicons name="checkmark-circle" size={18} color="#00B0FF" style={{ marginLeft: 6, flexShrink: 0 }} />
                            )}
                            {otherUser?.is_premium && (
                              <Ionicons name="crown" size={18} color="#FFD700" style={{ marginLeft: 4, flexShrink: 0 }} />
                            )}
                          </View>
                          <View style={[styles.innovativeVibeBadge, { flexShrink: 0 }]}>
                            <Ionicons name="sparkles" size={13} color="#FFD700" />
                            <Text style={styles.innovativeVibeText}>{(otherUser?.vibe_score || 8.5).toFixed(1)}</Text>
                          </View>
                        </View>

                        {/* College / Course / Year */}
                        <View style={styles.vibeCardCollegeRow}>
                          <Ionicons name="school-outline" size={14} color="rgba(255, 255, 255, 0.4)" />
                          <Text style={styles.vibeCardCollegeText}>
                            {[
                              otherUser?.college?.short_name || otherUser?.college?.name || 'Campus',
                              otherUser?.course,
                              otherUser?.year
                            ].filter(Boolean).join(' • ')}
                          </Text>
                        </View>

                        {/* Bio */}
                        {otherUser?.bio ? <Text style={styles.vibeCardBioText}>{otherUser.bio}</Text> : null}

                        {/* Characteristics Scrollable Row */}
                        <View style={styles.vibeScrollWrapper}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.vibeScrollContentContainer}
                          >
                            {getScrollableItems(otherUser).map((item, idx) => (
                              <React.Fragment key={idx}>
                                <View style={styles.vibeScrollItem}>
                                  <Ionicons name={item.icon as any} size={15} color="rgba(255, 255, 255, 0.7)" />
                                  <Text style={styles.vibeScrollItemText}>{item.text}</Text>
                                </View>
                                {idx < getScrollableItems(otherUser).length - 1 && (
                                  <View style={styles.vibeScrollSeparator} />
                                )}
                              </React.Fragment>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Interests / Tags - Translucent Glass Style from discover.tsx */}
                        {Array.isArray(otherUser?.interests) && otherUser.interests.length > 0 && (
                          <View style={styles.vibeCardTagsRow}>
                            {otherUser.interests.map((interest: string) => (
                              <View key={interest} style={styles.vibeCardTagPill}>
                                <Text style={styles.vibeCardTagText}>{interest}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </BlurView>
                  </View>
                )}

                {card.type === 'spotify' && (
                  <BlurView intensity={25} tint="dark" style={[styles.vibeSecondaryPhotoCard, { height: screenHeight * 0.78, padding: 24 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                      <MaterialCommunityIcons name="spotify" size={26} color="#1DB954" style={{ marginRight: 8 }} />
                      <Text style={[styles.vibeSectionTitle, { marginBottom: 0 }]}>My Spotify Vibe</Text>
                    </View>
                    <View style={{ gap: 16, flex: 1, justifyContent: 'center', paddingBottom: 40 }}>
                      {card.tracks.slice(0, 3).map((track: any, idx: number) => {
                        const name = typeof track === 'string' ? track.split(' - ')[0] : track.name;
                        const artist = typeof track === 'string' ? (track.split(' - ')[1] || 'Spotify Vibe') : track.artist;
                        return (
                          <View key={idx} style={styles.vibeSpotifyTrackRow}>
                            <Text style={styles.vibeTrackIndex}>{idx + 1}</Text>
                            <View style={styles.vibeTrackArt}>
                              <Ionicons name="musical-note" size={14} color="#1DB954" />
                            </View>
                            <View style={styles.vibeSpotifyTrackInfo}>
                              <Text style={styles.vibeSpotifyTrackName} numberOfLines={1}>{name}</Text>
                              <Text style={styles.vibeSpotifyArtistName} numberOfLines={1}>{artist}</Text>
                            </View>
                            <Ionicons name="play" size={12} color="#1DB954" style={{ opacity: 0.8 }} />
                          </View>
                        );
                      })}
                    </View>
                  </BlurView>
                )}

                {card.type === 'secondary' && (
                  <BlurView intensity={25} tint="dark" style={[styles.vibeSecondaryPhotoCard, { height: screenHeight * 0.78 }]}>
                    {card.prompt ? (
                      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.vibePromptQuestion}>My Answer to</Text>
                          <Text style={styles.vibePromptTitle}>{card.prompt.title}</Text>
                        </View>

                        <View style={styles.vibeHingePhotoContainer}>
                          <Image source={{ uri: card.photo }} style={styles.vibeHingePhoto} />
                        </View>
                      </View>
                    ) : (
                      <View style={{ flex: 1 }}>
                        <Image source={{ uri: card.photo }} style={styles.vibeProfilePhoto} />
                      </View>
                    )}
                  </BlurView>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
  },
  glowBall: {
    flex: 1,
    borderRadius: 650,
  },
  flex: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
    fontSize: 16,
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
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '600',
  },
  headerInfoBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
  myText: { color: '#000000', fontSize: 14, fontWeight: '600', lineHeight: 20 },
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
  // Input Box
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  liveRecordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 10, 12, 0.9)', // Rich dark translucent background
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 24 : 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  recordingTimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redPulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
  },
  recordingTimerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordingActionIcon: {
    backgroundColor: 'rgba(255, 75, 75, 0.12)', // Subtle circular red background
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPreviewBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Premium glass stop button
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C2FF3D', // Premium neon green
    alignItems: 'center',
    justifyContent: 'center',
  },

  // WhatsApp Preview Bar
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(10, 10, 12, 0.9)', // Matching rich dark background
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 24 : 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  trashBtn: {
    backgroundColor: 'rgba(255, 75, 75, 0.12)', // Subtle circular red background
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTrackWrapper: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  previewTrackBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  previewTrackFill: {
    height: '100%',
    backgroundColor: '#C2FF3D',
    borderRadius: 2,
  },
  previewTimerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  previewSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnGlass: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  micBtnInner: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  inputGlassWrapper: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtnTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
  },
  sendBtnDisabled: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 100% Exact Vibe Card Profile Preview Modal Styles
  vibeCardModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  vibeModalFloatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 10,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  vibeModalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeModalTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  vibeCardWrapper: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 90 : 60,
  },
  vibeProfileScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  vibeAnimatedCardItem: {
    width: '100%',
    borderRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  vibeMainCardInner: {
    flex: 1,
    position: 'relative',
  },
  vibeProfilePhoto: {
    width: '100%',
    height: '100%',
  },
  vibeGlassDetailsCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(10, 11, 20, 0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  vibeCardDetailsContent: {
    gap: 8,
  },
  vibeCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vibeCardNameText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  innovativeVibeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  innovativeVibeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
  },
  vibeCardCollegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  vibeCardCollegeText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 14,
    fontWeight: '600',
  },
  vibeCardBioText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  vibeScrollWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 6,
    overflow: 'hidden',
  },
  vibeScrollContentContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vibeScrollItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vibeScrollItemText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  vibeScrollSeparator: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 12,
  },
  vibeCardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  vibeCardTagPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  vibeCardTagText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  vibeSpotifyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#10061A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#221435',
    gap: 10,
  },
  vibeSectionTitle: {
    color: '#1DB954',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vibeSpotifyTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 12,
  },
  vibeTrackIndex: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
    fontWeight: '700',
    width: 20,
  },
  vibeTrackArt: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeSpotifyTrackInfo: {
    flex: 1,
  },
  vibeSpotifyTrackName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  vibeSpotifyArtistName: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
  },
  vibeSecondaryPhotosSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16,
  },
  vibeSecondaryPhotoCard: {
    flex: 1,
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#10061A',
  },
  vibePromptHeader: {
    padding: 16,
    gap: 4,
  },
  vibePromptQuestion: {
    color: '#9D4EDD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  vibePromptTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginTop: 6,
  },
  vibePromptAnswer: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  vibeHingePhotoContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 10,
  },
  vibeHingePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  vibeSecondaryPhotoContainer: {
    height: 380,
    position: 'relative',
  },
  vibeProfileSecondaryPhoto: {
    width: '100%',
    height: '100%',
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
  shareConfCard: {
    padding: 12,
    borderRadius: 14,
    width: 220,
    borderWidth: 1,
  },
  shareConfCardMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  shareConfCardTheir: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shareConfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  shareConfHeaderText: {
    color: '#C2FF3D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  shareConfSnippet: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  shareConfDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },
  shareConfFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareConfActionText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontWeight: '700',
  },
});
