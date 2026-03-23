import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const segments = useSegments();

  // ─── Load fonts ────────────────────────────────────────────────
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // ─── Initialise ────────────────────────────────────────────────
  useEffect(() => {
    if (fontsLoaded) {
      setReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // ─── Listen for auth state changes ─────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Protect routes ────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === 'auth';

    if (session && inAuthGroup) {
      router.replace('/(tabs)/profile');
    }
  }, [session, segments, ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.porcelain },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="quiz" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
        <Stack.Screen name="reveal" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}