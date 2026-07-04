import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrBadge, RxChip } from '@/components/badges';
import { BenchmarkDef } from '@/data/benchmarks';
import {
  benchmarkByName,
  benchmarkHistory,
  benchmarkStanding,
  bestAttempt,
  formatSeconds,
  Standing,
} from '@/lib/benchmarks';
import { useWorkouts } from '@/lib/data-context';
import { formatDate, parseDate } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

const CHART_H = 150;
/** Right gutter inside the chart where the level-band labels live. */
const BAND_GUTTER = 44;

const CATEGORY_LABEL = { girl: 'GIRL', hero: 'HERO', open: 'THE OPEN', other: 'CLASSIC' } as const;

interface Zone {
  label: string;
  from: number;
  to: number;
}

/** Level bands in score units, bottom-up, clipped to the chart's range. */
function standardZones(def: BenchmarkDef, chartMax: number): Zone[] {
  const s = def.standards;
  if (!s) return [];
  // For time WODs faster (lower) is better, so ELITE hugs the bottom.
  const bounds = def.lowerIsBetter
    ? [0, s.elite, s.advanced, s.intermediate, s.beginner]
    : [s.beginner, s.intermediate, s.advanced, s.elite, chartMax];
  const labels = def.lowerIsBetter
    ? ['ELITE', 'ADV', 'INT', 'BEG']
    : ['BEG', 'INT', 'ADV', 'ELITE'];
  return labels
    .map((label, i) => ({
      label,
      from: Math.min(bounds[i], chartMax),
      to: Math.min(bounds[i + 1], chartMax),
    }))
    .filter((z) => z.to > z.from);
}

function standingCaption(def: BenchmarkDef, standing: Standing): string {
  const fmt = (n: number) => (def.lowerIsBetter ? formatSeconds(n) : `${n} REPS`);
  if (standing.level === 'elite') return 'ELITE';
  const off = `${fmt(standing.gap!)} OFF ${standing.next!.toUpperCase()}`;
  return standing.level ? `${standing.level.toUpperCase()} — ${off}` : off;
}

export default function BenchmarkScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workouts } = useWorkouts();

  const def = name ? benchmarkByName(name) : null;
  const attempts = useMemo(
    () => (name && benchmarkHistory(workouts).get(name)) || [],
    [workouts, name],
  );

  if (!def || attempts.length === 0) {
    return (
      <View style={[styles.screen, styles.missing]}>
        <Text style={styles.missingText}>BENCHMARK NOT FOUND</Text>
      </View>
    );
  }

  const scored = attempts.filter((a) => a.scoreRaw != null);
  const best = bestAttempt(def, attempts);
  const standing = best?.scoreRaw != null ? benchmarkStanding(def, best.scoreRaw) : null;

  const chartMax = Math.max(
    ...scored.map((a) => a.scoreRaw!),
    ...(def.standards ? Object.values(def.standards) : []),
    1,
  );
  const zones = standardZones(def, chartMax);
  const bandH = (z: Zone) => ((z.to - z.from) / chartMax) * CHART_H;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/benchmarks'))}
          hitSlop={12}
          style={styles.backBtn}
          testID="benchmark-back">
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>
        <Text style={styles.topMeta}>
          {CATEGORY_LABEL[def.category]} · {def.lowerIsBetter ? 'FOR TIME' : 'FOR SCORE'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={styles.title}>{def.name.toUpperCase()}</Text>

        {best && (
          <View style={styles.bestCard}>
            <Text style={styles.bestLabel}>★ BEST</Text>
            <Text style={styles.bestValue}>{best.score}</Text>
            <Text style={styles.bestSub}>
              {standing ? standingCaption(def, standing) : formatDate(best.date).toUpperCase()}
            </Text>
          </View>
        )}

        {scored.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ATTEMPTS</Text>
            <View style={styles.card}>
              <View style={styles.chart}>
                {zones.map((z, i) => (
                  <View
                    key={z.label}
                    style={[
                      styles.band,
                      {
                        bottom: (z.from / chartMax) * CHART_H,
                        height: bandH(z),
                        backgroundColor: i % 2 === 0 ? colors.paper : 'transparent',
                      },
                    ]}>
                    {bandH(z) >= 13 && <Text style={styles.bandLabel}>{z.label}</Text>}
                  </View>
                ))}
                <View style={styles.barsRow}>
                  {scored.map((a) => (
                    <View key={a.id} style={styles.barCol}>
                      <Text style={[styles.barScore, a.id === best?.id && styles.goldText]}>
                        {a.score}
                      </Text>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(4, (a.scoreRaw! / chartMax) * (CHART_H - 16)) },
                          a.id === best?.id && styles.barBest,
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.axisRow}>
                {scored.map((a) => {
                  const { year, month } = parseDate(a.date);
                  return (
                    <View key={a.id} style={styles.barCol}>
                      <Text style={styles.axisLabel}>
                        {month}.{String(year).slice(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {zones.length > 0 && (
                <Text style={styles.footnote}>level bands from published community standards</Text>
              )}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>HISTORY</Text>
        <View style={styles.card}>
          {[...attempts].reverse().map((a, i) => (
            <Pressable
              key={a.id}
              onPress={() => router.push(`/workout/${a.id}`)}
              style={({ pressed }) => [
                styles.attemptRow,
                i > 0 && styles.rowDivider,
                pressed && { opacity: 0.7 },
              ]}>
              <View style={styles.attemptInfo}>
                <Text style={styles.attemptDate}>{formatDate(a.date).toUpperCase()}</Text>
                <View style={styles.attemptChips}>
                  <RxChip rx={a.rx} />
                  {a.pr && <PrBadge />}
                </View>
              </View>
              <Text style={[styles.attemptScore, a.id === best?.id && styles.goldText]}>
                {a.score || '—'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
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
  missing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.inkSoft,
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
    marginTop: spacing.sm,
  },
  bestCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  bestLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.gold,
  },
  bestValue: {
    fontFamily: fonts.monoBold,
    fontSize: 56,
    color: colors.paper,
    marginTop: 4,
  },
  bestSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.inkFaint,
    marginTop: 2,
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
    padding: spacing.lg,
  },
  chart: {
    height: CHART_H,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  bandLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    color: colors.inkFaint,
    paddingTop: 2,
    width: BAND_GUTTER,
    textAlign: 'right',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_H,
    gap: spacing.sm,
    paddingRight: BAND_GUTTER,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barScore: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.ink,
    marginBottom: 3,
  },
  bar: {
    // Capped so a single-attempt chart doesn't render one huge slab.
    alignSelf: 'center',
    width: '80%',
    maxWidth: 64,
    backgroundColor: colors.ink,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barBest: {
    backgroundColor: colors.gold,
  },
  goldText: {
    color: colors.gold,
  },
  axisRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: BAND_GUTTER,
    marginTop: 6,
  },
  axisLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  attemptInfo: {
    flex: 1,
  },
  attemptDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkSoft,
  },
  attemptChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  attemptScore: {
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
});
