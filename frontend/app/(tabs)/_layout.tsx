import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function TabsLayout() {
  const { sessionToken } = useAuth();
  const [likesCount, setLikesCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!sessionToken) return;

    const fetchCounts = async () => {
      if (sessionToken === 'dummy_token') {
        setLikesCount(3); // Mock incoming likes
        setUnreadCount(1); // Mock unread chats
        return;
      }

      try {
        // Fetch incoming likes received
        const likesRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/likes-received`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (likesRes.ok) {
          const likesData = await likesRes.json();
          setLikesCount(likesData.likes ? likesData.likes.length : 0);
        }

        // Fetch conversations and sum unread counts
        const convsRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/messages/conversations`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          const totalUnread = (convsData.conversations || []).reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
          setUnreadCount(totalUnread);
        }
      } catch (e) {
        console.warn('Error fetching counts for tab badges:', e);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 8000); // Poll counts every 8 seconds
    return () => clearInterval(interval);
  }, [sessionToken]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(7, 8, 15, 0.76)',
          borderRadius: 30,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 16,
          elevation: 10,
        },
        tabBarActiveTintColor: '#F43F5E',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      {/* Vibe Tab */}
      <Tabs.Screen 
        name="discover" 
        options={{ 
          title: 'Vibe', 
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} /> 
        }} 
      />

      {/* Likes Tab */}
      <Tabs.Screen 
        name="likes" 
        options={{ 
          title: 'Likes', 
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons name="heart" size={size} color={color} />
              {likesCount > 0 && (
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={['#ee4d4d', '#780505']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Text style={styles.badgeText}>{likesCount}</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          ) 
        }} 
      />

      {/* Events Tab */}
      <Tabs.Screen 
        name="events" 
        options={{ 
          title: 'Events', 
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> 
        }} 
      />

      {/* Live Tab */}
      <Tabs.Screen 
        name="confessions" 
        options={{ 
          title: 'Live', 
          tabBarIcon: ({ color, size }) => <Ionicons name="planet" size={size} color={color} /> 
        }} 
      />

      {/* Chats Tab */}
      <Tabs.Screen 
        name="messages" 
        options={{ 
          title: 'Chats', 
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubble-ellipses" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={['#ee4d4d', '#780505']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          )
        }} 
      />

      {/* You Tab */}
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'You', 
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} /> 
        }} 
      />

      {/* Hidden Campus Link */}
      <Tabs.Screen name="campus" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeGradient: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});
