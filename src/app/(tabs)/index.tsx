import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkoutCard } from '@/components/WorkoutCard';
import { useWorkouts } from '@/lib/data-context';
import { groupByMonth, parseDate, Workout } from '@/lib/workouts';
import { colors, fonts, radii, spacing } from '@/theme';

const FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'pr', label: '★ PR' },
  { key: 'rx', label: 'RX' },
  { key: 'scaled', label: 'SCALED' },
  { key: 'time', label: 'FOR TIME' },
  { key: 'reps', label: 'REPS' },
  { key: 'load', label: 'LOAD' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function matchesFilter(w: Workout, filter: FilterKey) {
  switch (filter) {
    case 'all':
      return true;
    case 'pr':
      return w.pr;
    case 'rx':
      return w.rx;
    case 'scaled':
      return !w.rx;
    case 'time':
      return w.scoreType === '' && /^\d+:\d+$/.test(w.score);
    case 'reps':
      return w.scoreType === 'Reps' || w.scoreType === 'Rounds + Reps';
    case 'load':
      return w.scoreType === 'Load';
  }
}

export default function LogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workouts, stats } = useWorkouts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = workouts.filter((w) => {
      if (!matchesFilter(w, filter)) return false;
      if (q.length === 0) return true;
      return (
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.notes.toLowerCase().includes(q)
      );
    });
    return groupByMonth(filtered);
  }, [workouts, query, filter]);

  const resultCount = sections.reduce((n, s) => n + s.data.length, 0);
  const sinceYear = parseDate(stats.firstDate).year;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>WOD VIEW</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerMeta}>
            {stats.total} WODS · SINCE {sinceYear}
          </Text>
          {__DEV__ && (
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <SymbolView name="gearshape.fill" tintColor={colors.inkFaint} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search movements, titles, notes…"
          placeholderTextColor={colors.inkFaint}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>NO WORKOUTS FOUND</Text>
            <Text style={styles.emptyText}>
              {resultCount === 0 && query
                ? `Nothing matches “${query}”.`
                : 'Try a different filter.'}
            </Text>
          </View>
        }
        keyboardDismissMode="on-drag"
      />
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
  wordmark: {
    fontFamily: fonts.displayBlack,
    fontSize: 34,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.ink,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.inkSoft,
  },
  filterTextActive: {
    color: colors.paper,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg + spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.2,
    color: colors.accent,
  },
  sectionCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.inkFaint,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.ink,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 6,
  },
});
