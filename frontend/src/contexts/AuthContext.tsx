import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  user_id: string;
  email: string;
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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  sessionToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  // Handle deep links (for mobile)
  useEffect(() => {
    if (Platform.OS !== 'web') {
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
        // Mobile: check SecureStore
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
    const url = event.url;
    const sessionIdMatch = url.match(/[#?&]session_id=([^&]+)/);
    
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      await processSessionId(sessionId);
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
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Invalid token, clear it
        await clearSession();
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      setUser(data.user);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user:', error);
      await clearSession();
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      let redirectUrl: string;

      if (Platform.OS === 'web') {
        redirectUrl = window.location.origin + '/';
      } else {
        redirectUrl = Linking.createURL('auth');
      }

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const sessionIdMatch = result.url.match(/[#?&]session_id=([^&]+)/);
          if (sessionIdMatch) {
            await processSessionId(sessionIdMatch[1]);
          }
        }
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await clearSession();
    }
  };

  const clearSession = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('session_token');
    } else {
      await SecureStore.deleteItemAsync('session_token');
    }
    setSessionToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (sessionToken) {
      await fetchUserProfile(sessionToken);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, sessionToken }}>
      {children}
    </AuthContext.Provider>
  );
};
