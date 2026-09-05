import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  ActivityIndicator,
  Animated
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const [step, setStep] = useState(0); // 0 = Launch, 1 = Reveal
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Check authentication and manage step transitions
    const launchSequence = async () => {
      // 1. Show Launch slide (step 0) for 1.5 seconds, then transition to Reveal (step 1)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Fade out Launch slide
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        // Change to Reveal step
        setStep(1);
        fadeAnim.setValue(0);
        
        // Fade in Reveal slide
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // 2. Show Reveal slide (step 1) for 2 seconds, then redirect
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Final fade out before navigation
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(async () => {
          try {
            // DEV AUTO-LOGIN BYPASS
            if (__DEV__) {
              try {
                // Import api dynamically or use fetch to avoid top-level require cycles if any
                const { default: api } = await import('./api');
                const loginRes = await api.post('/auth/login', {
                  email: 'rohan@vochat.com',
                  password: 'password123'
                });
                if (loginRes.data?.data?.token) {
                  await AsyncStorage.setItem('token', loginRes.data.data.token);
                }
              } catch (loginErr) {
                console.log('Dev auto-login failed:', loginErr);
              }
            }

            // Check auth token to decide target screen
            const token = await AsyncStorage.getItem('token');
            if (token) {
              router.replace('/(tabs)');
            } else {
              router.replace('/register');
            }
          } catch (e) {
            router.replace('/register');
          }
        });
      });
    };

    launchSequence();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#06080E" />
      
      {/* Background Glows */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === 0 ? (
          // STEP 1: Launch
          <View style={styles.centerContainer}>
            <View style={styles.logoBubble}>
              <View style={styles.logoWave}>
                <View style={[styles.waveBar, { height: 16 }]} />
                <View style={[styles.waveBar, { height: 32 }]} />
                <View style={[styles.waveBar, { height: 48 }]} />
                <View style={[styles.waveBar, { height: 32 }]} />
                <View style={[styles.waveBar, { height: 16 }]} />
              </View>
            </View>
            <Text style={styles.logoTitle}>Vochat</Text>
            
            {/* Page Dots (Slide 1 active) */}
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>
        ) : (
          // STEP 2: Reveal
          <View style={styles.centerContainer}>
            <View style={styles.logoOuterPulse}>
              <View style={[styles.logoBubble, { borderColor: '#DB2777' }]}>
                <View style={styles.logoWave}>
                  <View style={[styles.waveBar, { height: 16 }]} />
                  <View style={[styles.waveBar, { height: 32 }]} />
                  <View style={[styles.waveBar, { height: 48 }]} />
                  <View style={[styles.waveBar, { height: 32 }]} />
                  <View style={[styles.waveBar, { height: 16 }]} />
                </View>
              </View>
            </View>
            <Text style={styles.logoTitle}>Vochat</Text>
            <Text style={styles.tagline}>Speak freely.{"\n"}Vanish completely.</Text>
            
            <ActivityIndicator size="small" color="#8B5CF6" style={styles.loader} />

            {/* Page Dots (Slide 2 active) */}
            <View style={styles.dotsContainer}>
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06080E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -150,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#7C3AED',
    opacity: 0.15,
  },
  glowBottomRight: {
    position: 'absolute',
    bottom: -150,
    right: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: '#DB2777',
    opacity: 0.12,
  },
  logoBubble: {
    width: 96,
    height: 96,
    borderRadius: 32,
    borderBottomLeftRadius: 6,
    borderWidth: 2.5,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06080E',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoWave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waveBar: {
    width: 4.5,
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  logoTitle: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoOuterPulse: {
    borderRadius: 40,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(219, 39, 119, 0.15)',
    shadowColor: '#DB2777',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  tagline: {
    color: '#8E92A5',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  loader: {
    marginTop: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#202330',
  },
  activeDot: {
    backgroundColor: '#8B5CF6',
    width: 24,
  }
});
