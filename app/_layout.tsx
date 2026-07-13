import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { useTrackerStore } from '@/store/trackerStore';
import { supabase } from '@/utils/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const fetchRules = useTrackerStore((state) => state.fetchRules);
  const checkAndRunSettlement = useTrackerStore((state) => state.checkAndRunSettlement);
  const fetchState = useTrackerStore((state) => state.fetchState);
  const setupRealtimeSync = useTrackerStore((state) => state.setupRealtimeSync);
  const userId = useTrackerStore((state) => state.userId);
  
  const router = useRouter();
  const segments = useSegments();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const enabled = await AsyncStorage.getItem('biometricsEnabled');
        if (enabled === 'true') {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Accountability Tracker',
            fallbackLabel: 'Use Passcode',
          });
          setIsUnlocked(result.success);
        } else {
          setIsUnlocked(true);
        }
      } catch (e) {
        console.error(e);
        setIsUnlocked(true);
      }
    };
    checkBiometrics();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        useTrackerStore.setState({ userId: session.user.id });
        fetchState(session.user.id);
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        useTrackerStore.setState({ userId: session.user.id });
        fetchState(session.user.id);
      } else {
        useTrackerStore.setState({ userId: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;

    // @ts-ignore
    const inAuthGroup = segments[0] === 'login';

    if (!userId && !inAuthGroup) {
      // Redirect to login if not authenticated
      // @ts-ignore
      router.replace('/login');
    } else if (userId && inAuthGroup) {
      // Redirect away from login if authenticated
      // @ts-ignore
      router.replace('/(tabs)');
    }
  }, [userId, sessionChecked, segments]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    setupRealtimeSync(userId);
  }, [userId, setupRealtimeSync]);

  if (isUnlocked === null) {
    return null;
  }

  if (isUnlocked === false) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 20, marginBottom: 20 }}>App is Locked</Text>
        <TouchableOpacity 
          style={{ padding: 16, backgroundColor: '#FF453A', borderRadius: 12 }} 
          onPress={async () => {
             const result = await LocalAuthentication.authenticateAsync({
               promptMessage: 'Unlock Accountability Tracker',
               fallbackLabel: 'Use Passcode',
             });
             if (result.success) setIsUnlocked(true);
          }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Unlock with Biometrics</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
