import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasClicked, setHasClicked] = useState(false);

  // Animated entry values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    // Elegant fade-in and slide-up transition for the start button
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle click & check loading state
  const handlePress = () => {
    setHasClicked(true);
  };

  useEffect(() => {
    if (hasClicked && !loading) {
      if (!user) {
        router.replace('/welcome');
      } else if (!user.college_id || !user.age) {
        router.replace('/onboarding/profile-setup');
      } else {
        router.replace('/(tabs)/discover');
      }
    }
  }, [hasClicked, loading, user]);

  return (
    <View style={styles.container}>
      {/* Fullscreen cover splash background image */}
      <Image
        source={require('../assets/images/splash_screen.png')}
        style={styles.splashImage}
        resizeMode="stretch"
      />

      {/* Glassmorphic Start Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.touchable}
          disabled={hasClicked && loading}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 60 : 85} tint="dark" style={styles.glassButton}>
            {/* Glass shine reflection overlay */}
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.22)',
                'rgba(255, 255, 255, 0.05)',
                'rgba(255, 255, 255, 0.0)',
                'rgba(255, 255, 255, 0.03)',
                'rgba(255, 255, 255, 0.12)'
              ]}
              locations={[0.0, 0.25, 0.5, 0.75, 1.0]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            
            {hasClicked && loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Let's start vibing ✨</Text>
            )}
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Solid black background
  },
  splashImage: {
    ...StyleSheet.absoluteFillObject,
    // top: 10, 
    height: '100%',
    width: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 85, // Shifted down by 15px (from 85 to 70)
    width: '84%',
    alignSelf: 'center',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#C2FF3D', // Elegant neon glow shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  touchable: {
    width: '100%',
  },
  glassButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 11, 20, 0.45)', // Frosted dark glass overlay
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
