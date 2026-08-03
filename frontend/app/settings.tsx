import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SettingsScreen() {
  const { user, sessionToken, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Log Out 🚪',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  const deleteReasons = [
    "I found someone on Off Campus ",
    "Not enough active users ",
    "Too many notifications / spam ",
    "App is buggy or runs slow ",
    "Privacy concerns ",
    "Other reasons",
  ];

  const handleDeleteReasonSelected = (reason: string) => {
    setShowDeleteModal(false);
    
    // Final verification confirmation
    Alert.alert(
      'Permanently Delete Account? ⚠️',
      `You selected: "${reason}".\n\nThis will permanently delete all your profile information, matches, photos, and messages forever. This action is irreversible.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: performDeleteAccount,
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      Alert.alert('Account Deleted 🗑️', 'Your profile and data have been permanently deleted.');
      await logout();
      router.replace('/welcome');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Failed to delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Profile preferences state
  const [gender, setGender] = useState(user?.gender || 'male');
  const [genderPreference, setGenderPreference] = useState(user?.gender_preference || 'both');

  // App settings state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Permission access states (mock toggle switches)
  const [galleryAllowed, setGalleryAllowed] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [cameraAllowed, setCameraAllowed] = useState(true);
  const [spotifyAllowed, setSpotifyAllowed] = useState(!!user?.spotify_data);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/profile/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          gender,
          gender_preference: genderPreference,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      await refreshUser();
      Alert.alert('Success ✨', 'Settings saved successfully!');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadData = () => {
    Alert.alert(
      'Export Requested 📥',
      'Your request to download personal account data has been registered. A secure JSON copy will be sent to your email when ready.',
      [{ text: 'Great!' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#050005', '#160222']} style={styles.gradient}>
        
        {/* Custom Header: Left text, Center title */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#C2FF3D" />
          </TouchableOpacity>
          {/* <Text style={styles.headerLeftText}>off campus</Text> */}
          <Text style={styles.headerCenterText}>Settings</Text>
          <TouchableOpacity onPress={saveSettings} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator size="small" color="#C2FF3D" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* PROFILE & MATCH PREFERENCES */}
          <Text style={styles.sectionTitle}>Account Preferences</Text>
          <View style={styles.settingsGroup}>
            
            {/* Gender Selector */}
            <View style={styles.settingItemRow}>
              <View>
                <Text style={styles.settingItemLabel}>My Gender</Text>
                <Text style={styles.settingItemSub}>How you identify on your profile</Text>
              </View>
              <View style={styles.pillsContainer}>
                {['male', 'female', 'other'].map((g) => {
                  const active = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => setGender(g as any)}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {g.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Gender Preference Selector */}
            <View style={styles.settingItemRow}>
              <View>
                <Text style={styles.settingItemLabel}>Looking For (Gender)</Text>
                <Text style={styles.settingItemSub}>Preferred gender for matching</Text>
              </View>
              <View style={styles.pillsContainer}>
                {[{ v: 'male', l: 'MEN' }, { v: 'female', l: 'WOMEN' }, { v: 'both', l: 'BOTH' }].map((p) => {
                  const active = genderPreference === p.v;
                  return (
                    <TouchableOpacity
                      key={p.v}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => setGenderPreference(p.v as any)}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {p.l}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* APP THEME */}
          <Text style={styles.sectionTitle}>App Customization</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItemRow}>
              <View>
                <Text style={styles.settingItemLabel}>App Theme</Text>
                <Text style={styles.settingItemSub}>Dark mode is highly recommended</Text>
              </View>
              <View style={styles.pillsContainer}>
                {[{ v: 'dark', l: 'DARK' }, { v: 'light', l: 'LIGHT' }].map((t) => {
                  const active = theme === t.v;
                  return (
                    <TouchableOpacity
                      key={t.v}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => {
                        setTheme(t.v as any);
                        if (t.v === 'light') {
                          Alert.alert('Premium Feel 🌟', 'Off Campus is custom tailored for OLED dark styles. Light mode is currently in beta.');
                        }
                      }}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {t.l}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* PERMISSIONS & ACCESS OPTIONS */}
          <Text style={styles.sectionTitle}>Permissions & Access</Text>
          <View style={styles.settingsGroup}>
            {[
              { label: 'Photo Gallery', sub: 'Allow choosing photos from gallery', state: galleryAllowed, set: setGalleryAllowed },
              { label: 'Location Tracking', sub: 'Filter college matches near you', state: locationAllowed, set: setLocationAllowed },
              { label: 'Camera Services', sub: 'Take profile snapshots in app', state: cameraAllowed, set: setCameraAllowed },
              { label: 'Spotify Profile Sync', sub: 'Display top tracks automatically', state: spotifyAllowed, set: setSpotifyAllowed },
            ].map((p, idx) => (
              <View key={p.label}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.settingItemRow}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={styles.settingItemLabel}>{p.label}</Text>
                    <Text style={styles.settingItemSub}>{p.sub}</Text>
                  </View>
                  <Switch
                    value={p.state}
                    onValueChange={p.set}
                    trackColor={{ false: '#2A1F3D', true: '#C2FF3D' }}
                    thumbColor={Platform.OS === 'ios' ? undefined : p.state ? '#000' : '#8E8E93'}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* DOWNLOAD DATA */}
          <Text style={styles.sectionTitle}>Account Control</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingItemRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.settingItemLabel}>Download My Data</Text>
                <Text style={styles.settingItemSub}>Export a backup JSON file of all swipes, chats, matches, and logs.</Text>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={handleDownloadData}>
                <Ionicons name="cloud-download-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Export</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* PRIVACY & TERMS */}
          <Text style={styles.sectionTitle}>Legal Agreements</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.settingLink} onPress={() => router.push('/privacy-policy')}>
              <Text style={styles.settingLinkLabel}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingLink} onPress={() => router.push('/terms-of-service')}>
              <Text style={styles.settingLinkLabel}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          {/* LOGOUT & DELETE ACCOUNT */}
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.settingsGroup}>
            {/* Logout Button */}
            <TouchableOpacity style={styles.settingLink} onPress={handleLogout}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="log-out-outline" size={20} color="#F87171" style={{ marginRight: 10 }} />
                <Text style={[styles.settingLinkLabel, { color: '#F87171' }]}>Log Out</Text>
              </View>
              {/* <Ionicons name="chevron-forward" size={18} color="rgba(248, 113, 113, 0.4)" /> */}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Delete Account Button */}
            <TouchableOpacity style={styles.settingLink} onPress={() => setShowDeleteModal(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.settingLinkLabel, { color: '#EF4444', fontWeight: '800' }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(239, 68, 68, 0.4)" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Account Deletion Reason Selector Modal */}
        <Modal visible={showDeleteModal} transparent={true} animationType="slide">
          <TouchableWithoutFeedback onPress={() => setShowDeleteModal(false)}>
            <View style={styles.modalOverlay}>
              <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />
              <TouchableWithoutFeedback>
                <View style={styles.modalContentGlass}>
                  <View style={styles.modalDragHandle} />

                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Reason for leaving?</Text>
                    <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.modalCloseBtn}>
                      <Ionicons name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalIntro}>
                    Please tell us why you want to delete your account. This feedback is display-only and won&apos;t be saved.
                  </Text>

                  <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
                    {deleteReasons.map((reason) => (
                      <TouchableOpacity
                        key={reason}
                        style={styles.reasonBtn}
                        onPress={() => handleDeleteReasonSelected(reason)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.reasonBtnText}>{reason}</Text>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.4)" />
                      </TouchableOpacity>
                    ))}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050005',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#2A1B3D',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerLeftText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerCenterText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    // marginRight: 32,
    paddingLeft: 30, // Adjusted to center the title with the back button
  },
  saveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#C2FF3D',
    fontWeight: '900',
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    color: '#C2FF3D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4,
  },
  settingsGroup: {
    backgroundColor: '#10061A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#221435',
    padding: 16,
    marginBottom: 8,
  },
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingItemLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  settingItemSub: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 3,
    maxWidth: 200,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#221435',
    marginVertical: 12,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  pillsContainerVertical: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
    maxWidth: 160,
  },
  pill: {
    backgroundColor: '#1A0F2A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A1B3D',
    minWidth: 54,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    borderColor: '#C2FF3D',
  },
  pillVertical: {
    backgroundColor: '#1A0F2A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A1B3D',
  },
  pillVerticalActive: {
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    borderColor: '#C2FF3D',
  },
  pillText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontWeight: '800',
  },
  pillTextActive: {
    color: '#FFF',
  },
  actionBtn: {
    flexDirection: 'row',
    backgroundColor: '#C2FF3D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
  },
  settingLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLinkLabel: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContentGlass: {
    backgroundColor: 'rgba(20, 20, 25, 0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  modalCloseBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20 },
  modalIntro: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reasonBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
