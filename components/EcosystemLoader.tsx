import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export default function EcosystemLoader() {
  const [loading, setLoading] = useState(true);
  const opacity = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Start pulsing animation
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Simulate ecosystem loading or tie to auth state
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 }, () => {
        // We cannot easily update React state from worklet without runOnJS, 
        // so we'll just let the timeout handle it.
      });
      setTimeout(() => setLoading(false), 400);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!loading) return null;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const pulseStyle = useAnimatedStyle(() => {
    return {
      opacity: pulse.value,
      transform: [{ scale: 0.98 + (pulse.value * 0.02) }],
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, animatedStyle]}>
      <Animated.View style={[styles.logoContainer, pulseStyle]}>
        <Image 
          source={require('@/assets/images/icon.png')} 
          style={styles.logo} 
          resizeMode="cover"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 999,
  },
  logoContainer: {
    width: 100,
    height: 100,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  }
});
