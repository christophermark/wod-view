import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_800ExtraBold,
  BarlowCondensed_900Black,
} from '@expo-google-fonts/barlow-condensed';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkoutsProvider, useWorkouts } from '@/lib/data-context';
import { colors, fonts, spacing } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_800ExtraBold,
    BarlowCondensed_900Black,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <WorkoutsProvider>
      <AppShell />
    </WorkoutsProvider>
  );
}

function AppShell() {
  const { source, needsOnboarding } = useWorkouts();
  const preview = source === 'preview';

  return (
    <View style={styles.shell}>
      <StatusBar style={preview ? 'light' : 'dark'} />
      {preview && <PreviewBanner />}
      {/* Nested provider so screens under the banner see a zero top inset
          (the banner already covers the status bar area). */}
      <SafeAreaProvider style={styles.shell}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}>
          <Stack.Protected guard={!needsOnboarding}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout/[id]" />
            <Stack.Screen name="benchmarks" />
            <Stack.Screen name="benchmark/[name]" />
            <Stack.Screen name="lift/[name]" />
            <Stack.Screen name="settings" />
          </Stack.Protected>
          <Stack.Screen name="onboarding" />
        </Stack>
      </SafeAreaProvider>
    </View>
  );
}

function PreviewBanner() {
  const insets = useSafeAreaInsets();
  const { exitPreview } = useWorkouts();
  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Text style={styles.bannerLabel}>PREVIEW MODE · SAMPLE DATA</Text>
      <Pressable onPress={exitPreview} hitSlop={12} style={styles.bannerExit}>
        <Text style={styles.bannerExitText}>EXIT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bannerLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.paper,
  },
  bannerExit: {
    borderWidth: 1.5,
    borderColor: colors.paper,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bannerExitText: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1.2,
    color: colors.paper,
  },
});
