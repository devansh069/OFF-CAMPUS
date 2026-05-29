import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0817',
          borderTopColor: '#2A1B3D',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FF1B6B',
        tabBarInactiveTintColor: '#6B5B7A',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Vibe', tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} /> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="confessions" options={{ title: 'Live', tabBarIcon: ({ color, size }) => <Ionicons name="planet" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Chats', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="campus" options={{ href: null }} />
    </Tabs>
  );
}
