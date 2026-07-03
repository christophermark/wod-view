import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkouts } from '@/lib/data-context';
import { colors, fonts, radii, spacing } from '@/theme';

const SUGARWOD_EXPORT_HELP_URL =
  'https://help.sugarwod.com/hc/en-us/articles/115003724008-How-can-I-export-my-workout-data-from-SugarWOD-';

const EXPORT_STEPS = [
  'In the SugarWOD app, open the “More” tab and choose to export your workout data.',
  'SugarWOD emails a workouts.csv attachment to your account email.',
  'Open that email on this phone and save the attachment to the Files app.',
  'Come back here, tap “Import SugarWOD Export…”, and pick the file.',
];

const VALUE_PROPS: [title: string, sub: string][] = [
  ['THE LOG', 'Every workout you ever wrote down, restored line by line.'],
  ['THE CALENDAR', 'Your attendance in black and red — streaks, gaps, and all.'],
  ['THE STATS', 'PRs, lift bests, movement counts, your biggest month.'],
];

export default function OnboardingScreen() {
  const [step, setStep] = useState<'hero' | 'import'>('hero');
  return step === 'hero' ? (
    <HeroStep onContinue={() => setStep('import')} />
  ) : (
    <ImportStep onBack={() => setStep('hero')} />
  );
}

function HeroStep({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.heroContent,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}>
        <Text style={styles.eyebrow}>PERSONAL WOD ARCHIVE</Text>
        <Text style={styles.heroTitle}>
          EVERY REP.{'\n'}EVERY PR.{'\n'}
          <Text style={{ color: colors.accent }}>STILL YOURS.</Text>
        </Text>
        <Text style={styles.heroBody}>
          WOD View turns your SugarWOD export into a fast, private training archive that lives
          entirely on your phone. No account. No servers. Just your history.
        </Text>

        <View style={styles.props}>
          {VALUE_PROPS.map(([title, sub], i) => (
            <View key={title} style={[styles.propRow, i > 0 && { marginTop: spacing.lg }]}>
              <Text style={styles.propIndex}>{`0${i + 1}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.propTitle}>{title}</Text>
                <Text style={styles.propSub}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryBtnText}>GET STARTED ›</Text>
        </Pressable>
        <Text style={styles.footnote}>Your data never leaves this device.</Text>
      </ScrollView>
    </View>
  );
}

function ImportStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { importCsv, enterPreview } = useWorkouts();
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    const result = await importCsv();
    if (result.canceled) return;
    if (result.ok) {
      router.replace('/');
    } else {
      setError(result.error ?? 'Import failed.');
    }
  };

  const handlePreview = () => {
    enterPreview();
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.importContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>

        <Text style={styles.importTitle}>LOAD YOUR LOG</Text>
        <Text style={styles.heroBody}>
          Grab your workout history from SugarWOD and bring it home. Takes about two minutes.
        </Text>

        <View style={styles.card}>
          {EXPORT_STEPS.map((stepText, i) => (
            <View key={i} style={[styles.stepRow, i > 0 && { marginTop: spacing.lg }]}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{stepText}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(SUGARWOD_EXPORT_HELP_URL)}
            hitSlop={8}
            style={styles.helpLink}>
            <Text style={styles.helpLinkText}>VIEW SUGARWOD HELP DOC ›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleImport}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryBtnText}>IMPORT SUGARWOD EXPORT…</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={handlePreview} hitSlop={8} style={styles.previewLink}>
          <Text style={styles.previewLinkTitle}>NO EXPORT HANDY? TRY PREVIEW MODE ›</Text>
          <Text style={styles.previewLinkSub}>
            Explore the app with three years of sample data. Your real import is one tap away
            whenever you’re ready.
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  heroContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  importContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.accent,
  },
  heroTitle: {
    fontFamily: fonts.displayBlack,
    fontSize: 56,
    lineHeight: 56,
    color: colors.ink,
    marginTop: spacing.md,
  },
  heroBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginTop: spacing.lg,
  },
  props: {
    marginTop: spacing.xxl,
  },
  propRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  propIndex: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.accent,
    marginTop: 3,
  },
  propTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 0.8,
    color: colors.ink,
  },
  propSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    marginTop: spacing.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.display,
    fontSize: 17,
    letterSpacing: 1.2,
    color: colors.paper,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  backArrow: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 26,
    color: colors.accent,
    marginTop: -3,
  },
  backLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.accent,
  },
  importTitle: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.accent,
    width: 14,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  helpLink: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  helpLinkText: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.accent,
  },
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.accent,
    marginTop: spacing.md,
  },
  previewLink: {
    marginTop: spacing.xxl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.accentSoft,
    padding: spacing.lg,
  },
  previewLinkTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.8,
    color: colors.accent,
  },
  previewLinkSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
});
