import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function ProfileRedirect() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      console.log('[ProfileRedirect] Redirecting deep link to discover tab with targetUserId:', id);
      router.replace({
        pathname: '/(tabs)/discover',
        params: { targetUserId: id }
      });
    }
  }, [id]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C2FF3D" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A050D',
  },
});
