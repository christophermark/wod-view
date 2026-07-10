import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkouts } from '@/lib/data-context';
import { liftPages, LiftSession, percentTable } from '@/lib/lifts';
import { formatDate, parseDate } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

const CHART_H = 150;
const BAR_COL_W = 34;

type MaxSource = 'current' | 'all-time';

/** A missed attempt heavier than the session's recorded top load is the
 * information worth surfacing — a clean single at 225 after a missed 235
 * tells a different story than a clean single at 225. */
function missedHeavierAttempt(session: LiftSession): boolean {
  if (session.sets.length === 0) return false;
  if (session.sets.every((s) => !s.success)) return true;
  return session.sets.some((s) => !s.success && s.load > session.topLoad);
}

function formatSets(session: LiftSession) {
  return session.sets.map((s) => ({
    text: s.reps != null ? `${s.reps}×${s.load}` : `${s.load}`,
    success: s.success,
  }));
}

export default function LiftScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workouts, workoutById } = useWorkouts();
  const [maxSource, setMaxSource] = useState<MaxSource>('current');
  const chartRef = useRef<ScrollView>(null);

  const pages = useMemo(() => liftPages(workouts), [workouts]);
  const decodedName = name ? decodeURIComponent(name) : '';
  const page = pages.find((p) => p.lift === decodedName) ?? null;

  if (!page) {
    return (
      <View style={[styles.screen, styles.missing]}>
        <Text style={styles.missingText}>LIFT NOT FOUND</Text>
      </View>
    );
  }

  const maxTopLoad = Math.max(...page.sessions.map((s) => s.topLoad), 1);
  // currentMax is 0 when the lift hasn't been trained in the trailing 6
  // months; allTimeMax is 0 only in the degenerate case where every recorded
  // set was a miss. Neither is a max worth showing as a hero number.
  const hasCurrentMax = page.currentMax > 0;
  const hasAnyMax = page.allTimeMax > 0;
  const atPeak = hasCurrentMax && page.currentMax === page.allTimeMax;
  const pctBase = hasCurrentMax && maxSource === 'current' ? page.currentMax : page.allTimeMax;
  const table = percentTable(pctBase);
  const newestFirst = [...page.sessions].reverse();

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/stats'))}
          hitSlop={12}
          style={styles.backBtn}
          testID="lift-back">
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>BACK</Text>
        </Pressable>
        <Text style={styles.topMeta}>LIFT</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={styles.title}>{page.lift.toUpperCase()}</Text>

        {hasAnyMax && (
          <View style={styles.bestCard}>
            {hasCurrentMax ? (
              <>
                <Text style={styles.bestLabel}>CURRENT MAX</Text>
                <Text style={styles.bestValue}>
                  {page.currentMax}
                  <Text style={styles.bestUnit}> LB</Text>
                </Text>
                <Text style={styles.bestSub}>
                  ALL-TIME MAX {page.allTimeMax} LB ·{' '}
                  {formatDate(page.allTimeMaxDate).toUpperCase()}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.bestLabel}>ALL-TIME MAX</Text>
                <Text style={styles.bestValue}>
                  {page.allTimeMax}
                  <Text style={styles.bestUnit}> LB</Text>
                </Text>
                <Text style={styles.bestSub}>{formatDate(page.allTimeMaxDate).toUpperCase()}</Text>
              </>
            )}
            {atPeak && <Text style={styles.peakText}>AT ALL-TIME PEAK</Text>}
            {page.missCount > 0 && (
              <Text style={styles.missText}>
                {page.missCount} MISSED {page.missCount === 1 ? 'ATTEMPT' : 'ATTEMPTS'}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>LOAD OVER TIME</Text>
        <View style={styles.card}>
          <ScrollView
            ref={chartRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            // Long histories overflow the card; land on the recent end.
            onContentSizeChange={() => chartRef.current?.scrollToEnd({ animated: false })}>
            <View>
              <View style={styles.barsRow}>
                {page.sessions.map((s) => {
                  const missed = missedHeavierAttempt(s);
                  return (
                    <View key={s.workoutId} style={styles.barCol}>
                      {s.e1rm != null && (
                        <Text style={styles.e1rmLabel}>e{Math.round(s.e1rm)}</Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(4, (s.topLoad / maxTopLoad) * (CHART_H - 20)) },
                          missed && styles.barMissed,
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
              <View style={styles.axisRow}>
                {page.sessions.map((s, i) => {
                  const { year, month } = parseDate(s.date);
                  const isFirst = i === 0;
                  const isLast = i === page.sessions.length - 1;
                  const yearChanged = i > 0 && parseDate(page.sessions[i - 1].date).year !== year;
                  const show = isFirst || isLast || yearChanged;
                  return (
                    <View key={s.workoutId} style={styles.barCol}>
                      <Text style={styles.axisLabel}>
                        {show ? `${month}.${String(year).slice(2)}` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        {hasAnyMax && (
          <>
            <Text style={styles.sectionLabel}>PERCENTAGES</Text>
            <View style={styles.card}>
              {hasCurrentMax && (
                <View style={styles.segment}>
                  {(['current', 'all-time'] as const).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setMaxSource(m)}
                      style={[styles.segmentBtn, maxSource === m && styles.segmentBtnActive]}>
                      <Text
                        style={[styles.segmentText, maxSource === m && styles.segmentTextActive]}>
                        {m === 'current' ? 'CURRENT' : 'ALL-TIME'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {table.map((row, i) => (
                <View key={row.pct} style={[styles.pctRow, i > 0 && styles.rowDivider]}>
                  <Text style={styles.pctLabel}>{row.pct}%</Text>
                  <Text style={styles.pctValue}>
                    {row.load}
                    <Text style={styles.pctUnit}> LB</Text>
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>SESSIONS</Text>
        <View style={styles.card}>
          {newestFirst.map((s, i) => {
            const note = workoutById.get(s.workoutId)?.notes ?? '';
            return (
              <Pressable
                key={s.workoutId}
                onPress={() => router.push(`/workout/${s.workoutId}`)}
                style={({ pressed }) => [
                  styles.sessionRow,
                  i > 0 && styles.rowDivider,
                  pressed && { opacity: 0.7 },
                ]}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionDate}>{formatDate(s.date).toUpperCase()}</Text>
                  <Text style={styles.sessionSets}>
                    {formatSets(s).map((set, j) => (
                      <Text key={j}>
                        {j > 0 ? ' · ' : ''}
                        {set.text}{' '}
                        <Text style={!set.success && styles.crossText}>
                          {set.success ? '✓' : '✗'}
                        </Text>
                      </Text>
                    ))}
                  </Text>
                  {note !== '' && (
                    <Text style={styles.sessionNote} numberOfLines={1}>
                      {note}
                    </Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
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
  bestUnit: {
    fontSize: 16,
    color: colors.inkFaint,
  },
  bestSub: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.inkFaint,
    marginTop: 2,
  },
  peakText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.gold,
    marginTop: spacing.sm,
  },
  missText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.inkFaint,
    marginTop: 4,
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
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_H,
    gap: spacing.sm,
  },
  barCol: {
    width: BAR_COL_W,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  e1rmLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.inkFaint,
    marginBottom: 3,
  },
  bar: {
    width: 20,
    backgroundColor: colors.ink,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barMissed: {
    backgroundColor: colors.accent,
  },
  axisRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 6,
  },
  axisLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.paper,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  segmentBtnActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.inkSoft,
  },
  segmentTextActive: {
    color: colors.paper,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pctLabel: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.inkSoft,
  },
  pctValue: {
    fontFamily: fonts.monoBold,
    fontSize: 15,
    color: colors.ink,
  },
  pctUnit: {
    fontSize: 10,
    color: colors.inkFaint,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkSoft,
  },
  sessionSets: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.ink,
    marginTop: 4,
  },
  crossText: {
    color: colors.accent,
  },
  sessionNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 3,
  },
  chevron: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.inkFaint,
    marginLeft: spacing.sm,
  },
});
