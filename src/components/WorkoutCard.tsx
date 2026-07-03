import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrBadge, RxChip } from '@/components/badges';
import { dayOfWeek, parseDate, scoreLabel, Workout } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

export function WorkoutCard({ workout }: { workout: Workout }) {
  const router = useRouter();
  const { day } = parseDate(workout.date);
  const preview = workout.description.split('\n').slice(0, 3).join('  ·  ');

  return (
    <Pressable
      onPress={() => router.push(`/workout/${workout.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.rail}>
        <Text style={styles.railDow}>{dayOfWeek(workout.date).toUpperCase()}</Text>
        <Text style={styles.railDay}>{day}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {workout.title.toUpperCase()}
        </Text>
        <View style={styles.chips}>
          <RxChip rx={workout.rx} />
          {workout.pr && <PrBadge />}
        </View>
        {preview.length > 0 && (
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
        )}
        {workout.score.length > 0 && (
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{scoreLabel(workout).toUpperCase()}</Text>
            <Text style={styles.score} numberOfLines={1}>
              {workout.score}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  rail: {
    width: 44,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.hairline,
    marginRight: spacing.lg,
    paddingRight: spacing.md,
    paddingTop: 2,
  },
  railDow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  railDay: {
    fontFamily: fonts.displayBlack,
    fontSize: 26,
    color: colors.ink,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 0.4,
    color: colors.ink,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  scoreLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  score: {
    fontFamily: fonts.monoBold,
    fontSize: 17,
    color: colors.ink,
  },
});
