import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const ADMIN_TOKEN_KEY = 'admin_token';

const getAdminToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem(ADMIN_TOKEN_KEY);
  return SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
};

const saveAdminToken = async (token: string) => {
  if (Platform.OS === 'web') localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, token);
};

const clearAdminToken = async () => {
  if (Platform.OS === 'web') localStorage.removeItem(ADMIN_TOKEN_KEY);
  else await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
};

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('admin@offcampus.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [tab, setTab] = useState<'stats' | 'users' | 'verifications' | 'confessions'>('stats');
  const [confessions, setConfessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    getAdminToken().then(t => {
      if (t) {
        setToken(t);
        loadData(t);
      }
    });
  }, []);

  const adminFetch = async (path: string, t: string, options: RequestInit = {}) => {
    const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${t}`,
      },
    });
    if (res.status === 401) {
      await clearAdminToken();
      setToken(null);
      throw new Error('Session expired');
    }
    return res.json();
  };

  const loadData = async (t: string) => {
    try {
      const [statsData, usersData, verifsData, confData] = await Promise.all([
        adminFetch('/admin/stats', t),
        adminFetch('/admin/users?limit=200', t),
        adminFetch('/admin/verification-requests', t),
        adminFetch('/confessions/feed?limit=100', t).catch(() => ({ confessions: [] })),
      ]);
      setStats(statsData);
      setUsers(usersData.users || []);
      setVerifications(verifsData.requests || []);
      setConfessions(confData.confessions || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) {
        setLoginError('Invalid credentials');
        return;
      }
      const data = await res.json();
      await saveAdminToken(data.access_token);
      setToken(data.access_token);
      loadData(data.access_token);
    } catch (e) {
      setLoginError('Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await clearAdminToken();
    setToken(null);
    setLoginPassword('');
  };

  const approveVerification = async (reqId: string) => {
    if (!token) return;
    await adminFetch(`/admin/verification/${reqId}/approve`, token, { method: 'POST' });
    loadData(token);
    setViewingId(null);
  };

  const rejectVerification = async (reqId: string) => {
    if (!token) return;
    await adminFetch(`/admin/verification/${reqId}/reject`, token, { method: 'POST' });
    loadData(token);
    setViewingId(null);
  };

  const deleteUser = (userId: string, name: string) => {
    Alert.alert('Delete User', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!token) return;
        await adminFetch(`/admin/users/${userId}`, token, { method: 'DELETE' });
        loadData(token);
      }},
    ]);
  };

  const grantPremium = async (userId: string) => {
    if (!token) return;
    await adminFetch(`/admin/users/${userId}/grant-premium?days=30`, token, { method: 'POST' });
    Alert.alert('Granted', '30 days premium granted');
    loadData(token);
  };

  const deleteConfession = (confId: string) => {
    Alert.alert('Delete', 'Delete this confession?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!token) return;
        await adminFetch(`/admin/confessions/${confId}`, token, { method: 'DELETE' });
        loadData(token);
      }},
    ]);
  };

  // LOGIN SCREEN
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0A0A0A', '#1A1A1A']} style={styles.gradient}>
          <View style={styles.loginContainer}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <LinearGradient colors={['#FF3366', '#FF6B35']} style={styles.adminLogo}>
              <Ionicons name="shield-checkmark" size={48} color="#FFF" />
            </LinearGradient>
            <Text style={styles.adminTitle}>Admin Portal</Text>
            <Text style={styles.adminSubtitle}>Off Campus Control Center</Text>
            
            <TextInput
              style={styles.loginInput}
              placeholder="Admin Email"
              placeholderTextColor="#666"
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.loginInput}
              placeholder="Password"
              placeholderTextColor="#666"
              value={loginPassword}
              onChangeText={setLoginPassword}
              secureTextEntry
            />
            {loginError && <Text style={styles.loginError}>{loginError}</Text>}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loggingIn}>
              {loggingIn ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Login</Text>}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // DASHBOARD
  const filteredUsers = users.filter(u => {
    const matchesSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || u.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const viewingVerif = verifications.find(v => v.request_id === viewingId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.adminHeader}>
        <View>
          <Text style={styles.adminHeaderTitle}>Admin Panel</Text>
          <Text style={styles.adminHeaderSub}>Off Campus</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={28} color="#FF3366" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'stats', icon: 'stats-chart', label: 'Stats' },
          { key: 'users', icon: 'people', label: 'Users' },
          { key: 'verifications', icon: 'shield-checkmark', label: `Verify (${verifications.length})` },
          { key: 'confessions', icon: 'megaphone', label: 'Confess' },
        ].map((t: any) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={18} color={tab === t.key ? '#FFF' : '#999'} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollContainer}>
        {tab === 'stats' && stats && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Total Users', value: stats.total_users, icon: 'people', color: '#FF3366' },
              { label: 'Verified', value: stats.verified_users, icon: 'checkmark-circle', color: '#4CAF50' },
              { label: 'Pending', value: stats.pending_verifications, icon: 'time', color: '#FFA500' },
              { label: 'Premium', value: stats.premium_users, icon: 'star', color: '#FFD700' },
              { label: 'On Campus', value: stats.users_on_campus, icon: 'location', color: '#4FC3F7' },
              { label: 'Confessions', value: stats.total_confessions, icon: 'megaphone', color: '#E91E63' },
              { label: 'Matches', value: stats.total_matches, icon: 'heart', color: '#FF3366' },
              { label: 'Colleges', value: stats.total_colleges, icon: 'school', color: '#9C27B0' },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Ionicons name={s.icon as any} size={28} color={s.color} />
                <Text style={styles.statCardValue}>{s.value}</Text>
                <Text style={styles.statCardLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'users' && (
          <View style={styles.section}>
            <TextInput
              style={styles.searchBox}
              placeholder="Search users..."
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
            />
            <View style={styles.filterRow}>
              {['', 'verified', 'pending', 'rejected'].map(s => (
                <TouchableOpacity
                  key={s || 'all'}
                  style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.filterChipText, statusFilter === s && { color: '#FFF' }]}>
                    {s || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {filteredUsers.map(u => (
              <View key={u.user_id} style={styles.userCard}>
                <Image source={{ uri: u.picture || u.photos?.[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+PC9zdmc+' }} style={styles.userAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.userBadges}>
                    <View style={[styles.statusBadge, { backgroundColor: u.verification_status === 'verified' ? '#4CAF50' : u.verification_status === 'rejected' ? '#F44336' : '#FFA500' }]}>
                      <Text style={styles.statusBadgeText}>{u.verification_status}</Text>
                    </View>
                    {u.is_premium && <View style={[styles.statusBadge, { backgroundColor: '#FFD700' }]}><Text style={styles.statusBadgeText}>Premium</Text></View>}
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity onPress={() => grantPremium(u.user_id)}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteUser(u.user_id, u.name)}>
                    <Ionicons name="trash" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'verifications' && (
          <View style={styles.section}>
            {verifications.length === 0 ? (
              <Text style={styles.emptyText}>No pending verifications 🎉</Text>
            ) : verifications.map(v => (
              <TouchableOpacity key={v.request_id} style={styles.verifCard} onPress={() => setViewingId(v.request_id)}>
                <Image source={{ uri: v.id_card_image }} style={styles.verifThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>User ID: {v.user_id.slice(0, 16)}...</Text>
                  <Text style={styles.userEmail}>Submitted: {new Date(v.submitted_at).toLocaleDateString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {tab === 'confessions' && (
          <View style={styles.section}>
            {confessions.map(c => (
              <View key={c.confession_id} style={styles.confCard}>
                <Text style={styles.confContent}>{c.content}</Text>
                <View style={styles.confMeta}>
                  <Text style={styles.confMetaText}>❤️ {c.likes || 0} • 💬 {c.comments || 0}</Text>
                  <TouchableOpacity onPress={() => deleteConfession(c.confession_id)}>
                    <Ionicons name="trash" size={18} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={!!viewingVerif} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setViewingId(null)} style={{ alignSelf: 'flex-end' }}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Review ID Card</Text>
            {viewingVerif && (
              <>
                <Image source={{ uri: viewingVerif.id_card_image }} style={styles.modalImage} />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F44336' }]} onPress={() => rejectVerification(viewingVerif.request_id)}>
                    <Text style={styles.modalBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#4CAF50' }]} onPress={() => approveVerification(viewingVerif.request_id)}>
                    <Text style={styles.modalBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  gradient: { flex: 1 },
  loginContainer: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  backBtn: { position: 'absolute', top: 20, left: 20 },
  adminLogo: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  adminTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  adminSubtitle: { color: '#999', textAlign: 'center', marginBottom: 24 },
  loginInput: { backgroundColor: '#1E1E1E', color: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#333' },
  loginError: { color: '#F44336', textAlign: 'center' },
  loginBtn: { backgroundColor: '#FF3366', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 12 },
  loginBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  adminHeaderTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  adminHeaderSub: { color: '#FF3366', fontSize: 12 },
  tabRow: { flexDirection: 'row', padding: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#FF3366' },
  tabText: { color: '#999', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  scrollContainer: { flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
  statCard: { width: '47%', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, alignItems: 'center', gap: 4 },
  statCardValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  statCardLabel: { color: '#999', fontSize: 12 },
  section: { padding: 12 },
  searchBox: { backgroundColor: '#1E1E1E', color: '#FFF', padding: 12, borderRadius: 10, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333' },
  filterChipActive: { backgroundColor: '#FF3366', borderColor: '#FF3366' },
  filterChipText: { color: '#999', fontSize: 12 },
  userCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, gap: 12, marginBottom: 8, alignItems: 'center' },
  userAvatar: { width: 50, height: 50, borderRadius: 25 },
  userName: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  userEmail: { color: '#999', fontSize: 12 },
  userBadges: { flexDirection: 'row', gap: 4, marginTop: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  userActions: { flexDirection: 'row', gap: 12 },
  verifCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, gap: 12, marginBottom: 8, alignItems: 'center' },
  verifThumb: { width: 60, height: 60, borderRadius: 8 },
  confCard: { backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, marginBottom: 8 },
  confContent: { color: '#FFF', fontSize: 14, marginBottom: 8 },
  confMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confMetaText: { color: '#999', fontSize: 12 },
  emptyText: { color: '#999', textAlign: 'center', padding: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalImage: { width: '100%', height: 300, borderRadius: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 25, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' },
});
