import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrBadge, RxChip, TagChip } from '@/components/badges';
import { matchBenchmark } from '@/lib/benchmarks';
import { useWorkouts } from '@/lib/data-context';
import { formatDate, scoreLabel } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workoutById } = useWorkouts();
  const workout = id ? workoutById.get(id) : undefined;
  const benchmark = useMemo(() => (workout ? matchBenchmark(workout) : null), [workout]);

  if (!workout) {
    return (
      <View style={[styles.screen, styles.missing]}>
        <Text style={styles.missingText}>WORKOUT NOT FOUND</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={styles.backBtn}
          testID="workout-back">
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backLabel}>LOG</Text>
        </Pressable>
        <Text style={styles.topDate}>{formatDate(workout.date).toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Text style={styles.title}>{workout.title.toUpperCase()}</Text>

        <View style={styles.chips}>
          <RxChip rx={workout.rx} />
          {workout.pr && <PrBadge />}
          {workout.barbellLift.length > 0 && <TagChip label={workout.barbellLift} />}
          {benchmark && (
            <Pressable
              onPress={() => router.push(`/benchmark/${encodeURIComponent(benchmark.name)}`)}
              hitSlop={6}
              testID="benchmark-chip">
              <TagChip label={`${benchmark.name} ›`} />
            </Pressable>
          )}
        </View>

        {workout.score.length > 0 && (
          <View style={[styles.scoreCard, workout.pr && styles.scoreCardPr]}>
            <Text style={[styles.scoreLabel, workout.pr && { color: colors.gold }]}>
              {workout.pr ? '★ PERSONAL RECORD' : scoreLabel(workout).toUpperCase()}
            </Text>
            <Text style={[styles.scoreValue, workout.pr && { color: colors.gold }]}>
              {workout.score}
            </Text>
            {workout.pr && <Text style={styles.scoreSub}>{scoreLabel(workout).toUpperCase()}</Text>}
          </View>
        )}

        <Text style={styles.sectionLabel}>THE WORKOUT</Text>
        <View style={styles.card}>
          <Text style={styles.description}>{workout.description || '—'}</Text>
        </View>

        {workout.notes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ATHLETE NOTES</Text>
            <View style={[styles.card, styles.notesCard]}>
              <Text style={styles.notes}>{workout.notes}</Text>
            </View>
          </>
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
  topDate: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
  title: {
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: 0.3,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  scoreCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  scoreCardPr: {
    backgroundColor: '#1D1809',
  },
  scoreLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.inkFaint,
  },
  scoreValue: {
    fontFamily: fonts.monoBold,
    fontSize: 56,
    color: colors.paper,
    marginTop: 4,
  },
  scoreSub: {
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
  description: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 26,
    color: colors.ink,
  },
  notesCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  notes: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkSoft,
  },
});
