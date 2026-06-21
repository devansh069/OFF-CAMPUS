import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: screenWidth } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation, likesCount, unreadCount }: any) {
  const [expanded, setExpanded] = useState(false);
  const widthAnim = useRef(new Animated.Value(screenWidth * 0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    // Expand tab bar when active tab changes (meaning the user clicked/selected a tab)
    setExpanded(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: screenWidth - 32, // Full width with 16px margins
        duration: 250,
        useNativeDriver: false, // width cannot animate with native driver
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-collapse after 1.8 seconds back to compact width with icons only
    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(widthAnim, {
          toValue: screenWidth * 0.7, // Collapsed width (around 3/4 or less)
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setExpanded(false);
      });
    }, 1800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state.index]);

  return (
    <Animated.View 
      style={[styles.tabBarContainer, { width: widthAnim }]}
      onPointerEnter={() => {
        setExpanded(true);
        Animated.parallel([
          Animated.timing(widthAnim, {
            toValue: screenWidth - 32,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }}
      onPointerLeave={() => {
        Animated.parallel([
          Animated.timing(widthAnim, {
            toValue: screenWidth * 0.7,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setExpanded(false);
        });
      }}
    >
      <BlurView intensity={75} tint="dark" style={styles.blurWrapper}>
        <View style={styles.tabItemsContainer}>
          {state.routes.map((route: any, index: number) => {
            if (route.name === 'campus') return null;
            const { options } = descriptors[route.key];
            if (options.href === null) return null;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate({ name: route.name, merge: true });
              }
            };

            // Icon selection based on tab name
            let iconName: any = 'flame';
            let label = 'Vibe';
            let badgeCount = 0;

            if (route.name === 'discover') {
              iconName = 'flame';
              label = 'Vibe';
            } else if (route.name === 'likes') {
              iconName = 'heart';
              label = 'Likes';
              badgeCount = likesCount;
            } else if (route.name === 'events') {
              iconName = 'calendar';
              label = 'Events';
            } else if (route.name === 'confessions') {
              iconName = 'planet';
              label = 'Live';
            } else if (route.name === 'messages') {
              iconName = 'chatbubble-ellipses';
              label = 'Chats';
              badgeCount = unreadCount;
            } else if (route.name === 'profile') {
              iconName = 'person-circle';
              label = 'You';
            }

            const activeColor = '#F43F5E';
            const inactiveColor = '#6B7280';
            const tintColor = isFocused ? activeColor : inactiveColor;

             return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onPressIn={() => {
                  setExpanded(true);
                  Animated.parallel([
                    Animated.timing(widthAnim, {
                      toValue: screenWidth - 32,
                      duration: 250,
                      useNativeDriver: false,
                    }),
                    Animated.timing(opacityAnim, {
                      toValue: 1,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]).start();
                }}
                style={({ pressed }) => [
                  styles.tabItem,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons name={iconName} size={22} color={tintColor} />
                  {badgeCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <LinearGradient
                        colors={['#ee4d4d', '#780505']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.badgeGradient}
                      >
                        <Text style={styles.badgeText}>{badgeCount}</Text>
                      </LinearGradient>
                    </View>
                  )}
                </View>

                {/* Show label dynamically only for active tab while expanded */}
                {isFocused && expanded && (
                  <Animated.Text style={[styles.tabLabel, { color: activeColor, opacity: opacityAnim }]}>
                    {label}
                  </Animated.Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </Animated.View>
  );
}

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
        const likesRes = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/discovery/likes-received`, {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (likesRes.ok) {
          const likesData = await likesRes.json();
          setLikesCount(likesData.likes ? likesData.likes.length : 0);
        }

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
    const interval = setInterval(fetchCounts, 8000);
    return () => clearInterval(interval);
  }, [sessionToken]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} likesCount={likesCount} unreadCount={unreadCount} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Vibe' }} />
      <Tabs.Screen name="likes" options={{ title: 'Likes' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="confessions" options={{ title: 'Live' }} />
      <Tabs.Screen name="messages" options={{ title: 'Chats' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
      <Tabs.Screen name="campus" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    borderRadius: 30,
    height: 66,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  blurWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(7, 8, 15, 0.76)',
    justifyContent: 'center',
  },
  tabItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
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
