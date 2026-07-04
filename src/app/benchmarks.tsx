import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BenchmarkDef } from '@/data/benchmarks';
import {
  benchmarkByName,
  benchmarkHistory,
  bestAttempt,
  daysBetween,
  todayIso,
} from '@/lib/benchmarks';
import { useWorkouts } from '@/lib/data-context';
import { Workout } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

interface Row {
  def: BenchmarkDef;
  attempts: Workout[];
  best: Workout | null;
  daysSince: number;
}

const SECTIONS: { category: BenchmarkDef['category']; title: string }[] = [
  { category: 'girl', title: 'THE GIRLS' },
  { category: 'hero', title: 'HEROES' },
  { category: 'open', title: 'THE OPEN' },
  { category: 'other', title: 'CLASSICS' },
];

function daysLabel(days: number): string {
  if (days === 0) return 'TODAY';
  return `${days} ${days === 1 ? 'DAY' : 'DAYS'} AGO`;
}

export default function BenchmarksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workouts } = useWorkouts();
  const [today] = useState(todayIso);

  const rows = useMemo(() => {
    const history = benchmarkHistory(workouts);
    return [...history.entries()].map(([name, attempts]): Row => {
      const def = benchmarkByName(name)!;
      return {
        def,
        attempts,
        best: bestAttempt(def, attempts),
        daysSince: daysBetween(attempts[attempts.length - 1].date, today),
      };
    });
  }, [workouts, today]);

  const sections = SECTIONS.map((s) => ({
    ...s,
    // The Open reads best newest-season-first; names sort that way reversed.
    rows: rows
      .filter((r) => r.def.category === s.category)
      .sort((a, b) =>
        s.category === 'open'
          ? b.def.name.localeCompare(a.def.name)
          : a.def.name.localeCompare(b.def.name),
      ),
  })).filter((s) => s.rows.length > 0);

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/stats'))}
          hitSlop={12}
          style={styles.backBtn}
          testID="benchmarks-back">
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>
        <Text style={styles.topMeta}>
          {rows.length} TRACKED · {rows.reduce((n, r) => n + r.attempts.length, 0)} ATTEMPTS
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={styles.title}>BENCHMARKS</Text>

        {sections.length === 0 && (
          <View style={[styles.card, { padding: spacing.lg }]}>
            <Text style={styles.emptyText}>
              No benchmarks detected yet. Girls, Heroes, and Open workouts show up here once they
              appear in your log — usually as a quoted name like “Fran” in the description.
            </Text>
          </View>
        )}

        {sections.map((section) => (
          <View key={section.category}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => (
                <Pressable
                  key={row.def.name}
                  onPress={() => router.push(`/benchmark/${encodeURIComponent(row.def.name)}`)}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.rowDivider,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{row.def.name.toUpperCase()}</Text>
                    <Text style={styles.rowSub}>
                      {row.attempts.length} {row.attempts.length === 1 ? 'ATTEMPT' : 'ATTEMPTS'} ·{' '}
                      {daysLabel(row.daysSince)}
                    </Text>
                  </View>
                  <Text style={styles.rowScore}>{row.best?.score || '—'}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footnote}>
          ≈ detected heuristically from workout titles and descriptions. Best scores mix Rx and
          scaled attempts — check the Rx chip on each attempt.
        </Text>
      </ScrollView>
    </View>
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
  topMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkFaint,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontFamily: fonts.display,
    fontSize: 17,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  rowSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.inkFaint,
    marginTop: 2,
  },
  rowScore: {
    fontFamily: fonts.monoBold,
    fontSize: 18,
    color: colors.ink,
  },
  chevron: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.inkFaint,
    marginLeft: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: colors.inkFaint,
    paddingHorizontal: spacing.lg + spacing.xs,
    marginTop: spacing.xl,
  },
});
