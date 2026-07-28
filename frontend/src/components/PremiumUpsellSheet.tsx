import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

interface PremiumUpsellSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  featureName?: string;
}

export default function PremiumUpsellSheet({
  visible,
  onClose,
  title = "Unlock Premium Access 👑",
  subtitle = "Upgrade to Off Campus Student Pass to enjoy unlimited features!",
  featureName
}: PremiumUpsellSheetProps) {
  const router = useRouter();

  if (!visible) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/premium');
  };

  const perks = [
    { icon: 'infinite', text: 'Unlimited swiping & likes' },
    { icon: 'eye', text: 'See all who liked you' },
    { icon: 'flash', text: '2x Profile Visibility' },
    { icon: 'refresh', text: 'Revisit skipped profiles' },
    { icon: 'globe', text: 'Post stories to Global feed' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.sheetContainer}>
          <BlurView intensity={85} tint="dark" style={styles.glassContainer}>
            {/* Top Close Bar */}
            <View style={styles.dragBar} />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {/* Icon Header */}
            <View style={styles.headerIconCircle}>
              <LinearGradient colors={['#C2FF3D', '#76A30E']} style={styles.iconGradient}>
                <Ionicons name="diamond" size={28} color="#000" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>{title}</Text>
            {featureName && (
              <View style={styles.featurePill}>
                <Ionicons name="lock-closed" size={12} color="#C2FF3D" />
                <Text style={styles.featurePillText}>{featureName} is Premium</Text>
              </View>
            )}
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Perks List */}
            <View style={styles.perksList}>
              {perks.map((p, idx) => (
                <View key={idx} style={styles.perkItem}>
                  <View style={styles.perkIconWrap}>
                    <Ionicons name={p.icon as any} size={14} color="#C2FF3D" />
                  </View>
                  <Text style={styles.perkText}>{p.text}</Text>
                </View>
              ))}
            </View>

            {/* CTA Buttons */}
            <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.9}>
              <LinearGradient colors={['#C2FF3D', '#9BDC20']} style={styles.upgradeBtnGrad}>
                <Ionicons name="diamond" size={18} color="#000" />
                <Text style={styles.upgradeBtnText}>Upgrade to Premium — ₹99/mo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.maybeLaterBtn} onPress={onClose}>
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  glassContainer: {
    padding: 24,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 25, 0.85)',
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  headerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(194, 255, 61, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(194, 255, 61, 0.3)',
  },
  featurePillText: {
    color: '#C2FF3D',
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  perksList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  perkIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(194, 255, 61, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  upgradeBtn: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
  },
  upgradeBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  upgradeBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  maybeLaterBtn: {
    paddingVertical: 8,
  },
  maybeLaterText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
});
