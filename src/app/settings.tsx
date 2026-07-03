import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkouts } from '@/lib/data-context';
import { colors, fonts, radii, spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { source, stats, importedCount, importCsv, useBundled, useImported } = useWorkouts();
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

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>
        <Text style={styles.devBadge}>DEV ONLY</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={styles.title}>SETTINGS</Text>

        <Text style={styles.sectionLabel}>DATA SOURCE</Text>
        <View style={styles.card}>
          <SourceRow
            label="MY HISTORY (BUNDLED)"
            sub="Baked in at build time — test mode"
            active={source === 'bundled'}
            onPress={useBundled}
          />
          <SourceRow
            label="IMPORTED CSV"
            sub={
              importedCount != null ? `${importedCount} workouts on device` : 'Nothing imported yet'
            }
            active={source === 'imported'}
            disabled={importedCount == null}
            onPress={useImported}
            divider
          />
        </View>

        <Pressable
          onPress={handleImport}
          style={({ pressed }) => [styles.importBtn, pressed && { opacity: 0.85 }]}>
          <Text style={styles.importBtnText}>IMPORT SUGARWOD CSV…</Text>
        </Pressable>

        {message && (
          <Text style={[styles.message, message.isError && { color: colors.accent }]}>
            {message.text}
          </Text>
        )}

        <Text style={styles.footnote}>
          Currently viewing {stats.total} workouts from the{' '}
          {source === 'bundled' ? 'bundled' : 'imported'} dataset. This screen is only reachable in
          development builds.
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
    marginTop: spacing.sm,
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
    marginTop: spacing.lg,
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
  footnote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkFaint,
    paddingHorizontal: spacing.lg + spacing.xs,
    marginTop: spacing.xl,
  },
});
