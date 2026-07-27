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
import { Stack, useRouter } from 'expo-router';
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
  const router = useRouter();
  const { exitPreview } = useWorkouts();
  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}>
      <Pressable
        onPress={() => router.navigate({ pathname: '/onboarding', params: { step: 'import' } })}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => [styles.bannerAction, pressed && { opacity: 0.8 }]}>
        <Text style={styles.bannerLabel}>
          SAMPLE DATA — <Text style={styles.bannerActionText}>IMPORT YOUR OWN ›</Text>
        </Text>
      </Pressable>
      <Pressable
        onPress={exitPreview}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Exit sample data"
        style={styles.bannerExit}
        testID="preview-exit">
        <Text style={styles.bannerExitText}>✕</Text>
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
  bannerAction: {
    flex: 1,
    paddingVertical: 2,
  },
  bannerLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.paper,
  },
  bannerActionText: {
    textDecorationLine: 'underline',
  },
  bannerExit: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  bannerExitText: {
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 16,
    color: colors.paper,
  },
});
