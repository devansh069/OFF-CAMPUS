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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

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
  const [filter, setFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Gallery scroll coordinates map
  const galleryScrollCoords = useRef<{ [key: string]: number }>({});
  const galleryRefs = useRef<{ [key: string]: ScrollView | null }>({});

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

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
      if (sessionToken === 'dummy_token') {
        // Mock toggle
        setEvents(prev => prev.map(e => {
          if (e.event_id === eventId) {
            const isAttending = !e.is_attending;
            return {
              ...e,
              is_attending: isAttending,
              attendee_count: isAttending ? e.attendee_count + 1 : e.attendee_count - 1
            };
          }
          return e;
        }));
        // Update selected event if open
        setSelectedEvent((prev: any) => {
          if (prev && prev.event_id === eventId) {
            const isAttending = !prev.is_attending;
            return {
              ...prev,
              is_attending: isAttending,
              attendee_count: isAttending ? prev.attendee_count + 1 : prev.attendee_count - 1
            };
          }
          return prev;
        });
        return;
      }

      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const d = await r.json();
      const updatedEvents = events.map(e => 
        e.event_id === eventId 
          ? { ...e, is_attending: d.attending, attendee_count: d.attendee_count } 
          : e
      );
      setEvents(updatedEvents);
      setSelectedEvent((prev: any) => {
        if (prev && prev.event_id === eventId) {
          return { ...prev, is_attending: d.attending, attendee_count: d.attendee_count };
        }
        return prev;
      });
    } catch (e) {
      console.error('RSVP toggling failed:', e);
    }
  };

  const handleMessageHost = (hostName: string) => {
    setSelectedEvent(null);
    router.push('/(tabs)/messages');
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.category === filter);

  const categories = [
    { key: 'all', label: '🌟 All', color: '#FF1B6B' },
    { key: 'fest', label: '🎉 Fests', color: '#9D4EDD' },
    { key: 'party', label: '🥂 Parties', color: '#F77F00' },
    { key: 'workshop', label: '💡 Workshops', color: '#06D6A0' },
    { key: 'sports', label: '⚽ Sports', color: '#118AB2' },
  ];

  return (
    <View style={styles.container}>
      {/* Grayscale aesthetic dark portrait background image */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&auto=format&fit=crop&q=80' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        blurRadius={Platform.OS === 'android' ? 25 : 0}
      />
      <BlurView intensity={75} tint="dark" style={StyleSheet.absoluteFillObject}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Title & Header */}
          <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.greet}>Campus Hub</Text>
          <Text style={styles.title}>College Events 🎊</Text>
        </View>
        {!user?.is_premium && (
          <TouchableOpacity style={styles.premBtn} onPress={() => router.push('/premium')}>
            <Ionicons name="diamond" size={14} color="#FFD700" />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal categories selectors directly visible at the top */}
      <View style={styles.categoriesPillWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesPillsContent}
        >
          {categories.map((c) => {
            const isSelected = filter === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.categoryPill,
                  isSelected && {
                    backgroundColor: c.color + '15',
                    borderColor: c.color,
                  }
                ]}
                onPress={() => setFilter(c.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && { color: c.color, fontWeight: '800' }
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF1B6B" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.15)" />
            <Text style={styles.emptyT}>No events found in this category</Text>
            <TouchableOpacity style={styles.resetFilterBtn} onPress={() => setFilter('all')}>
              <Text style={styles.resetFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Scrollable vertical list of smaller event card containers */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
        >
          {filtered.map((e: any) => {
            const eventDate = new Date(e.date);
            const daysAway = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const categoryObj = categories.find(c => c.key === e.category) || categories[0];

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
                      <Text style={[styles.miniCardCatLabel, { color: categoryObj.color }]}>
                        {categoryObj.label.split(' ')[1].toUpperCase()}
                      </Text>
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

                  {/* Right Column: Inline quick RSVP button */}
                  <TouchableOpacity
                    style={styles.miniCardRsvpBtn}
                    activeOpacity={0.8}
                    onPress={() => handleRSVP(e.event_id)}
                  >
                    {e.is_attending ? (
                      <LinearGradient
                        colors={['#C2FF3D', '#C2FF3D']}
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
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Full-Screen Detailed Glassmorphic Overlay Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedEvent !== null}
        onRequestClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <View style={styles.detailsModalContainer}>
            {/* Blurred background image matching the selected event */}
            <Image
              source={{ uri: getEventFlyer(selectedEvent) }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject}>
              <SafeAreaView style={{ flex: 1 }}>
                
                {/* Back button and page specs header */}
                <View style={styles.detailsModalHeader}>
                  <TouchableOpacity
                    style={styles.modalHeaderCloseBtn}
                    onPress={() => setSelectedEvent(null)}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.modalHeaderTitle}>Event Details</Text>
                  <View style={{ width: 36 }} />
                </View>

                {/* Central Frosted Glass Card Container */}
                <View style={styles.modalCardWrapper}>
                  <BlurView intensity={65} tint="dark" style={styles.detailsGlassCard}>
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.modalCardScrollContent}
                    >
                      {/* Drag Handle element */}
                      <View style={styles.modalDragHandleRow}>
                        <View style={styles.modalDragHandle} />
                      </View>

                      {/* Header Stacked title & action buttons */}
                      {(() => {
                        const [tFirst, tSecond] = splitTitle(selectedEvent.title);
                        const extras = getEventExtras(selectedEvent);
                        const hostHandleStr = selectedEvent.host_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        const sEventDate = new Date(selectedEvent.date);
                        const sDaysAway = Math.ceil((sEventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                        return (
                          <>
                            <View style={styles.profileDetailsRow}>
                              <View style={styles.titleInfoContainer}>
                                <Text style={styles.eventTitleFirstLine} numberOfLines={1}>{tFirst}</Text>
                                {tSecond ? (
                                  <Text style={styles.eventTitleSecondLine} numberOfLines={1}>{tSecond}</Text>
                                ) : null}
                                <Text style={styles.hostHandleText}>@{hostHandleStr}</Text>
                              </View>

                              <View style={styles.actionButtonsCol}>
                                 {/* Glowing Star RSVP Toggle */}
                                 <TouchableOpacity
                                   activeOpacity={0.8}
                                   onPress={() => handleRSVP(selectedEvent.event_id)}
                                 >
                                   {selectedEvent.is_attending ? (
                                     <LinearGradient
                                       colors={['#C2FF3D', '#C2FF3D']}
                                       start={{ x: 0, y: 0 }}
                                       end={{ x: 1, y: 1 }}
                                       style={styles.starGlowWrapper}
                                     >
                                       <Ionicons name="star" size={18} color="#000" />
                                     </LinearGradient>
                                   ) : (
                                     <View style={styles.starEmptyWrapper}>
                                       <Ionicons name="star-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
                                     </View>
                                   )}
                                 </TouchableOpacity>

                                 {/* Message Host Envelope button */}
                                 <TouchableOpacity
                                   activeOpacity={0.8}
                                   style={styles.messageHostPill}
                                   onPress={() => handleMessageHost(selectedEvent.host_name)}
                                 >
                                   <Ionicons name="mail" size={16} color="#000" />
                                 </TouchableOpacity>
                               </View>
                            </View>

                            {/* Description Bio text */}
                            <Text style={styles.descriptionBio}>{selectedEvent.description}</Text>

                            {/* Stats Row */}
                            <View style={styles.statsRow}>
                              <View style={styles.statCol}>
                                <Text style={styles.statNum}>{selectedEvent.attendee_count}</Text>
                                <Text style={styles.statLabel}>Going</Text>
                              </View>
                              <View style={styles.statCol}>
                                <Text style={styles.statNum}>
                                  {sDaysAway === 0 ? 'Today' : sDaysAway === 1 ? '1 Day' : `${sDaysAway} Days`}
                                </Text>
                                <Text style={styles.statLabel}>Left</Text>
                              </View>
                              <View style={styles.statCol}>
                                <Text style={styles.statNum} numberOfLines={1}>
                                  {selectedEvent.category ? selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1) : 'Event'}
                                </Text>
                                <Text style={styles.statLabel}>Access</Text>
                              </View>
                            </View>

                            {/* Perks/Tags horizontal scroll */}
                            {extras && extras.perks && (
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.tagsContainer}
                                contentContainerStyle={styles.tagsContent}
                              >
                                {extras.perks.map((perk, pIndex) => (
                                  <View key={pIndex} style={styles.tagPill}>
                                    <Text style={styles.tagPillText}>{perk}</Text>
                                  </View>
                                ))}
                              </ScrollView>
                            )}

                            {/* Creations Carousel Gallery */}
                            {extras && extras.gallery && (
                              <View style={styles.galleryWrapper}>
                                <ScrollView
                                  ref={(ref) => {
                                    galleryRefs.current[selectedEvent.event_id] = ref;
                                  }}
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  style={styles.galleryScroll}
                                  contentContainerStyle={styles.galleryScrollContent}
                                  onScroll={(ev) => {
                                    galleryScrollCoords.current[selectedEvent.event_id] = ev.nativeEvent.contentOffset.x;
                                  }}
                                  scrollEventThrottle={16}
                                >
                                  {extras.gallery.map((imgUri, imgIndex) => (
                                    <Image
                                      key={imgIndex}
                                      source={{ uri: imgUri }}
                                      style={styles.galleryImage}
                                    />
                                  ))}
                                </ScrollView>

                                <View style={styles.galleryArrowRow}>
                                  <TouchableOpacity
                                    style={styles.galleryArrowBtn}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                      const currentX = galleryScrollCoords.current[selectedEvent.event_id] || 0;
                                      const newX = Math.max(0, currentX - 140);
                                      galleryRefs.current[selectedEvent.event_id]?.scrollTo({ x: newX, animated: true });
                                      galleryScrollCoords.current[selectedEvent.event_id] = newX;
                                    }}
                                  >
                                    <Ionicons name="arrow-back" size={14} color="#000" />
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.galleryArrowBtn}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                      const currentX = galleryScrollCoords.current[selectedEvent.event_id] || 0;
                                      const newX = currentX + 140;
                                      galleryRefs.current[selectedEvent.event_id]?.scrollTo({ x: newX, animated: true });
                                      galleryScrollCoords.current[selectedEvent.event_id] = newX;
                                    }}
                                  >
                                    <Ionicons name="arrow-forward" size={14} color="#000" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}

                            {/* Testimonial Quote Bubble */}
                            {extras && extras.testimonial && (
                              <View style={styles.testimonialContainer}>
                                <View style={styles.testimonialSpeechBubble}>
                                  <Text style={styles.testimonialText}>
                                    {`"${extras.testimonial.text}"`}
                                  </Text>
                                </View>
                                <View style={styles.testimonialUserRow}>
                                  <Image
                                    source={{ uri: extras.testimonial.avatar }}
                                    style={styles.testimonialAvatar}
                                  />
                                  <View>
                                    <Text style={styles.testimonialName}>{extras.testimonial.name}</Text>
                                    <Text style={styles.testimonialHandle}>{extras.testimonial.handle}</Text>
                                  </View>
                                </View>
                              </View>
                            )}
                          </>
                        );
                      })()}
                      
                      <View style={{ height: 16 }} />
                    </ScrollView>
                  </BlurView>
                </View>
              </SafeAreaView>
            </BlurView>
          </View>
        )}
      </Modal>
        </SafeAreaView>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 8,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  testimonialName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  testimonialHandle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
});
