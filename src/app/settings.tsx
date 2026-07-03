import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkouts } from '@/lib/data-context';
import { colors, fonts, radii, spacing } from '@/theme';

const SUGARWOD_EXPORT_HELP_URL =
  'https://help.sugarwod.com/hc/en-us/articles/115003724008-How-can-I-export-my-workout-data-from-SugarWOD';

const EXPORT_STEPS = [
  'In the SugarWOD app, open the “More” tab and choose to export your workout data.',
  'SugarWOD emails a workouts.csv attachment to your account email.',
  'Open that email on this phone and save the attachment to the Files app.',
  'Tap “Import SugarWOD Export…” above and pick the file.',
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    source,
    stats,
    importedCount,
    importCsv,
    useBundled,
    useImported,
    enterPreview,
    resetImportedData,
  } = useWorkouts();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleImport = async () => {
    setMessage(null);
    const result = await importCsv();
    if (result.canceled) return;
    setMessage(
      result.ok
        ? { text: `Imported ${result.count} workouts.`, isError: false }
        : { text: result.error ?? 'Import failed.', isError: true },
    );
  };

  const handleReset = () => {
    const count = importedCount ?? 0;
    Alert.alert(
      'Clear your data?',
      `This removes the ${count} ${count === 1 ? 'workout' : 'workouts'} you imported from this device and takes you back to the welcome screen. Your SugarWOD account and export file aren’t touched, so you can bring your history back any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            resetImportedData();
            setMessage(null);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>
        {__DEV__ && <Text style={styles.devBadge}>DEV BUILD</Text>}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={styles.title}>SETTINGS</Text>

        <Text style={styles.sectionLabel}>DATA SOURCE</Text>
        <View style={styles.card}>
          {__DEV__ && (
            <SourceRow
              label="MY HISTORY (BUNDLED)"
              sub="Baked in at build time — dev-only test mode"
              active={source === 'bundled'}
              onPress={useBundled}
            />
          )}
          <SourceRow
            label="SUGARWOD EXPORT"
            sub={
              importedCount != null ? `${importedCount} workouts on device` : 'Nothing imported yet'
            }
            active={source === 'imported'}
            disabled={importedCount == null}
            onPress={useImported}
            divider={__DEV__}
          />
          {__DEV__ && (
            <SourceRow
              label="PREVIEW MODE"
              sub="Synthetic sample data + exit banner"
              active={source === 'preview'}
              onPress={enterPreview}
              divider
            />
          )}
        </View>

        <Pressable
          onPress={handleImport}
          style={({ pressed }) => [styles.importBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.importBtnText}>IMPORT SUGARWOD EXPORT…</Text>
        </Pressable>

        {message && (
          <Text style={[styles.message, message.isError && { color: colors.accent }]}>
            {message.text}
          </Text>
        )}

        <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>
          HOW TO EXPORT FROM SUGARWOD
        </Text>
        <View style={[styles.card, styles.stepsCard]}>
          {EXPORT_STEPS.map((step, i) => (
            <View key={i} style={[styles.stepRow, i > 0 && { marginTop: spacing.lg }]}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(SUGARWOD_EXPORT_HELP_URL)}
            hitSlop={8}
            style={styles.helpLink}>
            <Text style={styles.helpLinkText}>VIEW SUGARWOD HELP DOC ›</Text>
          </Pressable>
        </View>

        {importedCount != null && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>YOUR DATA</Text>
            <View style={[styles.card, styles.stepsCard]}>
              <Text style={styles.dataBody}>
                Your workouts live only on this device — nothing is ever uploaded, and nothing is
                deleted from SugarWOD. Want a clean slate? Clear what’s here and re-import
                whenever you’re ready.
              </Text>
              <Pressable
                onPress={handleReset}
                hitSlop={8}
                style={({ pressed }) => [styles.clearDataBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.clearDataBtnText}>CLEAR MY DATA</Text>
              </Pressable>
            </View>
          </>
        )}

        {__DEV__ && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>DEV TOOLS</Text>
            <Pressable
              onPress={() => router.push('/onboarding')}
              style={({ pressed }) => [styles.card, styles.devLink, pressed && { opacity: 0.7 }]}>
              <Text style={styles.devLinkText}>VIEW ONBOARDING FLOW ›</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.footnote}>
          Currently viewing {stats.total} workouts from the {source} dataset. Everything stays on
          this device.
        </Text>
      </ScrollView>
    </View>
  );
}

function SourceRow({
  label,
  sub,
  active,
  disabled,
  divider,
  onPress,
}: {
  label: string;
  sub: string;
  active: boolean;
  disabled?: boolean;
  divider?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || active || !onPress}
      style={[styles.sourceRow, divider && styles.rowDivider]}>
      <View style={styles.sourceInfo}>
        <Text style={[styles.sourceLabel, disabled && { color: colors.inkFaint }]}>{label}</Text>
        <Text style={styles.sourceSub}>{sub}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  devBadge: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.gold,
  },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1.2,
    color: colors.accent,
    paddingHorizontal: spacing.lg + spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  stepsCard: {
    paddingVertical: spacing.lg,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  sourceSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  importBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.2,
    color: colors.paper,
  },
  message: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
    paddingHorizontal: spacing.lg + spacing.xs,
    marginTop: spacing.md,
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
  devLink: {
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
  },
  devLinkText: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.accent,
  },
  dataBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  clearDataBtn: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    alignItems: 'center',
  },
  clearDataBtnText: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: colors.accent,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkFaint,
    paddingHorizontal: spacing.lg + spacing.xs,
    marginTop: spacing.xl,
  },
});
