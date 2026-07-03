import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkoutCard } from '@/components/WorkoutCard';
import { formatDate, monthName, parseDate, workouts, workoutsByDate } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthKey(year: number, month: number) {
  return year * 12 + (month - 1);
}

function isoFor(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const latest = parseDate(workouts[0].date);
  const earliest = parseDate(workouts[workouts.length - 1].date);
  const today = new Date();

  const [cursor, setCursor] = useState({ year: latest.year, month: latest.month });
  const [selected, setSelected] = useState<string>(workouts[0].date);

  const minKey = monthKey(earliest.year, earliest.month);
  const maxKey = monthKey(today.getFullYear(), today.getMonth() + 1);
  const cursorKey = monthKey(cursor.year, cursor.month);

  const shiftMonth = (delta: number) => {
    const next = cursorKey + delta;
    if (next < minKey || next > maxKey) return;
    setCursor({ year: Math.floor(next / 12), month: (next % 12) + 1 });
  };

  const grid = useMemo(() => {
    const firstDow = new Date(cursor.year, cursor.month - 1, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month, 0).getDate();
    const cells: ({ day: number; iso: string } | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, iso: isoFor(cursor.year, cursor.month, d) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const monthCount = grid.reduce(
    (n, cell) => n + (cell ? (workoutsByDate.get(cell.iso)?.length ?? 0) : 0),
    0,
  );
  const todayIso = isoFor(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const selectedWorkouts = workoutsByDate.get(selected) ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>CALENDAR</Text>
        <Text style={styles.headerMeta}>{monthCount} THIS MONTH</Text>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => shiftMonth(-1)}
            disabled={cursorKey <= minKey}
            style={styles.navBtn}
            hitSlop={8}>
            <Text style={[styles.navArrow, cursorKey <= minKey && styles.navArrowDisabled]}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {monthName(cursor.month).toUpperCase()} {cursor.year}
          </Text>
          <Pressable
            onPress={() => shiftMonth(1)}
            disabled={cursorKey >= maxKey}
            style={styles.navBtn}
            hitSlop={8}>
            <Text style={[styles.navArrow, cursorKey >= maxKey && styles.navArrowDisabled]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((cell, i) => {
            if (!cell) return <View key={i} style={styles.cell} />;
            const dayWorkouts = workoutsByDate.get(cell.iso);
            const hasPr = dayWorkouts?.some((w) => w.pr) ?? false;
            const isSelected = selected === cell.iso;
            const isToday = todayIso === cell.iso;
            return (
              <Pressable key={i} style={styles.cell} onPress={() => setSelected(cell.iso)}>
                <View
                  style={[
                    styles.dayDot,
                    dayWorkouts && styles.dayTrained,
                    hasPr && styles.dayPr,
                    isSelected && styles.daySelected,
                    isToday && !dayWorkouts && styles.dayToday,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      dayWorkouts && styles.dayTextTrained,
                      !dayWorkouts && styles.dayTextRest,
                    ]}>
                    {cell.day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.ink }]} />
            <Text style={styles.legendText}>TRAINED</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.gold }]} />
            <Text style={styles.legendText}>PR DAY</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.dayList} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Text style={styles.selectedDate}>{formatDate(selected).toUpperCase()}</Text>
        {selectedWorkouts.length > 0 ? (
          selectedWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} />)
        ) : (
          <View style={styles.restCard}>
            <Text style={styles.restTitle}>REST DAY</Text>
            <Text style={styles.restText}>Nothing logged. Recovery counts too.</Text>
          </View>
        )}
      </ScrollView>
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
  calendarCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    alignItems: 'center',
  },
  navArrow: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 28,
    color: colors.accent,
  },
  navArrowDisabled: {
    color: colors.hairline,
  },
  monthTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1.2,
    color: colors.ink,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.inkFaint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTrained: {
    backgroundColor: colors.ink,
  },
  dayPr: {
    backgroundColor: colors.gold,
  },
  daySelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.inkFaint,
  },
  dayText: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.ink,
  },
  dayTextTrained: {
    color: colors.card,
  },
  dayTextRest: {
    color: colors.inkFaint,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.inkFaint,
  },
  dayList: {
    flex: 1,
    marginTop: spacing.lg,
  },
  selectedDate: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1.2,
    color: colors.accent,
    paddingHorizontal: spacing.lg + spacing.xs,
    marginBottom: spacing.sm,
  },
  restCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
  },
  restTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  restText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 4,
  },
});
