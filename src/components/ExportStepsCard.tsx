import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, StyleProp, Text, View, ViewStyle } from 'react-native';

import {
  SUGARWOD_EXPORT_FILENAME,
  SUGARWOD_EXPORT_HELP_URL,
  SUGARWOD_EXPORT_STEPS,
} from '@/lib/sugarwod-export';
import { colors, fonts, radii, spacing } from '@/theme';

/**
 * Numbered how-to-export steps plus an attachment-style chip that shows users
 * exactly which file to hunt for in the picker. Shared by onboarding and
 * settings.
 */
export function ExportStepsCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      {SUGARWOD_EXPORT_STEPS.map((step, i) => (
        <View key={i} style={[styles.stepRow, i > 0 && { marginTop: spacing.lg }]}>
          <Text style={styles.stepNumber}>{i + 1}</Text>
          <Text style={styles.stepText}>{highlightFilename(step)}</Text>
        </View>
      ))}

      <View style={styles.attachment}>
        <View style={styles.attachmentIcon}>
          <Text style={styles.attachmentIconText}>CSV</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.attachmentName}>{SUGARWOD_EXPORT_FILENAME}</Text>
          <Text style={styles.attachmentHint}>The attachment in SugarWOD’s email — pick this.</Text>
        </View>
      </View>

      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(SUGARWOD_EXPORT_HELP_URL)}
        hitSlop={8}
        style={styles.helpLink}>
        <Text style={styles.helpLinkText}>VIEW SUGARWOD HELP DOC ›</Text>
      </Pressable>
    </View>
  );
}

/** Renders step text with every occurrence of the export filename set in mono. */
function highlightFilename(text: string) {
  return text.split(SUGARWOD_EXPORT_FILENAME).map((part, i) => (
    <Text key={i}>
      {i > 0 && <Text style={styles.filenameInline}>{SUGARWOD_EXPORT_FILENAME}</Text>}
      {part}
    </Text>
  ));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepNumber: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.accent,
    width: 14,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  filenameInline: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.ink,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
  },
  attachmentIcon: {
    width: 38,
    height: 44,
    borderRadius: radii.sm,
    borderTopRightRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentIconText: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.paper,
  },
  attachmentName: {
    fontFamily: fonts.monoBold,
    fontSize: 15,
    color: colors.ink,
  },
  attachmentHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
    marginTop: 2,
  },
  helpLink: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  helpLinkText: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.accent,
  },
});
