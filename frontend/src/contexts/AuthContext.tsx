import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
  console.warn('WARNING: EXPO_PUBLIC_BACKEND_URL env var is not set! Falling back to http://localhost:3000');
}

interface User {
  user_id: string;
  phone_number?: string;
  email?: string;
  name: string;
  age?: number;
  gender?: string;
  college_id?: string;
  year?: string;
  course?: string;
  bio?: string;
  interests: string[];
  looking_for?: string;
  photos: string[];
  vibe_score: number;
  spotify_data?: {
    top_tracks: string[];
    top_artists: string[];
  };
  is_premium: boolean;
  verification_status: string;
  picture?: string;
  is_on_campus: boolean;
  height?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  prompts?: Record<string, string>;
  religion?: string;
  drink?: string;
  smoke?: string;
  weed?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sessionToken: string | null;
  updateUser?: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const dummyUser: User = {
  user_id: 'user_dummy',
  email: 'dummy@test.edu.in',
  name: 'Dummy Student',
  age: 21,
  gender: 'male',
  college_id: 'col_stephens',
  year: '3rd Year',
  course: 'Economics',
  bio: 'Self-proclaimed foodie & developer 🍕☕',
  interests: ['Music', 'Travel', 'Coding'],
  looking_for: 'dating',
  photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2662&auto=format&fit=crop'],
  vibe_score: 4.8,
  is_premium: true,
  verification_status: 'verified',
  is_on_campus: true
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    console.log('AuthProvider mounted. Checking existing session...');
    setLoading(true);
    checkExistingSession();
  }, []);

  // Handle deep links (for mobile) - check both on mount and when URL changes
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Check initial URL (for cold starts)
      Linking.getInitialURL().then((url) => {
        if (url) {
          handleDeepLink({ url });
        }
      });

      // Listen for URL changes (for hot links)
      const subscription = Linking.addEventListener('url', handleDeepLink);
      return () => subscription.remove();
    }
  }, []);

  const checkExistingSession = async () => {
    try {
      let token: string | null = null;

      if (Platform.OS === 'web') {
        // Check for session_id in URL first (redirect from auth)
        const url = window.location.href;
        const sessionIdMatch = url.match(/[#?&]session_id=([^&]+)/);

        if (sessionIdMatch) {
          const sessionId = sessionIdMatch[1];
          await processSessionId(sessionId);

          // Clean URL
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }

        // Check localStorage for existing token
        token = localStorage.getItem('session_token');
      } else {
        // Mobile: check SecureStore first
        token = await SecureStore.getItemAsync('session_token');
      }

      if (token) {
        setSessionToken(token);
        await fetchUserProfile(token);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setLoading(false);
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    try {
      const url = event.url;
      console.log('Deep link received:', url);

      const sessionIdMatch = url.match(/[#?&]session_id=([^&]+)/);

      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        console.log('Processing session ID from deep link');
        await processSessionId(sessionId);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  const processSessionId = async (sessionId: string) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/google-session?session_id=${sessionId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to process session');
      }

      const data = await response.json();
      const token = data.session_token;

      // Store token
      if (Platform.OS === 'web') {
        localStorage.setItem('session_token', token);
      } else {
        await SecureStore.setItemAsync('session_token', token);
      }

      setSessionToken(token);
      setUser(data.user);
      setLoading(false);
    } catch (error) {
      console.error('Error processing session ID:', error);
      setLoading(false);
    }
  };

  const fetchUserProfile = async (token: string) => {
    if (token === 'dummy_token') {
      setUser(dummyUser);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('fetchUserProfile: Request timed out for URL:', `${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`);
      controller.abort();
    }, 5000);

    try {
      console.log('fetchUserProfile: Fetching profile from:', `${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('fetchUserProfile: Response received with status:', response.status);
      if (response.status === 401) {
        // Invalid token, clear it
        await clearSession();
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch user (status: ${response.status})`);
      }

      const data = await response.json();
      console.log('fetchUserProfile: Logged in user is:', data.user ? `${data.user.name} (${data.user.email})` : 'none');
      setUser(data.user);
      setLoading(false);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error fetching user:', error);
      await clearSession();
      setLoading(false);
    }
  };

  const login = async (phoneNumber: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseToken: `dev-token-${phoneNumber}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to authenticate');
      }

      const data = await response.json();
      const token = data.token;

      // Store token
      if (Platform.OS === 'web') {
        localStorage.setItem('session_token', token);
      } else {
        await SecureStore.setItemAsync('session_token', token);
      }

      setSessionToken(token);
      setUser(data.user);
      setLoading(false);
    } catch (error: any) {
      console.error('Error during login:', error);
      setLoading(false);
      Alert.alert('Login Failed', error.message || 'Please try again.');
    }
  };

  const logout = async () => {
    await clearSession();
  };

  const clearSession = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('session_token');
      } else {
        await SecureStore.deleteItemAsync('session_token');
      }
    } catch (err) {
      console.warn('Error clearing session store:', err);
    }
    setSessionToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (sessionToken) {
      await fetchUserProfile(sessionToken);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, sessionToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
