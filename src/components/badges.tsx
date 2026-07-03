import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/theme';

export function RxChip({ rx }: { rx: boolean }) {
  return (
    <View style={[styles.chip, rx ? styles.rxChip : styles.scaledChip]}>
      <Text style={[styles.chipText, rx ? styles.rxText : styles.scaledText]}>
        {rx ? 'RX' : 'SCALED'}
      </Text>
    </View>
  );
}

export function PrBadge() {
  return (
    <View style={[styles.chip, styles.prChip]}>
      <Text style={[styles.chipText, styles.prText]}>★ PR</Text>
    </View>
  );
}

export function TagChip({ label }: { label: string }) {
  return (
    <View style={[styles.chip, styles.tagChip]}>
      <Text style={[styles.chipText, styles.tagText]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  rxChip: {
    backgroundColor: colors.ink,
  },
  rxText: {
    color: colors.paper,
  },
  scaledChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 2,
  },
  scaledText: {
    color: colors.scaled,
  },
  prChip: {
    backgroundColor: colors.goldSoft,
  },
  prText: {
    color: colors.gold,
  },
  tagChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.inkSoft,
  },
});
