import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefObject, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useWorkouts } from '@/lib/data-context';
import { liftPages, LiftSession, percentTable } from '@/lib/lifts';
import { formatDate, parseDate } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

const CHART_H = 170;
// Per-session slot width; doubles as the tap target, so keep it well over 24px.
const COL_W = 44;
const PLOT_PAD_TOP = 14;
const PLOT_PAD_BOTTOM = 10;

type MaxSource = 'current' | 'all-time';

/** Clean y-gridline values inside [lo, hi] — loads want 5/25/50 lb steps. */
function yTicks(lo: number, hi: number): number[] {
  const steps = [5, 10, 25, 50, 100, 200, 500];
  const step = steps.find((s) => s >= (hi - lo) / 3) ?? 1000;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return ticks;
}

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

interface LoadChartProps {
  sessions: LiftSession[];
  selected: number;
  onSelect: (i: number) => void;
  scrollRef: RefObject<ScrollView | null>;
}

/**
 * Two-series line chart: top load (solid ink, dotted markers) and estimated
 * 1RM (dashed gold — dashing reads as "estimate", which it is). Sessions with
 * a missed heavier attempt get a hollow accent marker: shape carries the
 * status, not just color (red/gold blur together under deuteranopia).
 */
function LoadChart({ sessions, selected, onSelect, scrollRef }: LoadChartProps) {
  const width = sessions.length * COL_W;
  const values = sessions.flatMap((s) => (s.e1rm != null ? [s.topLoad, s.e1rm] : [s.topLoad]));
  const span = Math.max(...values) - Math.min(...values);
  const pad = Math.max(span * 0.08, 5);
  const lo = Math.min(...values) - pad;
  const hi = Math.max(...values) + pad;
  const plotH = CHART_H - PLOT_PAD_TOP - PLOT_PAD_BOTTOM;
  const y = (v: number) => PLOT_PAD_TOP + (1 - (v - lo) / (hi - lo)) * plotH;
  const x = (i: number) => i * COL_W + COL_W / 2;
  const ticks = yTicks(lo, hi);

  const loadPath = sessions
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(s.topLoad)}`)
    .join(' ');
  // The e1RM line breaks where sessions have no estimate: consecutive
  // non-null runs become separate dashes; an isolated point becomes a dot.
  const e1rmRuns: { start: number; values: number[] }[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const est = sessions[i].e1rm;
    if (est == null) continue;
    const run = e1rmRuns[e1rmRuns.length - 1];
    if (run && run.start + run.values.length === i) run.values.push(est);
    else e1rmRuns.push({ start: i, values: [est] });
  }

  return (
    <View style={styles.chartRow}>
      <View style={styles.yAxis}>
        {ticks.map((t) => (
          <Text key={t} style={[styles.yTickLabel, { top: y(t) - 6 }]}>
            {t}
          </Text>
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Long histories overflow the card; land on the recent end.
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        <View>
          <Svg width={width} height={CHART_H}>
            {ticks.map((t) => (
              <Line
                key={t}
                x1={0}
                y1={y(t)}
                x2={width}
                y2={y(t)}
                stroke={colors.hairline}
                strokeWidth={1}
              />
            ))}
            <Line
              x1={x(selected)}
              y1={PLOT_PAD_TOP - 8}
              x2={x(selected)}
              y2={CHART_H - 2}
              stroke={colors.inkFaint}
              strokeWidth={1}
            />
            {e1rmRuns.map((run) =>
              run.values.length === 1 ? (
                <Circle
                  key={run.start}
                  cx={x(run.start)}
                  cy={y(run.values[0])}
                  r={3}
                  fill={colors.gold}
                  stroke={colors.card}
                  strokeWidth={2}
                />
              ) : (
                <Path
                  key={run.start}
                  d={run.values
                    .map((v, j) => `${j === 0 ? 'M' : 'L'}${x(run.start + j)},${y(v)}`)
                    .join(' ')}
                  stroke={colors.gold}
                  strokeWidth={2}
                  strokeDasharray="5,6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ),
            )}
            <Path
              d={loadPath}
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {sessions.map((s, i) => {
              const missed = missedHeavierAttempt(s);
              return (
                <Circle
                  key={s.workoutId}
                  cx={x(i)}
                  cy={y(s.topLoad)}
                  r={i === selected ? 6 : 4.5}
                  fill={missed ? colors.card : colors.ink}
                  stroke={missed ? colors.accent : colors.card}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
          <View style={styles.axisRow}>
            {sessions.map((s, i) => {
              const { year, month } = parseDate(s.date);
              const yearChanged = i > 0 && parseDate(sessions[i - 1].date).year !== year;
              const show = i === 0 || i === sessions.length - 1 || yearChanged;
              return (
                <Text key={s.workoutId} style={styles.axisLabel}>
                  {show ? `${month}.${String(year).slice(2)}` : ''}
                </Text>
              );
            })}
          </View>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {sessions.map((s, i) => (
              <Pressable
                key={s.workoutId}
                onPress={() => onSelect(i)}
                testID={`lift-chart-slot-${i}`}
                style={{ position: 'absolute', left: i * COL_W, top: 0, width: COL_W, bottom: 0 }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function LiftScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workouts, workoutById } = useWorkouts();
  const [maxSource, setMaxSource] = useState<MaxSource>('current');
  // Selection is keyed by lift name because expo-router reuses the screen
  // across param changes — a stale index must not survive into another lift.
  const [selection, setSelection] = useState<{ lift: string; idx: number } | null>(null);
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

  // Default to the newest session so the readout is never empty.
  const selected =
    selection != null && selection.lift === decodedName && selection.idx < page.sessions.length
      ? selection.idx
      : page.sessions.length - 1;
  const sel = page.sessions[selected];
  const anyMissed = page.sessions.some(missedHeavierAttempt);
  const anyE1rm = page.sessions.some((s) => s.e1rm != null);
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
          <Pressable
            onPress={() => router.push(`/workout/${sel.workoutId}`)}
            style={({ pressed }) => [styles.callout, pressed && { opacity: 0.7 }]}
            testID="lift-chart-callout">
            <View style={styles.calloutHead}>
              <Text style={styles.calloutDate}>{formatDate(sel.date).toUpperCase()}</Text>
              <Text style={styles.calloutLink}>VIEW ›</Text>
            </View>
            <View style={styles.calloutValues}>
              <View style={styles.calloutStat}>
                <Text style={styles.calloutValue}>
                  {sel.topLoad}
                  <Text style={styles.calloutUnit}> LB</Text>
                </Text>
                <Text style={styles.calloutStatLabel}>TOP LOAD</Text>
              </View>
              <View style={styles.calloutStat}>
                <Text style={styles.calloutValue}>
                  {sel.e1rm ?? '—'}
                  {sel.e1rm != null && <Text style={styles.calloutUnit}> LB</Text>}
                </Text>
                <Text style={styles.calloutStatLabel}>EST. 1RM</Text>
              </View>
            </View>
            <Text style={styles.calloutSets}>
              {formatSets(sel).map((set, j) => (
                <Text key={j}>
                  {j > 0 ? ' · ' : ''}
                  {set.text}{' '}
                  <Text style={!set.success && styles.crossText}>{set.success ? '✓' : '✗'}</Text>
                </Text>
              ))}
            </Text>
          </Pressable>
          <LoadChart
            sessions={page.sessions}
            selected={selected}
            onSelect={(idx) => setSelection({ lift: decodedName, idx })}
            scrollRef={chartRef}
          />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.keyLineSolid} />
              <Text style={styles.legendLabel}>TOP LOAD</Text>
            </View>
            {anyE1rm && (
              <View style={styles.legendItem}>
                <View style={styles.keyDashRow}>
                  <View style={styles.keyDash} />
                  <View style={styles.keyDash} />
                  <View style={styles.keyDash} />
                </View>
                <Text style={styles.legendLabel}>EST. 1RM</Text>
              </View>
            )}
            {anyMissed && (
              <View style={styles.legendItem}>
                <View style={styles.keyDotHollow} />
                <Text style={styles.legendLabel}>MISSED ATTEMPT</Text>
              </View>
            )}
          </View>
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
  callout: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    marginBottom: spacing.md,
  },
  calloutHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calloutDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkSoft,
  },
  calloutLink: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.accent,
  },
  calloutValues: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginTop: spacing.sm,
  },
  calloutStat: {},
  calloutValue: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    color: colors.ink,
  },
  calloutUnit: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  calloutStatLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.inkFaint,
    marginTop: 1,
  },
  calloutSets: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  chartRow: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 34,
    height: CHART_H,
  },
  yTickLabel: {
    position: 'absolute',
    left: 0,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
  },
  axisRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  axisLabel: {
    width: COL_W,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.inkSoft,
  },
  keyLineSolid: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
  },
  keyDashRow: {
    flexDirection: 'row',
    gap: 3,
  },
  keyDash: {
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gold,
  },
  keyDotHollow: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.card,
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
