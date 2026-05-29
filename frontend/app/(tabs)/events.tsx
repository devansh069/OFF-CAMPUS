import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Events() {
  const { user, sessionToken } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/feed`, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      const d = await r.json();
      setEvents(d.events || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleRSVP = async (eventId: string) => {
    try {
      const r = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/rsvp`, { method: 'POST', headers: { 'Authorization': `Bearer ${sessionToken}` } });
      const d = await r.json();
      setEvents(events.map(e => e.event_id === eventId ? { ...e, is_attending: d.attending, attendee_count: d.attendee_count } : e));
    } catch (e) { console.error(e); }
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
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1A0B2E', '#0F0817']} style={styles.bg}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>Upcoming</Text>
            <Text style={styles.title}>Fests & Events 🎊</Text>
          </View>
          {!user?.is_premium && (
            <TouchableOpacity style={styles.premBtn} onPress={() => router.push('/premium')}>
              <Ionicons name="diamond" size={14} color="#FFD700" />
              <Text style={styles.premBtnText}>Go Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {categories.map(c => (
            <TouchableOpacity key={c.key} style={[styles.catChip, filter === c.key && { backgroundColor: c.color, borderColor: c.color }]} onPress={() => setFilter(c.key)}>
              <Text style={[styles.catText, filter === c.key && { color: '#FFF' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#FF1B6B" /></View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} tintColor="#FF1B6B" />}>
            {filtered.length === 0 ? (
              <View style={styles.empty}><Ionicons name="calendar-outline" size={80} color="#3D2B4F" /><Text style={styles.emptyT}>No events yet</Text></View>
            ) : filtered.map((e: any) => {
              const eventDate = new Date(e.date);
              const daysAway = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <TouchableOpacity key={e.event_id} style={styles.card} activeOpacity={0.9}>
                  {e.cover_image && (
                    <Image source={{ uri: e.cover_image }} style={styles.cover} />
                  )}
                  <LinearGradient colors={['transparent', 'rgba(15,8,23,0.95)']} style={styles.coverOverlay}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
                      <Text style={styles.dateMon}>{eventDate.toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
                    </View>
                    <View style={styles.daysAwayBadge}>
                      <Text style={styles.daysAwayText}>{daysAway === 0 ? 'TODAY' : daysAway === 1 ? 'TOMORROW' : `${daysAway} DAYS`}</Text>
                    </View>
                  </LinearGradient>
                  <View style={styles.cardBody}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <Text style={styles.hostText}>by {e.host_name}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location" size={14} color="#FF1B6B" />
                        <Text style={styles.metaText}>{e.location}</Text>
                      </View>
                    </View>
                    <Text style={styles.descText} numberOfLines={2}>{e.description}</Text>
                    <View style={styles.bottomRow}>
                      <View style={styles.attendBadge}>
                        <Ionicons name="people" size={14} color="#06D6A0" />
                        <Text style={styles.attendText}>{e.attendee_count} going</Text>
                      </View>
                      <TouchableOpacity style={[styles.rsvpBtn, e.is_attending && styles.rsvpBtnActive]} onPress={() => handleRSVP(e.event_id)}>
                        <Ionicons name={e.is_attending ? 'checkmark-circle' : 'add-circle'} size={16} color="#FFF" />
                        <Text style={styles.rsvpText}>{e.is_attending ? 'Going' : 'RSVP'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0817' },
  bg: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  greet: { color: '#A899B8', fontSize: 12, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  premBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2A1B3D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FFD700' },
  premBtnText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  catRow: { marginVertical: 8, flexGrow: 0 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A0F2A', borderWidth: 1, borderColor: '#2A1B3D' },
  catText: { color: '#A899B8', fontSize: 13, fontWeight: '600' },
  card: { margin: 16, marginVertical: 8, backgroundColor: '#1A0F2A', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#2A1B3D' },
  cover: { width: '100%', height: 180, backgroundColor: '#2A1B3D' },
  coverOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
  dateBadge: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  dateDay: { color: '#FF1B6B', fontSize: 22, fontWeight: '900' },
  dateMon: { color: '#1A0F2A', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  daysAwayBadge: { backgroundColor: '#FF1B6B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  daysAwayText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  cardBody: { padding: 16, gap: 6 },
  eventTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  hostText: { color: '#A899B8', fontSize: 12 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#A899B8', fontSize: 12 },
  descText: { color: '#C5B6D6', fontSize: 13, marginTop: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  attendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#06D6A022', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  attendText: { color: '#06D6A0', fontSize: 12, fontWeight: '700' },
  rsvpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF1B6B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  rsvpBtnActive: { backgroundColor: '#06D6A0' },
  rsvpText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyT: { color: '#A899B8', marginTop: 12 },
});
