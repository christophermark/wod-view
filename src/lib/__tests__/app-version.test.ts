import { versionBuildLabel, versionLabel } from '../app-version';

describe('versionLabel', () => {
  it('prefixes the manifest version with v', () => {
    expect(versionLabel({ version: '1.1.1' })).toBe('v1.1.1');
  });

  it('returns null when the manifest carries no version', () => {
    expect(versionLabel(null)).toBeNull();
    expect(versionLabel({})).toBeNull();
    expect(versionLabel({ version: '  ' })).toBeNull();
  });
});

describe('versionBuildLabel', () => {
  it('appends the iOS build number', () => {
    expect(versionBuildLabel({ version: '1.1.1', ios: { buildNumber: '2' } }, 'ios')).toBe(
      'v1.1.1 (2)',
    );
  });

  it('appends the Android version code', () => {
    expect(versionBuildLabel({ version: '1.1.1', android: { versionCode: 8 } }, 'android')).toBe(
      'v1.1.1 (8)',
    );
  });

  // Each platform reads only its own build field, so an iOS-only manifest must
  // not show the Android code (and vice versa).
  it('falls back to the bare version when this platform has no build number', () => {
    expect(versionBuildLabel({ version: '1.1.1', android: { versionCode: 8 } }, 'ios')).toBe(
      'v1.1.1',
    );
  });
});
