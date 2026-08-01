import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const SLIDES = [
  {
    title: 'Off-Campus Vibe',
    description: 'The exclusive network for verified college students. Discover new friends, share stories, and sync with your campus rhythm.',
  },
  {
    title: 'Discover Matches',
    description: 'Find like-minded peers, batchmates, and fellow students who share your academic vibe or chill interests.',
  },
  {
    title: 'Anonymously Speak Out',
    description: 'Post confessions, ask questions, or share secrets on the campus feed securely and anonymously.',
  },
  {
    title: 'Unmissable Events',
    description: 'From college fests and club nights to workshops and trips—never miss out on what’s happening around you.',
  },
  {
    title: 'Real-Time Connection',
    description: 'Connect instantly with in-app DMs, double-opt-in handshakes, and start organizing your student hangouts.',
  },
];

export default function Walkthrough() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Animation values for transitioning text slides
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Dot animations
  const dotScaleAnims = useRef(SLIDES.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Animate the active dot scale dynamically
    SLIDES.forEach((_, idx) => {
      Animated.spring(dotScaleAnims[idx], {
        toValue: idx === currentStep ? 1.4 : 1.0,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep, dotScaleAnims]);

  const handleNext = () => {
    if (currentStep < SLIDES.length - 1) {
      // Smooth out fade out transition
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -15,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change text state
        setCurrentStep((prev) => prev + 1);
        
        // Slide back in
        slideAnim.setValue(15);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      router.replace('/welcome');
    }
  };

  const handleSkip = () => {
    router.replace('/welcome');
  };

  const activeSlide = SLIDES[currentStep];

  return (
    <View style={styles.container}>
      {/* Loop video running in the background */}
      <Video
        source={require('../assets/videos/story_tutorial.mp4')}
        rate={1.0}
        volume={1.0}
        isMuted={true}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        style={StyleSheet.absoluteFillObject}
      />

      {/* Elegant dark overlay gradient to keep text readable over any video frame */}
      <LinearGradient
        colors={[
          'rgba(12, 8, 18, 0.4)',
          'rgba(12, 8, 18, 0.65)',
          'rgba(12, 8, 18, 0.85)',
          '#0c0812'
        ]}
        locations={[0.0, 0.35, 0.7, 1.0]}
        style={StyleSheet.absoluteFillObject}
      />



      {/* Bottom Content Area */}
      <View style={styles.bottomSection}>
        {/* Animated Description Card */}
        <Animated.View
          style={[
            styles.slideCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.slideTitle}>{activeSlide.title}</Text>
          <Text style={styles.slideDesc}>{activeSlide.description}</Text>
        </Animated.View>

        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                index === currentStep ? styles.dotActive : styles.dotInactive,
                { transform: [{ scale: dotScaleAnims[index] }] },
              ]}
            />
          ))}
        </View>

        {/* Navigation Action Buttons */}
        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={styles.skipBtn}
            activeOpacity={0.7}
            onPress={handleSkip}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextBtn}
            activeOpacity={0.85}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentStep === SLIDES.length - 1 ? 'Start Vibing' : 'Next'}
            </Text>
            <Ionicons
              name={currentStep === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={16}
              color="#000"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0812',
  },

  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 35,
    alignItems: 'center',
  },
  slideCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 35,
    minHeight: 120,
  },
  slideTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  slideDesc: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 15,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#C2FF3D',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navigationRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    backgroundColor: '#C2FF3D',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#C2FF3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
});
