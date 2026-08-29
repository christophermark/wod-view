import { StyleSheet, Text } from 'react-native';

import { APP_VERSION_LABEL } from '@/lib/app-version';
import { colors, fonts } from '@/theme';

/**
 * The app version, sat next to the settings gear in every tab header so it is
 * always one glance away when someone reports a bug.
 */
export function VersionTag() {
  if (!APP_VERSION_LABEL) return null;
  return (
    <Text style={styles.version} testID="app-version">
      {APP_VERSION_LABEL}
    </Text>
  );
}

const styles = StyleSheet.create({
  version: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.inkFaint,
  },
});
