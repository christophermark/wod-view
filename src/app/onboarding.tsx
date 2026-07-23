import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExportStepsCard } from '@/components/ExportStepsCard';
import { useWorkouts } from '@/lib/data-context';
import { SUGARWOD_EXPORT_FILENAME } from '@/lib/sugarwod-export';
import { colors, fonts, radii, spacing } from '@/theme';

const VALUE_PROPS: [title: string, sub: string][] = [
  ['THE LOG', 'Every workout you ever wrote down, restored line by line.'],
  ['THE CALENDAR', 'Your attendance in black and red — streaks, gaps, and all.'],
  ['THE STATS', 'PRs, lift bests, movement counts, your biggest month.'],
];

export default function OnboardingScreen() {
  const [step, setStep] = useState<'hero' | 'import'>('hero');
  return step === 'hero' ? (
    <HeroStep onImport={() => setStep('import')} />
  ) : (
    <ImportStep onBack={() => setStep('hero')} />
  );
}

function HeroStep({ onImport }: { onImport: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { enterPreview } = useWorkouts();

  const handlePreview = () => {
    enterPreview();
    router.replace('/');
  };
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.heroContent,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}>
        <Image
          source={require('../../assets/images/logo-mark.png')}
          style={styles.logoMark}
          accessibilityLabel="WOD View"
        />
        <Text style={styles.eyebrow}>PERSONAL WOD ARCHIVE</Text>
        <Text style={styles.heroTitle}>
          EVERY REP.{'\n'}EVERY PR.{'\n'}
          <Text style={{ color: colors.accent }}>ANALYZED.</Text>
        </Text>
        <Text style={styles.heroBody}>
          WOD View turns your SugarWOD or Chalk It Pro export into a fast, private training archive
          that lives entirely on your phone. No account. No servers. Just your history.
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
          onPress={handlePreview}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryBtnText}>EXPLORE WITH SAMPLE DATA ›</Text>
        </Pressable>
        <Text style={styles.btnHint}>Three years of sample workouts — no export needed.</Text>
        <Pressable
          onPress={onImport}
          style={({ pressed }) => [styles.heroSecondaryBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.heroSecondaryBtnText}>IMPORT YOUR OWN DATA ›</Text>
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
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn} testID="onboarding-back">
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>

        <Text style={styles.importTitle}>LOAD YOUR LOG</Text>
        <Text style={styles.heroBody}>
          Grab your workout history from SugarWOD or Chalk It Pro and bring it home. Takes about two
          minutes.
        </Text>

        <ExportStepsCard style={{ marginTop: spacing.xl }} />

        <Pressable
          onPress={handleImport}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryBtnText}>
            IMPORT <Text style={styles.primaryBtnFile}>{SUGARWOD_EXPORT_FILENAME}</Text>…
          </Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.previewCard}>
          <Text style={styles.previewCardSub}>
            No export handy? Explore the app with three years of sample data. Your real import is
            one tap away whenever you’re ready.
          </Text>
          <Pressable
            onPress={handlePreview}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.secondaryBtnText}>TRY PREVIEW MODE ›</Text>
          </Pressable>
        </View>
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
  logoMark: {
    marginBottom: spacing.xl,
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
  primaryBtnFile: {
    fontFamily: fonts.monoBold,
    fontSize: 15,
    letterSpacing: 0,
    color: colors.paper,
  },
  btnHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  heroSecondaryBtn: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
    marginTop: spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  heroSecondaryBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.2,
    color: colors.ink,
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
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.accent,
    marginTop: spacing.md,
  },
  previewCard: {
    marginTop: spacing.xxl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.accentSoft,
    padding: spacing.lg,
  },
  previewCardSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  secondaryBtn: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginTop: spacing.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.2,
    color: colors.accent,
  },
});
