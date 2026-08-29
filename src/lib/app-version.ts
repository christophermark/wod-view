// The shipped version, read from the Expo manifest. `app.json`'s `expo.version`
// is the native source of truth (prebuild stamps it into
// CFBundleShortVersionString / versionName) and `scripts/bump-version.ts` keeps
// package.json in lockstep, so there is exactly one number to display.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type VersionConfig = {
  version?: string | null;
  ios?: { buildNumber?: string | null } | null;
  android?: { versionCode?: number | null } | null;
};

/** `v1.1.1`, or `null` when the manifest carries no version (never in a build). */
export function versionLabel(config: VersionConfig | null | undefined): string | null {
  const version = config?.version?.trim();
  return version ? `v${version}` : null;
}

/** `v1.1.1 (8)` — the build number matters only where users report bugs. */
export function versionBuildLabel(
  config: VersionConfig | null | undefined,
  os: typeof Platform.OS,
): string | null {
  const label = versionLabel(config);
  if (!label) return null;
  const build = os === 'ios' ? config?.ios?.buildNumber : config?.android?.versionCode;
  return build == null || build === '' ? label : `${label} (${build})`;
}

export const APP_VERSION_LABEL = versionLabel(Constants.expoConfig);
export const APP_VERSION_BUILD_LABEL = versionBuildLabel(Constants.expoConfig, Platform.OS);
