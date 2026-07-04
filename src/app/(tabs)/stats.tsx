import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { benchmarkHistory, retestRadar, todayIso } from '@/lib/benchmarks';
import { useWorkouts } from '@/lib/data-context';
import { computeStats, formatDate, monthName, parseDate, sessionsByMonth } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function StatTile({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, accent && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workouts, stats: lifetimeStats } = useWorkouts();
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();

  // Benchmarks are lifetime facts, so the year filter doesn't apply to them.
  const benchmarks = useMemo(() => {
    const history = benchmarkHistory(workouts);
    return { tracked: history.size, radar: retestRadar(workouts, todayIso(now)).slice(0, 3) };
  }, [workouts, now]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [movementMode, setMovementMode] = useState<'most' | 'least'>('most');

  // The selected year can disappear when the data source changes.
  const year =
    selectedYear != null && lifetimeStats.years.some((y) => y.year === selectedYear)
      ? selectedYear
      : null;

  const stats = useMemo(
    () =>
      year == null
        ? lifetimeStats
        : computeStats(workouts.filter((w) => parseDate(w.date).year === year)),
    [workouts, lifetimeStats, year],
  );

  const monthCounts = useMemo(
    () => (year == null ? null : sessionsByMonth(workouts, year)),
    [workouts, year],
  );
  const maxMonthCount = monthCounts ? Math.max(...monthCounts, 1) : 1;

  const movements = useMemo(() => {
    const counts = stats.movementCounts;
    return movementMode === 'most'
      ? counts.filter((m) => m.count > 0).slice(0, 10)
      : [...counts].sort((a, b) => a.count - b.count).slice(0, 10);
  }, [stats, movementMode]);
  const maxMovement = Math.max(...movements.map((m) => m.count), 1);

  const weeksElapsed =
    year === currentYear
      ? Math.max(
          1,
          (now.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 3600 * 1000),
        )
      : 52;
  const wodsPerWeek = year == null ? null : (stats.total / weeksElapsed).toFixed(1);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing.xxl,
      }}>
      <View style={styles.header}>
        <Text style={styles.heading}>STATS</Text>
        <Text style={styles.headerMeta}>{year == null ? 'LIFETIME' : String(year)}</Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          <YearChip label="ALL" active={year == null} onPress={() => setSelectedYear(null)} />
          {[...lifetimeStats.years].reverse().map((y) => (
            <YearChip
              key={y.year}
              label={`’${String(y.year).slice(2)}`}
              active={year === y.year}
              onPress={() => setSelectedYear(y.year)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.tileGrid}>
        <StatTile value={String(stats.total)} label="TOTAL WODS" />
        <StatTile value={String(stats.prCount)} label="PERSONAL RECORDS" accent />
        <StatTile value={`${Math.round(stats.rxRate * 100)}%`} label="RX RATE" />
        <StatTile value={`${stats.longestStreakWeeks}`} label="BEST WEEKLY STREAK" />
      </View>

      {year == null ? (
        <>
          <SectionLabel>WODS BY YEAR</SectionLabel>
          <View style={styles.card}>
            <View style={styles.barChart}>
              {stats.years.map((y) => {
                const h = Math.max(6, (y.count / stats.maxYearCount) * 120);
                const inProgress = y.year === currentYear;
                return (
                  <View key={y.year} style={styles.barCol}>
                    <Text style={styles.barCount}>{y.count}</Text>
                    <View
                      style={[styles.yearBar, { height: h }, inProgress && styles.barInProgress]}
                    />
                    <Text style={styles.barLabel}>{String(y.year).slice(2)}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.footnote}>’{String(currentYear).slice(2)} in progress</Text>
          </View>
        </>
      ) : (
        <>
          <SectionLabel>WODS BY MONTH</SectionLabel>
          <View style={styles.card}>
            <View style={styles.barChart}>
              {monthCounts!.map((count, i) => {
                const isCurrentMonth = year === currentYear && i === now.getMonth();
                return (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barCount}>{count > 0 ? count : ''}</Text>
                    <View
                      style={[
                        styles.monthBar,
                        { height: Math.max(3, (count / maxMonthCount) * 120) },
                        count === 0 && styles.barEmpty,
                        isCurrentMonth && styles.barInProgress,
                      ]}
                    />
                    <Text style={styles.barLabel}>{MONTH_INITIALS[i]}</Text>
                  </View>
                );
              })}
            </View>
            {year === currentYear && (
              <Text style={styles.footnote}>
                through {monthName(now.getMonth() + 1)} {now.getDate()}
              </Text>
            )}
          </View>
        </>
      )}

      {stats.liftBests.length > 0 && (
        <>
          <SectionLabel>LIFT BESTS</SectionLabel>
          <View style={styles.card}>
            {stats.liftBests.map((l, i) => (
              <View key={l.lift} style={[styles.liftRow, i > 0 && styles.rowDivider]}>
                <View style={styles.liftInfo}>
                  <Text style={styles.liftName}>{l.lift.toUpperCase()}</Text>
                  <Text style={styles.liftDate}>{formatDate(l.date).toUpperCase()}</Text>
                </View>
                <Text style={styles.liftBest}>
                  {l.best}
                  <Text style={styles.liftUnit}> LB</Text>
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {year == null && benchmarks.tracked > 0 && (
        <>
          <SectionLabel>BENCHMARKS</SectionLabel>
          <View style={styles.card}>
            <Pressable
              onPress={() => router.push('/benchmarks')}
              style={({ pressed }) => [styles.benchRow, pressed && { opacity: 0.7 }]}
              testID="benchmarks-link">
              <Text style={styles.benchTitle}>{benchmarks.tracked} TRACKED</Text>
              <Text style={styles.benchLink}>VIEW ALL ›</Text>
            </Pressable>
            {benchmarks.radar.length > 0 && (
              <View style={styles.radarBlock}>
                <Text style={styles.radarLabel}>RETEST RADAR</Text>
                {benchmarks.radar.map((r) => (
                  <Pressable
                    key={r.def.name}
                    onPress={() => router.push(`/benchmark/${encodeURIComponent(r.def.name)}`)}
                    style={({ pressed }) => [styles.radarRow, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.radarName}>{r.def.name.toUpperCase()}</Text>
                    <Text style={styles.radarDays}>{r.daysSince} DAYS AGO</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      <View style={styles.sectionRow}>
        <SectionLabel>
          {movementMode === 'most' ? 'MOST PROGRAMMED' : 'LEAST PROGRAMMED'}
        </SectionLabel>
        <View style={styles.segment}>
          {(['most', 'least'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setMovementMode(mode)}
              style={[styles.segmentBtn, movementMode === mode && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, movementMode === mode && styles.segmentTextActive]}>
                {mode.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.card}>
        {movements.map((m, i) => (
          <View key={m.name} style={[styles.movementRow, i > 0 && { marginTop: spacing.md }]}>
            <Text style={styles.movementName}>{m.name.toUpperCase()}</Text>
            <View style={styles.movementBarTrack}>
              <View style={[styles.movementBar, { width: `${(m.count / maxMovement) * 100}%` }]} />
            </View>
            <Text style={styles.movementCount}>{m.count}</Text>
          </View>
        ))}
        <Text style={styles.footnote}>
          {movementMode === 'most'
            ? 'times appearing in a workout description'
            : 'rarest of the movements the app can detect'}
        </Text>
      </View>

      <SectionLabel>THE LOG</SectionLabel>
      <View style={styles.card}>
        <FactRow label="FIRST WOD" value={formatDate(stats.firstDate)} />
        <FactRow label="LATEST WOD" value={formatDate(stats.lastDate)} divider />
        <FactRow label="DAYS TRAINED" value={`${stats.activeDays}`} divider />
        <FactRow
          label="BUSIEST MONTH"
          value={`${stats.busiestMonth.title} · ${stats.busiestMonth.count} WODs`}
          divider
        />
        {year == null ? (
          <FactRow
            label="YEARS ON THE LOG"
            value={`${parseDate(stats.lastDate).year - parseDate(stats.firstDate).year + 1}`}
            divider
          />
        ) : (
          <FactRow label="AVG WODS / WEEK" value={wodsPerWeek ?? '—'} divider />
        )}
      </View>
    </ScrollView>
  );
}

function YearChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.yearChip, active && styles.yearChipActive]}>
      <Text style={[styles.yearChipText, active && styles.yearChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FactRow({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.factRow, divider && styles.rowDivider]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heading: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  headerMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  yearChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  yearChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  yearChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.inkSoft,
  },
  yearChipTextActive: {
    color: colors.paper,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tileValue: {
    fontFamily: fonts.displayBlack,
    fontSize: 40,
    color: colors.ink,
  },
  tileLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: spacing.lg,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    overflow: 'hidden',
    marginBottom: spacing.sm,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barCount: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: colors.ink,
    marginBottom: 4,
  },
  yearBar: {
    alignSelf: 'stretch',
    marginHorizontal: 6,
    backgroundColor: colors.ink,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  monthBar: {
    alignSelf: 'stretch',
    marginHorizontal: 2,
    backgroundColor: colors.ink,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barEmpty: {
    backgroundColor: colors.hairline,
  },
  barInProgress: {
    backgroundColor: colors.accent,
  },
  barLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 6,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  liftInfo: {
    flex: 1,
  },
  liftName: {
    fontFamily: fonts.display,
    fontSize: 17,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  liftDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 2,
  },
  liftBest: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    color: colors.ink,
  },
  liftUnit: {
    fontSize: 11,
    color: colors.inkFaint,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementName: {
    width: 118,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.inkSoft,
  },
  movementBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  movementBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  movementCount: {
    width: 36,
    textAlign: 'right',
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.ink,
  },
  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  benchTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  benchLink: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.accent,
  },
  radarBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  radarLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
    marginBottom: spacing.xs,
  },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  radarName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.4,
    color: colors.ink,
  },
  radarDays: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.accent,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  factLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  factValue: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink,
  },
});
