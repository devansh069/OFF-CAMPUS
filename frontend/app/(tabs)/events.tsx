import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const MOCK_EVENTS = [
  {
    event_id: 'evt_vips_pulse',
    title: 'Pulse 2026: Annual Campus Fest 🎉',
    host_name: 'VIPS Student Council',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days away
    location: 'Main Auditorium, VIPS Campus',
    description: 'Get ready for the biggest event of the year! Live band performances, street dance battles, food stalls, and a star-studded DJ night to end the celebration. Free entry for all verified college students.',
    attendee_count: 342,
    is_attending: false,
    category: 'fest',
    cover_image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80'
  },
  {
    event_id: 'evt_iitd_rendezvous',
    title: 'Rendezvous: EDM Night 🥂',
    host_name: 'IIT Delhi Cultural Association',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days away
    location: 'OAT (Open Air Theatre), IIT Delhi',
    description: 'Experience the magic of neon lights and high bass beats. Rendezvous presents the EDM Night featuring international DJs. Register now to secure your pass.',
    attendee_count: 512,
    is_attending: true,
    category: 'party',
    cover_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80'
  },
  {
    event_id: 'evt_mait_tech',
    title: 'HackMAIT 4.0 Hackathon 💡',
    host_name: 'MAIT Coding Club',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(), // Tomorrow
    location: 'Lab Block 4, MAIT Campus',
    description: 'A 24-hour sprint to build, pitch, and win. Bring your ideas, form a team, and showcase your solutions to real-world problems. Mentorship and refreshments provided.',
    attendee_count: 128,
    is_attending: false,
    category: 'workshop',
    cover_image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80'
  },
  {
    event_id: 'evt_lsr_sports',
    title: 'Basketball Championship ⚽',
    host_name: 'LSR Sports Department',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days away
    location: 'Basketball Arena, LSR Campus',
    description: 'Cheer for your college teams in the annual basketball tournament. Finals will be followed by an interactive sports meet-up and networking session.',
    attendee_count: 85,
    is_attending: false,
    category: 'sports',
    cover_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80'
  }
];

const EVENT_EXTRAS: {
  [key: string]: {
    gallery: string[];
    perks: string[];
    testimonial: {
      avatar: string;
      text: string;
      name: string;
      handle: string;
    };
  }
} = {
  evt_vips_pulse: {
    gallery: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1482578642790-221a44a50c8b?w=400&auto=format&fit=crop&q=80'
    ],
    perks: ['#fest', '#live_music', '#dj_night', '#free_entry', '#food_stalls'],
    testimonial: {
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: 'Last year\'s DJ night was absolute fire! The student council outdid themselves. Definitely RSVP\'ing for 2026!',
      name: 'Riya Gupta',
      handle: '@riya.g'
    }
  },
  evt_iitd_rendezvous: {
    gallery: [
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1482578642790-221a44a50c8b?w=400&auto=format&fit=crop&q=80'
    ],
    perks: ['#party', '#edm_night', '#neon_lights', '#star_dj', '#club_vibes'],
    testimonial: {
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: 'Rendezvous EDM nights are legendary in Delhi. The lineup this year looks insane. Already got my entry pass!',
      name: 'Aman Sharma',
      handle: '@aman_sharma'
    }
  },
  evt_mait_tech: {
    gallery: [
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&auto=format&fit=crop&q=80'
    ],
    perks: ['#hackathon', '#coding', '#workshop', '#ai', '#prizes', '#free_pizza'],
    testimonial: {
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      text: 'Participated in 3.0 and won the runner-up prize. The coding vibes and midnight pizza are unmatched. Highly recommend!',
      name: 'Kabir Malhotra',
      handle: '@kabir.codes'
    }
  },
  evt_lsr_sports: {
    gallery: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&auto=format&fit=crop&q=80'
    ],
    perks: ['#sports', '#basketball', '#finals', '#trophy', '#live_stream'],
    testimonial: {
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      text: 'LSR vs SRCC finals are always high voltage. Can\'t wait to cheer for our team this weekend! Let\'s go girls!',
      name: 'Elena Juni',
      handle: '@elena.juni'
    }
  }
};

const getEventExtras = (event: any) => {
  if (!event) return null;
  const extras = EVENT_EXTRAS[event.event_id];
  if (extras) return extras;

  // Fallbacks
  const category = event.category || 'fest';
  const tagList = [`#${category}`, '#campus', '#students', '#meetup'];

  let galleryList = EVENT_EXTRAS.evt_vips_pulse.gallery;
  if (category === 'party') galleryList = EVENT_EXTRAS.evt_iitd_rendezvous.gallery;
  else if (category === 'workshop') galleryList = EVENT_EXTRAS.evt_mait_tech.gallery;
  else if (category === 'sports') galleryList = EVENT_EXTRAS.evt_lsr_sports.gallery;

  return {
    gallery: galleryList,
    perks: tagList,
    testimonial: {
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: 'Super excited for this upcoming event on campus! Registering right now.',
      name: 'Aditi Roy',
      handle: '@aditi_roy'
    }
  };
};

