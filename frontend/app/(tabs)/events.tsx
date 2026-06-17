import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Modal } from 'react-native';
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
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

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
      setSelectedEvent((prev: any) => {
        if (prev && prev.event_id === eventId) {
          return { ...prev, is_attending: d.attending, attendee_count: d.attendee_count };
        }
        return prev;
      });
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
      <View style={styles.bg}>
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
              <View style={styles.empty}><Ionicons name="calendar-outline" size={80} color="rgba(255, 255, 255, 0.1)" /><Text style={styles.emptyT}>No events yet</Text></View>
            ) : filtered.map((e: any) => {
              const eventDate = new Date(e.date);
              const daysAway = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <TouchableOpacity key={e.event_id} style={styles.card} activeOpacity={0.9} onPress={() => setSelectedEvent(e)}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateDay}>{eventDate.getDate()}</Text>
                      <Text style={styles.dateMon}>{eventDate.toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
                    </View>
                    <View style={styles.titleInfo}>
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      <Text style={styles.hostText}>by {e.host_name}</Text>
                    </View>
                    <View style={styles.daysAwayBadge}>
                      <Text style={styles.daysAwayText}>
                        {daysAway === 0 ? 'TODAY' : daysAway === 1 ? 'TOMORROW' : `${daysAway}d away`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
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
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedEvent !== null}
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedEvent(null)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            
            <View style={styles.modalHeader}>
              <View style={[styles.modalCatBadge, { backgroundColor: categories.find(c => c.key === selectedEvent?.category)?.color || '#FF1B6B' }]}>
                <Text style={styles.modalCatText}>
                  {selectedEvent?.category ? selectedEvent.category.toUpperCase() : 'EVENT'}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
              
              <View style={styles.modalHostRow}>
                <View style={styles.hostAvatar}>
                  <Text style={styles.hostAvatarText}>
                    {selectedEvent?.host_name ? selectedEvent.host_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'H'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.hostLabel}>Hosted by</Text>
                  <Text style={styles.hostName}>{selectedEvent?.host_name || 'Campus Partner'}</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="calendar" size={20} color="#FF1B6B" />
                </View>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoVal}>
                    {selectedEvent?.date ? new Date(selectedEvent.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : ''}
                  </Text>
                  <Text style={styles.infoLabel}>
                    {selectedEvent?.date ? new Date(selectedEvent.date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="location" size={20} color="#06D6A0" />
                </View>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoVal}>{selectedEvent?.location}</Text>
                  <Text style={styles.infoLabel}>Venue Location</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Ionicons name="ticket" size={20} color="#FFD700" />
                </View>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoVal}>Free Access</Text>
                  <Text style={styles.infoLabel}>Entry: Verified Students Only</Text>
                </View>
              </View>

              <View style={styles.separator} />

              <Text style={styles.sectionTitle}>About this Event</Text>
              <Text style={styles.modalDescText}>{selectedEvent?.description}</Text>

              <View style={styles.separator} />

              <View style={styles.whoIsGoingContainer}>
                <Text style={styles.sectionTitle}>Who's Going</Text>
                <View style={styles.socialRow}>
                  <View style={styles.avatarStack}>
                    <View style={[styles.stackAvatar, { backgroundColor: '#FF1B6B' }]}><Text style={styles.stackAvatarText}>JD</Text></View>
                    <View style={[styles.stackAvatar, { backgroundColor: '#9D4EDD', marginLeft: -10 }]}><Text style={styles.stackAvatarText}>AM</Text></View>
                    <View style={[styles.stackAvatar, { backgroundColor: '#06D6A0', marginLeft: -10 }]}><Text style={styles.stackAvatarText}>SK</Text></View>
                    <View style={[styles.stackAvatar, { backgroundColor: '#118AB2', marginLeft: -10 }]}><Text style={styles.stackAvatarText}>RV</Text></View>
                  </View>
                  <Text style={styles.socialText}>
                    {selectedEvent?.attendee_count > 0 
                      ? `Joined by ${selectedEvent.attendee_count} campus mate${selectedEvent.attendee_count === 1 ? '' : 's'}`
                      : 'Be the first to join this event!'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionContainer}>
              <TouchableOpacity
                style={[styles.modalRsvpBtn, selectedEvent?.is_attending && styles.modalRsvpBtnActive]}
                onPress={() => handleRSVP(selectedEvent?.event_id)}
                activeOpacity={0.8}
              >
                <Ionicons name={selectedEvent?.is_attending ? 'checkmark-circle' : 'add-circle'} size={20} color="#FFF" />
                <Text style={styles.modalRsvpText}>
                  {selectedEvent?.is_attending ? "You're Going" : 'RSVP / Mark as Going'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  bg: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  greet: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  premBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#120F1D', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#FFD700' },
  premBtnText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
  catRow: { marginVertical: 8, flexGrow: 0 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#120F1D', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  catText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, fontWeight: '600' },
  card: { margin: 16, marginVertical: 8, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)' },
  dateBadge: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dateDay: { color: '#FF1B6B', fontSize: 18, fontWeight: '900' },
  dateMon: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  titleInfo: { flex: 1, marginLeft: 12 },
  eventTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  hostText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, marginTop: 2 },
  daysAwayBadge: { backgroundColor: 'rgba(255, 27, 107, 0.12)', borderWidth: 1, borderColor: '#FF1B6B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  daysAwayText: { color: '#FF1B6B', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  
  cardBody: { padding: 16, gap: 8 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 },
  descText: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, lineHeight: 18, marginTop: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  attendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#06D6A022', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  attendText: { color: '#06D6A0', fontSize: 12, fontWeight: '700' },
  rsvpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF1B6B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  rsvpBtnActive: { backgroundColor: '#06D6A0' },
  rsvpText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyT: { color: 'rgba(255, 255, 255, 0.4)', marginTop: 12 },

  // Modal / Bottom Sheet Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' },
  modalCloseBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheet: { backgroundColor: '#000000', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', maxHeight: '85%', paddingBottom: 24 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  modalCatBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modalCatText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  closeBtn: { backgroundColor: 'rgba(255, 255, 255, 0.08)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingHorizontal: 20, paddingBottom: 100 },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 16, letterSpacing: -0.5 },
  modalHostRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hostAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  hostAvatarText: { color: '#FF1B6B', fontSize: 16, fontWeight: '800' },
  hostLabel: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: '600' },
  hostName: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 1 },
  separator: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginVertical: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 10 },
  infoIconWrapper: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  infoTextWrapper: { flex: 1 },
  infoVal: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  infoLabel: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionTitle: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  modalDescText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 14, lineHeight: 22 },
  whoIsGoingContainer: { marginTop: 8 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  stackAvatarText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  socialText: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, fontWeight: '600', flex: 1 },
  modalActionContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16, backgroundColor: '#000000', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  modalRsvpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF1B6B', paddingVertical: 14, borderRadius: 24 },
  modalRsvpBtnActive: { backgroundColor: '#06D6A0' },
  modalRsvpText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
