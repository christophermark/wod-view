import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkouts } from '@/lib/data-context';
import { formatDate, parseDate } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

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
  const insets = useSafeAreaInsets();
  const { stats } = useWorkouts();
  const currentYear = new Date().getFullYear();
  const maxMovement = stats.topMovements[0]?.count ?? 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: spacing.xxl,
      }}>
      <View style={styles.header}>
        <Text style={styles.heading}>STATS</Text>
        <Text style={styles.headerMeta}>LIFETIME</Text>
      </View>

      <View style={styles.tileGrid}>
        <StatTile value={String(stats.total)} label="TOTAL SESSIONS" />
        <StatTile value={String(stats.prCount)} label="PERSONAL RECORDS" accent />
        <StatTile value={`${Math.round(stats.rxRate * 100)}%`} label="RX RATE" />
        <StatTile value={`${stats.longestStreakWeeks}`} label="BEST WEEKLY STREAK" />
      </View>

      <SectionLabel>SESSIONS BY YEAR</SectionLabel>
      <View style={styles.card}>
        <View style={styles.yearChart}>
          {stats.years.map((y) => {
            const h = Math.max(6, (y.count / stats.maxYearCount) * 120);
            const inProgress = y.year === currentYear;
            return (
              <View key={y.year} style={styles.yearCol}>
                <Text style={styles.yearCount}>{y.count}</Text>
                <View
                  style={[styles.yearBar, { height: h }, inProgress && styles.yearBarInProgress]}
                />
                <Text style={styles.yearLabel}>{String(y.year).slice(2)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.footnote}>’{String(currentYear).slice(2)} in progress</Text>
      </View>

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

      <SectionLabel>MOST PROGRAMMED</SectionLabel>
      <View style={styles.card}>
        {stats.topMovements.map((m, i) => (
          <View key={m.name} style={[styles.movementRow, i > 0 && { marginTop: spacing.md }]}>
            <Text style={styles.movementName}>{m.name.toUpperCase()}</Text>
            <View style={styles.movementBarTrack}>
              <View style={[styles.movementBar, { width: `${(m.count / maxMovement) * 100}%` }]} />
            </View>
            <Text style={styles.movementCount}>{m.count}</Text>
          </View>
        ))}
        <Text style={styles.footnote}>times appearing in a workout description</Text>
      </View>

      <SectionLabel>THE LOG</SectionLabel>
      <View style={styles.card}>
        <FactRow label="FIRST SESSION" value={formatDate(stats.firstDate)} />
        <FactRow label="LATEST SESSION" value={formatDate(stats.lastDate)} divider />
        <FactRow label="DAYS TRAINED" value={`${stats.activeDays}`} divider />
        <FactRow
          label="BUSIEST MONTH"
          value={`${stats.busiestMonth.title} · ${stats.busiestMonth.count} sessions`}
          divider
        />
        <FactRow
          label="YEARS ON THE LOG"
          value={`${parseDate(stats.lastDate).year - parseDate(stats.firstDate).year + 1}`}
          divider
        />
      </View>
    </ScrollView>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  yearChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  yearCol: {
    flex: 1,
    alignItems: 'center',
  },
  yearCount: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
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
  yearBarInProgress: {
    backgroundColor: colors.accent,
  },
  yearLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
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