const getEventFlyer = (e: any) => {
  if (!e) return '';
  if (e.cover_image) {
    if (e.cover_image.startsWith('http')) {
      return e.cover_image;
    }
    return `${EXPO_PUBLIC_BACKEND_URL}/${e.cover_image}`;
  }

  const fallbacks: { [key: string]: string } = {
    fest: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
    party: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    workshop: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
    sports: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
  };
  return fallbacks[e.category] || fallbacks.fest;
};

const getHostAvatar = (host: any) => {
  if (!host) return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  let avatarUrl = '';
  if (host.photos) {
    let parsedPhotos: string[] = [];
    if (Array.isArray(host.photos)) {
      parsedPhotos = host.photos;
    } else if (typeof host.photos === 'string') {
      try {
        parsedPhotos = JSON.parse(host.photos);
      } catch { }
    }
    if (parsedPhotos.length > 0 && parsedPhotos[0]) {
      avatarUrl = parsedPhotos[0];
    }
  }

  if (!avatarUrl && host.picture) {
    avatarUrl = host.picture;
  }

  if (!avatarUrl) {
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  }

  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  return `${EXPO_PUBLIC_BACKEND_URL}/${avatarUrl}`;
};

// Split title for Oliver Bennet style stacked name layout
const splitTitle = (title: string) => {
  if (!title) return ['', ''];
  if (title.includes(':')) {
    const parts = title.split(':');
    return [parts[0].trim(), parts.slice(1).join(':').trim()];
  }
  const words = title.split(' ');
  if (words.length > 2) {
    return [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
  }
  return [title, ''];
};

export default function Events() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<'campus' | 'global'>('campus');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Bottom Sheet variables
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const SNAP_TOP = SCREEN_HEIGHT * 0.25;
  const SNAP_BOTTOM = SCREEN_HEIGHT - 130;
  const translateY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
  const lastTranslateY = useRef(SNAP_BOTTOM);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  useEffect(() => {
    if (selectedEvent !== null) {
      translateY.setValue(SNAP_BOTTOM);
      lastTranslateY.current = SNAP_BOTTOM;
      setSheetExpanded(false);
    }
  }, [selectedEvent]);

  const animateTo = (toValue: number, duration = 300) => {
    Animated.timing(translateY, {
      toValue,
      duration,
      useNativeDriver: false,
    }).start(() => {
      lastTranslateY.current = toValue;
      setSheetExpanded(toValue === SNAP_TOP);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        let nextValue = lastTranslateY.current + gestureState.dy;
        if (nextValue < SNAP_TOP) {
          nextValue = SNAP_TOP;
        } else if (nextValue > SNAP_BOTTOM) {
          nextValue = SNAP_BOTTOM;
        }
        translateY.setValue(nextValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const velocityY = gestureState.vy;
        const currentVal = lastTranslateY.current + gestureState.dy;

        if (velocityY < -0.3) {
          animateTo(SNAP_TOP);
        } else if (velocityY > 0.3) {
          animateTo(SNAP_BOTTOM);
        } else {
          const midPoint = (SNAP_TOP + SNAP_BOTTOM) / 2;
          if (currentVal < midPoint) {
            animateTo(SNAP_TOP);
          } else {
            animateTo(SNAP_BOTTOM);
          }
        }
      },
    })
  ).current;

  // Event Creation form state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formCategory, setFormCategory] = useState('fest');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCoverImage, setFormCoverImage] = useState<string | null>(null);
  const [formGalleryPhotos, setFormGalleryPhotos] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [formRegistrationLink, setFormRegistrationLink] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');

  // Gallery scroll coordinates map
  const galleryScrollCoords = useRef<{ [key: string]: number }>({});
  const galleryRefs = useRef<{ [key: string]: ScrollView | null }>({});

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  useEffect(() => {
    if (user) {
      if (user.name) setFormHost(user.name);
      if (user.email) setFormContactEmail(user.email);
      if (user.phone_number) setFormContactPhone(user.phone_number);
    }
  }, [user]);

  const fetchEvents = async () => {
    if (sessionToken === 'dummy_token') {
      setEvents(MOCK_EVENTS);
      setLoading(false);
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/feed`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (!r.ok) throw new Error('Failed to fetch events');
      const d = await r.json();
      setEvents(d.events && d.events.length > 0 ? d.events : MOCK_EVENTS);
    } catch (e: any) {
      console.warn('fetchEvents failed, using mock events instead:', e.message);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  const pickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access library was denied.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setFormCoverImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (err) {
      console.warn('pickCoverImage failed:', err);
    }
  };

  const pickGalleryPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access library was denied.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setFormGalleryPhotos(prev => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
      }
    } catch (err) {
      console.warn('pickGalleryPhoto failed:', err);
    }
  };

  const removeGalleryPhoto = (index: number) => {
    setFormGalleryPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateEvent = async () => {
    if (!formTitle || !formHost || !formDate || !formLocation || !formDescription) {
      alert('Please fill out all required fields.');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: formTitle,
        host_name: formHost,
        category: formCategory,
        date: formDate,
        location: formLocation,
        description: formDescription,
        cover_image: formCoverImage,
        gallery_photos: formGalleryPhotos,
        registration_link: formRegistrationLink,
        contact_email: formContactEmail,
        contact_phone: formContactPhone,
      };

      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const errData = await r.json();
        throw new Error(errData.detail || 'Failed to create event');
      }

      alert('Event submitted successfully! It will be visible once approved by an administrator.');

      // Reset form
      setFormTitle('');
      setFormCategory('fest');
      setFormDate('');
      setFormLocation('');
      setFormDescription('');
      setFormCoverImage(null);
      setFormGalleryPhotos([]);
      setFormRegistrationLink('');
      setFormContactEmail(user?.email || '');
      setFormContactPhone(user?.phone_number || '');
      setDateValue(new Date());
      setCreateModalVisible(false);

      fetchEvents();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleRSVP = async (eventId: string) => {
    if (sessionToken === 'dummy_token') {
      setEvents(events.map(e => {
        if (e.event_id === eventId) {
          const isAttending = !e.is_attending;
          const countChange = isAttending ? 1 : -1;
          return {
            ...e,
            is_attending: isAttending,
            attendee_count: Math.max(0, (e.attendee_count || 0) + countChange)
          };
        }
        return e;
      }));
      setSelectedEvent((prev: any) => {
        if (prev && prev.event_id === eventId) {
          const isAttending = !prev.is_attending;
          const countChange = isAttending ? 1 : -1;
          return {
            ...prev,
            is_attending: isAttending,
            attendee_count: Math.max(0, (prev.attendee_count || 0) + countChange)
          };
        }
        return prev;
      });
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const d = await r.json();
      const updatedEvents = events.map(e =>
        e.event_id === eventId
          ? { ...e, is_attending: d.is_attending, attendee_count: d.attendee_count }
          : e
      );
      setEvents(updatedEvents);
      setSelectedEvent((prev: any) => {
        if (prev && prev.event_id === eventId) {
          return { ...prev, is_attending: d.is_attending, attendee_count: d.attendee_count };
        }
        return prev;
      });
    } catch (e) {
      console.error('RSVP toggling failed:', e);
    }
  };

  const handleToggleStar = async (eventId: string) => {
    if (sessionToken === 'dummy_token') {
      const updatedEvents = events.map(e =>
        e.event_id === eventId ? { ...e, is_starred: !e.is_starred } : e
      );
      setEvents(updatedEvents);
      setSelectedEvent((prev: any) =>
        prev && prev.event_id === eventId ? { ...prev, is_starred: !prev.is_starred } : prev
      );
      return;
    }

    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/star`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const d = await r.json();
      const updatedEvents = events.map(e =>
        e.event_id === eventId ? { ...e, is_starred: d.is_starred } : e
      );
      setEvents(updatedEvents);
      setSelectedEvent((prev: any) =>
        prev && prev.event_id === eventId ? { ...prev, is_starred: d.is_starred } : prev
      );
    } catch (e) {
      console.error('Star toggling failed:', e);
    }
  };

  const handleMessageHost = (hostName: string) => {
    setSelectedEvent(null);
    router.push('/(tabs)/messages');
  };

  const categories = [
    { key: 'party', label: 'parties and clubbing', colors: ['#FF1B6B', '#FF7B00'], icon: 'wine-outline' },
    { key: 'fest', label: 'concert and fest', colors: ['#9D4EDD', '#5E17EB'], icon: 'musical-notes-outline' },
    { key: 'workshop', label: 'workshops and tech', colors: ['#FFC300', '#FF5733'], icon: 'code-working-outline' },
    { key: 'trip', label: 'Trips', colors: ['#00B4DB', '#0083B0'], icon: 'airplane-outline' },
    { key: 'sports', label: 'sports', colors: ['#118AB2', '#06D6A0'], icon: 'football-outline' },
  ];

  const filtered = events.filter((e: any) => {
    // 1. Category Filter
    if (activeCategory && e.category !== activeCategory) {
      return false;
    }
    // 2. Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title?.toLowerCase().includes(q);
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchHost = e.host_name?.toLowerCase().includes(q);
      const matchLoc = e.location?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchHost || matchLoc;
    }
    return true;
  });

  const sortedEvents = [...filtered].sort((a, b) => {
    const aStarred = a.is_starred ? 1 : 0;
    const bStarred = b.is_starred ? 1 : 0;
    if (aStarred !== bStarred) {
      return bStarred - aStarred; // Starred first
    }
    return 0; // maintain original database order
  });

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
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.greet}>Campus Hub</Text>
            <Text style={styles.title}>Events</Text>
          </View>
          <Image
            source={require('../../assets/images/logo_off.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Search Bar Input */}
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="What events are you looking for?"
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF1B6B" />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Horizontal Category Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalFiltersScroll}
              contentContainerStyle={styles.horizontalFiltersContainer}
            >
              {categories.map((c) => {
                const isSelected = activeCategory === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.horizontalFilterPill,
                      isSelected && styles.horizontalFilterPillActive
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setActiveCategory(activeCategory === c.key ? null : c.key)}
                  >
                    <Ionicons
                      name={c.icon as any}
                      size={14}
                      color={isSelected ? '#000' : 'rgba(255,255,255,0.7)'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.horizontalFilterText,
                        isSelected && styles.horizontalFilterTextActive
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Top 5 Events Horizontal Card List */}
            {(() => {
              const top5Events = [...filtered]
                .sort((a, b) => (b.attendee_count || 0) - (a.attendee_count || 0))
                .slice(0, 5);

              if (top5Events.length === 0) return null;

              return (
                <>
                  <Text style={styles.sectionHeading}>Top 5 Events</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.topEventsScroll}
                    contentContainerStyle={styles.topEventsScrollContent}
                  >
                    {top5Events.map((e: any) => {
                      const categoryObj = categories.find(cat => cat.key === e.category) || {
                        key: 'other',
                        colors: ['#FF1B6B', '#FF7B00'],
                        icon: 'calendar-outline'
                      };
                      const eventDate = new Date(e.date);
                      const dateStr = eventDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      });

                      return (
                        <TouchableOpacity
                          key={e.event_id}
                          style={styles.topEventCard}
                          activeOpacity={0.9}
                          onPress={() => setSelectedEvent(e)}
                        >
                          <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFillObject} />
                          {/* 50% Top: Event Cover Image */}
                          <Image
                            source={{ uri: getEventFlyer(e) }}
                            style={styles.topEventImage}
                          />
                          {/* 50% Bottom: Event Info */}
                          <View style={styles.topEventInfo}>
                            <Text style={[styles.topEventCat, { color: categoryObj.colors[0] }]}>
                              {e.category.toUpperCase()}
                            </Text>
                            <Text style={styles.topEventTitle} numberOfLines={1}>
                              {e.title}
                            </Text>
                            <Text style={styles.topEventHost} numberOfLines={1}>
                              by {e.host_name}
                            </Text>
                            <View style={styles.topEventMetaRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                                <Text style={styles.topEventMetaText}>{dateStr}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.5)" style={{ marginRight: 4 }} />
                                <Text style={styles.topEventMetaText}>{e.attendee_count || 0} going</Text>
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              );
            })()}

            {/* Recent Events Vertical List */}
            <Text style={styles.sectionHeading}>Recent Events</Text>

            {sortedEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.15)" />
                <Text style={styles.emptyT}>No events found matching current filters</Text>
                {(activeCategory || searchQuery || feedMode === 'campus') && (
                  <TouchableOpacity
                    style={styles.resetFilterBtn}
                    onPress={() => {
                      setActiveCategory(null);
                      setSearchQuery('');
                      setFeedMode('global');
                    }}
                  >
                    <Text style={styles.resetFilterText}>Clear All Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.listContentContainer}>
                {sortedEvents.map((e: any) => {
                  const eventDate = new Date(e.date);
                  const daysAway = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  // Match category configuration
                  const categoryObj = categories.find(c => c.key === e.category) || {
                    key: 'other',
                    label: e.category || 'other',
                    colors: ['#FF1B6B', '#FF7B00'],
                    icon: 'calendar-outline'
                  };

                  return (
                    <TouchableOpacity
                      key={e.event_id}
                      style={styles.miniCardWrapper}
                      activeOpacity={0.9}
                      onPress={() => setSelectedEvent(e)}
                    >
                      <BlurView intensity={45} tint="dark" style={styles.miniCardGlass}>
                        {/* Left Column: Cover art thumbnail */}
                        <Image source={{ uri: getEventFlyer(e) }} style={styles.miniCardThumbnail} />

                        {/* Center Column: Title, host, mini specs */}
                        <View style={styles.miniCardDetails}>
                          <View style={styles.miniCardTopRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.miniCardCatLabel, { color: categoryObj.colors[0] }]}>
                                {categoryObj.label.toUpperCase()}
                              </Text>
                            </View>
                            <Text style={styles.miniCardDaysAway}>
                              {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `${daysAway}d left`}
                            </Text>
                          </View>

                          <Text style={styles.miniCardTitle} numberOfLines={1}>{e.title}</Text>
                          <Text style={styles.miniCardHost} numberOfLines={1}>by {e.host_name}</Text>

                          <View style={styles.miniCardStats}>
                            <View style={styles.miniCardStatItem}>
                              <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.4)" />
                              <Text style={styles.miniCardStatText}>{e.attendee_count} going</Text>
                            </View>
                            <View style={styles.miniCardStatItem}>
                              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
                              <Text style={styles.miniCardStatText} numberOfLines={1}>
                                {e.location.split(',')[0]}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Right Column: Favorite/Star button */}
                        <TouchableOpacity
                          style={styles.miniCardRsvpBtn}
                          activeOpacity={0.8}
                          onPress={() => handleToggleStar(e.event_id)}
                        >
                          {e.is_starred ? (
                            <LinearGradient
                              colors={['#FFD700', '#FFD700']}
                              style={styles.miniRsvpGradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="star" size={14} color="#000" />
                            </LinearGradient>
                          ) : (
                            <View style={styles.miniRsvpOutline}>
                              <Ionicons name="star-outline" size={14} color="rgba(255,255,255,0.5)" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </BlurView>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Full-Screen Detailed Glassmorphic Overlay Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedEvent !== null}
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.detailsModalContainer}>
            {/* Full-Screen Cover Image Section */}
            <View 
              style={styles.modalCoverContainer}
              {...(!sheetExpanded ? panResponder.panHandlers : {})}
            >
              <Image
                source={{ uri: getEventFlyer(selectedEvent) }}
                style={styles.modalCoverImage}
              />

              {/* Header buttons overlay */}
              <View style={styles.modalOverlayHeader}>
                <TouchableOpacity
                  style={styles.circularBackBtn}
                  onPress={() => setSelectedEvent(null)}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.circularStarBtn,
                    selectedEvent.is_starred && { backgroundColor: '#FFD700' }
                  ]}
                  onPress={() => handleToggleStar(selectedEvent.event_id)}
                >
                  <Ionicons
                    name={selectedEvent.is_starred ? "star" : "star-outline"}
                    size={20}
                    color={selectedEvent.is_starred ? "#000" : "#FFF"}
                  />
                </TouchableOpacity>
              </View>

              {/* Overlaid Label & Title */}
              <View style={styles.modalCoverTextOverlay}>
                <Text style={styles.modalCoverCategory}>
                  {selectedEvent.category ? selectedEvent.category.toUpperCase() : 'EVENT'}
                </Text>
                <Text style={styles.modalCoverTitle}>
                  {selectedEvent.title}
                </Text>
              </View>
            </View>

            {/* Tap to collapse overlay above details sheet */}
            {sheetExpanded && (
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: SNAP_TOP,
                  zIndex: 8,
                }}
                activeOpacity={1}
                onPress={() => animateTo(SNAP_BOTTOM)}
              />
            )}

            {/* Sliding Bottom Sheet */}
            <Animated.View
              style={[
                styles.modalSheetContainer,
                {
                  position: 'absolute',
                  top: translateY,
                  left: 0,
                  right: 0,
                  height: SCREEN_HEIGHT - SNAP_TOP,
                  zIndex: 10,
                }
              ]}
            >
              {/* Drag Handle Row */}
              <View style={styles.modalDragHandleRow} {...panResponder.panHandlers}>
                <View style={styles.modalDragHandle} />
              </View>

              {!sheetExpanded ? (
                <View style={styles.minimizedSheetContent}>
                  <TouchableOpacity
                    style={styles.minimizedViewDetailsBtn}
                    activeOpacity={0.85}
                    onPress={() => animateTo(SNAP_TOP)}
                  >
                    <Text style={styles.minimizedViewDetailsText}>View Details</Text>
                    {/* <Ionicons name="chevron-up" size={18} color="#000" /> */}
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.expandedSheetHeader}>
                    <Text style={styles.expandedSheetTitle}>Event Details</Text>
                    <TouchableOpacity
                      style={styles.expandedSheetCloseBtn}
                      onPress={() => animateTo(SNAP_BOTTOM)}
                    >
                      <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.modalSheetScrollContent}
                  >
                    {/* Gallery Photos Row */}
                    {(() => {
                      let galleryImages: string[] = [];
                      if (selectedEvent.gallery_photos) {
                        if (Array.isArray(selectedEvent.gallery_photos)) {
                          galleryImages = selectedEvent.gallery_photos;
                        } else if (typeof selectedEvent.gallery_photos === 'string') {
                          try {
                            galleryImages = JSON.parse(selectedEvent.gallery_photos);
                          } catch { }
                        }
                      }
                      const extras = getEventExtras(selectedEvent);
                      if (galleryImages.length === 0 && extras && extras.gallery) {
                        galleryImages = extras.gallery;
                      }

                      if (galleryImages.length === 0) return null;

                      return (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.modalGalleryScroll}
                          contentContainerStyle={styles.modalGalleryScrollContent}
                        >
                          {galleryImages.map((imgUri, imgIndex) => {
                            const finalUri = imgUri.startsWith('http')
                              ? imgUri
                              : `${EXPO_PUBLIC_BACKEND_URL}/${imgUri}`;
                            return (
                              <Image
                                key={imgIndex}
                                source={{ uri: finalUri }}
                                style={styles.modalGalleryThumbnail}
                              />
                            );
                          })}
                        </ScrollView>
                      );
                    })()}

                    {/* Metrics Grid Row */}
                    {(() => {
                      const eventDate = new Date(selectedEvent.date);
                      const dateStr = eventDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <View style={styles.modalSpecsRow}>
                          <View style={styles.modalSpecBox}>
                            <Ionicons name="time" size={18} color="#C2FF3D" />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.modalSpecVal}>{dateStr}</Text>
                              <Text style={styles.modalSpecLbl}>Date & Time</Text>
                            </View>
                          </View>

                          <View style={styles.modalSpecBox}>
                            <Ionicons name="location" size={18} color="#C2FF3D" />
                            <View style={{ marginLeft: 8, flex: 1 }}>
                              <Text style={styles.modalSpecVal} numberOfLines={1}>
                                {selectedEvent.location || 'Campus'}
                              </Text>
                              <Text style={styles.modalSpecLbl}>Location</Text>
                            </View>
                          </View>

                          <View style={styles.modalSpecBox}>
                            <Ionicons name="people" size={18} color="#C2FF3D" />
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.modalSpecVal}>{selectedEvent.attendee_count || 0}</Text>
                              <Text style={styles.modalSpecLbl}>Attendees</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* About Event Description */}
                    <Text style={styles.modalAboutHeading}>About event</Text>
                    <Text style={styles.modalAboutText}>
                      {selectedEvent.description || 'No description provided.'}
                    </Text>

                    {/* Organizer details */}
                    {(() => {
                      const displayEmail = selectedEvent.contact_email || selectedEvent.host?.email;
                      const displayPhone = selectedEvent.contact_phone || selectedEvent.host?.phone_number;
                      return (
                        <View style={styles.modalOrganizerCard}>
                          <Text style={styles.modalOrganizerTitle}>Event Organizer</Text>
                          <View style={styles.modalOrganizerUserRow}>
                            <Image
                              source={{ uri: getHostAvatar(selectedEvent.host) }}
                              style={styles.modalOrganizerAvatar}
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.modalOrganizerName}>
                                {selectedEvent.host?.name || selectedEvent.host_name}
                              </Text>
                              {displayEmail ? (
                                <Text style={styles.modalOrganizerMeta}>{displayEmail}</Text>
                              ) : null}
                              {displayPhone ? (
                                <Text style={styles.modalOrganizerMeta}>{displayPhone}</Text>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* Extra bottom padding */}
                    <View style={{ height: 120 }} />
                  </ScrollView>

                  {/* Absolute Bottom Actions Bar */}
                  {(() => {
                    const isGoing = selectedEvent.is_attending;
                    return (
                      <BlurView intensity={Platform.OS === 'ios' ? 70 : 100} tint="dark" style={styles.modalBottomBar}>
                        {/* Left Half: Thumbs Up / Down */}
                        <View style={styles.thumbsContainer}>
                          {/* Thumbs Up (attending / +1) */}
                          <TouchableOpacity
                            style={[
                              styles.thumbActionBtn,
                              isGoing ? styles.thumbUpActive : styles.thumbInactive
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (!isGoing) {
                                handleRSVP(selectedEvent.event_id);
                              }
                            }}
                          >
                            <Ionicons
                              name={isGoing ? "thumbs-up" : "thumbs-up-outline"}
                              size={18}
                              color={isGoing ? "#000" : "#FFF"}
                            />
                            <Text style={[styles.thumbActionText, { color: isGoing ? "#000" : "#FFF" }]}>
                              +1
                            </Text>
                          </TouchableOpacity>

                          {/* Thumbs Down (not attending / -1) */}
                          <TouchableOpacity
                            style={[
                              styles.thumbActionBtn,
                              !isGoing ? styles.thumbDownActive : styles.thumbInactive
                            ]}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (isGoing) {
                                handleRSVP(selectedEvent.event_id);
                              }
                            }}
                          >
                            <Ionicons
                              name={!isGoing ? "thumbs-down" : "thumbs-down-outline"}
                              size={18}
                              color={!isGoing ? "#000" : "#FFF"}
                            />
                            <Text style={[styles.thumbActionText, { color: !isGoing ? "#000" : "#FFF" }]}>
                              -1
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Right Half: Register Now */}
                        <TouchableOpacity
                          style={styles.modalRegisterNowBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (selectedEvent.registration_link) {
                              Linking.openURL(selectedEvent.registration_link).catch(err => {
                                console.error(err);
                                alert("Could not open the link.");
                              });
                            } else {
                              Alert.alert("No Link", "This event does not have a registration link.");
                            }
                          }}
                        >
                          <Text style={styles.modalRegisterNowText}>Register Now</Text>
                        </TouchableOpacity>
                      </BlurView>
                    );
                  })()}
                </>
              )}
            </Animated.View>
          </View>
        )}
      </Modal>

      {user && (
        <TouchableOpacity
          style={styles.fabBtn}
          activeOpacity={0.8}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      )}

      {/* Add Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.detailsModalContainer}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Header */}
              <View style={styles.detailsModalHeader}>
                <TouchableOpacity
                  style={styles.modalHeaderCloseBtn}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.modalHeaderTitle}>Create New Event</Text>
                <View style={{ width: 36 }} />
              </View>

              {/* Form Card */}
              <View style={styles.modalCardWrapper}>
                <BlurView intensity={65} tint="dark" style={styles.detailsGlassCard}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.modalCardScrollContent}
                  >
                    <View style={styles.modalDragHandleRow}>
                      <View style={styles.modalDragHandle} />
                    </View>

                    <Text style={styles.inputLabel}>Event Title *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Neon Dance Party"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formTitle}
                      onChangeText={setFormTitle}
                    />

                    <Text style={styles.inputLabel}>Host Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Student Council"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formHost}
                      onChangeText={setFormHost}
                    />

                    <Text style={styles.inputLabel}>Category</Text>
                    <View style={styles.formRow}>
                      {['fest', 'party', 'workshop', 'sports'].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.formCatBtn,
                            formCategory === cat && styles.formCatBtnActive,
                          ]}
                          onPress={() => setFormCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.formCatText,
                              formCategory === cat && styles.formCatTextActive,
                            ]}
                          >
                            {cat.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Date & Time *</Text>
                    {Platform.OS === 'web' ? (
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 2026-07-15 18:00"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={formDate}
                        onChangeText={setFormDate}
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.input,
                            {
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              height: 50,
                            },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => setShowDatePicker(true)}
                        >
                          <Text style={{ color: formDate ? '#FFF' : 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                            {formDate
                              ? new Date(formDate).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                              : 'Select Date & Time'}
                          </Text>
                          <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>

                        {showDatePicker && (
                          <DateTimePicker
                            value={dateValue}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                              setShowDatePicker(false);
                              if (selectedDate) {
                                setDateValue(selectedDate);
                                setShowTimePicker(true);
                              }
                            }}
                          />
                        )}

                        {showTimePicker && (
                          <DateTimePicker
                            value={dateValue}
                            mode="time"
                            display="default"
                            is24Hour={true}
                            onChange={(event, selectedTime) => {
                              setShowTimePicker(false);
                              if (selectedTime) {
                                const combinedDate = new Date(dateValue);
                                combinedDate.setHours(selectedTime.getHours());
                                combinedDate.setMinutes(selectedTime.getMinutes());
                                setDateValue(combinedDate);
                                setFormDate(combinedDate.toISOString());
                              }
                            }}
                          />
                        )}
                      </>
                    )}

                    <Text style={styles.inputLabel}>Registration Link</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. https://forms.gle/... or website link"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formRegistrationLink}
                      onChangeText={setFormRegistrationLink}
                      autoCapitalize="none"
                      keyboardType="url"
                    />

                    <Text style={styles.inputLabel}>Contact Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. contact@college.edu"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formContactEmail}
                      onChangeText={setFormContactEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />

                    <Text style={styles.inputLabel}>Contact Phone Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. +91 98765 43210"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formContactPhone}
                      onChangeText={setFormContactPhone}
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.inputLabel}>Location *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Main Auditorium, Campus"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formLocation}
                      onChangeText={setFormLocation}
                    />

                    <Text style={styles.inputLabel}>Description *</Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Tell students about the event..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={formDescription}
                      onChangeText={setFormDescription}
                      multiline
                      numberOfLines={4}
                    />

                    {/* Cover Image Picker */}
                    <Text style={styles.inputLabel}>Cover Image</Text>
                    {formCoverImage ? (
                      <View style={{ position: 'relative' }}>
                        <Image source={{ uri: formCoverImage }} style={styles.formImagePreview} />
                        <TouchableOpacity
                          style={[styles.galleryDeleteBtn, { top: 6, right: 6 }]}
                          onPress={() => setFormCoverImage(null)}
                        >
                          <Ionicons name="close" size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.imagePickerBtn} onPress={pickCoverImage}>
                        <Ionicons name="image-outline" size={20} color="#FFF" />
                        <Text style={styles.imagePickerBtnText}>Select Cover Image</Text>
                      </TouchableOpacity>
                    )}

                    {/* Gallery Photos Picker */}
                    <Text style={styles.inputLabel}>Gallery Photos</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {formGalleryPhotos.map((photo, idx) => (
                        <View key={idx} style={styles.galleryThumbWrapper}>
                          <Image source={{ uri: photo }} style={styles.galleryThumb} />
                          <TouchableOpacity
                            style={styles.galleryDeleteBtn}
                            onPress={() => removeGalleryPhoto(idx)}
                          >
                            <Ionicons name="close" size={12} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity style={styles.imagePickerBtn} onPress={pickGalleryPhoto}>
                      <Ionicons name="images-outline" size={20} color="#FFF" />
                      <Text style={styles.imagePickerBtnText}>Add Gallery Photo</Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <TouchableOpacity
                      style={styles.submitBtn}
                      activeOpacity={0.8}
                      onPress={handleCreateEvent}
                      disabled={creating}
                    >
                      <LinearGradient
                        colors={['#FF1B6B', '#FF6B35']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.submitGradient}
                      >
                        {creating ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.submitBtnText}>Create Event</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                  </ScrollView>
                </BlurView>
              </View>
            </SafeAreaView>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  glowBallContainer: {
    position: 'absolute',
    top: -450,
    left: -450,
    width: 1300,
    height: 1300,
    borderRadius: 650,
    overflow: 'hidden',
  },
  orbTopLeft: {
    position: 'absolute',
    top: -160,
    left: -160,
    width: 560,
    height: 560,
    borderRadius: 280,
    overflow: 'hidden',
  },
  orbBottomRight: {
    position: 'absolute',
    bottom: -160,
    right: -160,
    width: 560,
    height: 560,
    borderRadius: 280,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 8,
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  headerTitleContainer: {
    flex: 1,
  },
  greet: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  premBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },

  // Category Pill Bar
  categoriesPillWrapper: {
    height: 48,
    marginVertical: 4,
  },
  categoriesPillsContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  categoryPillText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    fontWeight: '700',
  },

  // Main list
  listContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  miniCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(7, 8, 15, 0.45)',
  },
  miniCardGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  miniCardThumbnail: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  miniCardDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
    gap: 2,
  },
  miniCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniCardCatLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  miniCardDaysAway: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
  },
  miniCardTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  miniCardHost: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11.5,
    fontWeight: '500',
  },
  miniCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  miniCardStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniCardStatText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },
  miniCardRsvpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  miniRsvpGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRsvpOutline: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyT: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resetFilterBtn: {
    marginTop: 16,
    backgroundColor: '#C2FF3D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  resetFilterText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal Detailed View
  detailsModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 54,
  },
  modalHeaderCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalHeaderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCardWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 16 : 24,
    justifyContent: 'center',
  },
  detailsGlassCard: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(7, 8, 15, 0.45)',
    overflow: 'hidden',
  },
  modalCardScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalDragHandleRow: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },

  // Stacked title styling inside modal
  profileDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  titleInfoContainer: {
    flex: 1,
    marginRight: 16,
  },
  eventTitleFirstLine: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  eventTitleSecondLine: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: 1,
  },
  hostHandleText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starGlowWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF1B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  starEmptyWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  messageHostPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Description bio inside modal
  descriptionBio: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    fontWeight: '500',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Tags Container
  tagsContainer: {
    marginTop: 16,
    maxHeight: 32,
  },
  tagsContent: {
    gap: 6,
    paddingRight: 10,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tagPillText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
  },

  // Gallery Carousel inside modal
  galleryWrapper: {
    marginTop: 18,
    gap: 8,
  },
  galleryScroll: {
    maxHeight: 100,
  },
  galleryScrollContent: {
    gap: 8,
  },
  galleryImage: {
    width: 72,
    height: 96,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  galleryArrowRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  galleryArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C2FF3D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },

  // Testimonial highlight bubble inside modal
  testimonialContainer: {
    marginTop: 18,
    gap: 10,
  },
  testimonialSpeechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 12,
  },
  testimonialText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  testimonialUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
  },
  testimonialAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  testimonialName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  testimonialHandle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#C2FF3D',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  formCatBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  formCatBtnActive: {
    borderColor: '#FF1B6B',
    backgroundColor: 'rgba(255, 27, 107, 0.15)',
  },
  formCatText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  formCatTextActive: {
    color: '#FF1B6B',
  },
  inputLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#FFF',
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  imagePickerBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  formImagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  galleryThumbWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  galleryThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  galleryDeleteBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3366',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 30,
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // Segmented control toggle
  feedToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  feedTogglePillActive: {
    backgroundColor: '#C2FF3D',
  },
  feedToggleText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  feedToggleTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // Search input styling
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },

  // Headings
  sectionHeading: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 8,
  },

  // Horizontal Category Filters
  horizontalFiltersScroll: {
    marginVertical: 10,
    maxHeight: 46,
  },
  horizontalFiltersContainer: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  horizontalFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  horizontalFilterPillActive: {
    backgroundColor: '#C2FF3D',
    borderColor: '#C2FF3D',
  },
  horizontalFilterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  horizontalFilterTextActive: {
    color: '#000',
    fontWeight: '800',
  },

  // Top 5 Horizontal Event Cards
  topEventsScroll: {
    marginVertical: 10,
  },
  topEventsScrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  topEventCard: {
    width: 230,
    height: 230,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(7, 8, 15, 0.45)',
  },
  topEventImage: {
    width: '100%',
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  topEventInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topEventCat: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topEventTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  topEventHost: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '500',
  },
  topEventMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  topEventMetaText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 18,
  },
  registerNowBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 6,
  },
  registerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  registerNowText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
  rsvpThumbsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  thumbBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  thumbBtnInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbBtnActiveGreen: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderColor: 'rgba(0, 255, 102, 0.4)',
  },
  thumbBtnActiveRed: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: 'rgba(255, 51, 102, 0.4)',
  },
  thumbText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hostContactHeading: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Travelers-App Modal Styling
  modalCoverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalOverlayHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    zIndex: 10,
  },
  circularBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  circularStarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  modalCoverTextOverlay: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  modalCoverCategory: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalCoverTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  modalSheetContainer: {
    backgroundColor: '#0c0812',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalSheetScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  minimizedSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  minimizedViewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C2FF3D',
    width: '100%',
    height: 48,
    borderRadius: 24,
    gap: 8,
  },
  minimizedViewDetailsText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  expandedSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  expandedSheetTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  expandedSheetCloseBtn: {
    padding: 4,
  },
  modalGalleryScroll: {
    marginVertical: 4,
    maxHeight: 85,
  },
  modalGalleryScrollContent: {
    gap: 12,
  },
  modalGalleryThumbnail: {
    width: 120,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalSpecsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 10,
  },
  modalSpecBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalSpecVal: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  modalSpecLbl: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 2,
  },
  modalAboutHeading: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 8,
  },
  modalAboutText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalOrganizerCard: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalOrganizerTitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modalOrganizerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOrganizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalOrganizerName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOrganizerMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  modalBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 95 : 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  thumbsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  thumbActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
  },
  thumbInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbUpActive: {
    backgroundColor: '#C2FF3D',
    borderColor: '#C2FF3D',
  },
  thumbDownActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  thumbActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalRegisterNowBtn: {
    width: '48%',
    height: 46,
    borderRadius: 23,
    backgroundColor: '#C2FF3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRegisterNowText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
