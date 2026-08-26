// Guards the system file picker's filter — the one thing standing between a
// user and their export. A filter that is merely *plausible* silently breaks
// Android: the picker opens, workouts.csv is right there, and it can't be
// tapped. These tests encode each platform's real matching rule so a future
// tidy-up of the MIME list can't quietly reintroduce that dead end.

import { importMimeTypes } from '../data-context';

/**
 * Android's Storage Access Framework filter rule: a document is selectable
 * when the MIME type its provider *declares* matches an entry exactly, or
 * matches a `type/*` wildcard. There is no fallback to the file extension.
 */
function androidAccepts(filter: string[], declaredMimeType: string): boolean {
  return filter.some(
    (entry) =>
      entry === '*/*' ||
      entry === declaredMimeType ||
      (entry.endsWith('/*') && declaredMimeType.startsWith(entry.slice(0, -1))),
  );
}

// Every MIME type a workouts.csv has been observed to arrive declared as,
// depending on where the user saved the emailed attachment.
const CSV_MIME_TYPES_IN_THE_WILD = [
  'text/csv', // the correct type; some providers do get it right
  'text/comma-separated-values', // older/alternate registration
  'text/plain', // extension-derived by some file managers
  'application/csv', // seen from a few third-party providers
  'application/octet-stream', // Google Drive rewrites uploaded CSVs to this
  'application/vnd.ms-excel', // Windows-origin CSVs, and some mail clients
];

describe('import picker filter', () => {
  it('lets Android select a workouts.csv however its provider declares it', () => {
    const filter = importMimeTypes('android');
    for (const declared of CSV_MIME_TYPES_IN_THE_WILD) {
      expect({ declared, selectable: androidAccepts(filter, declared) }).toEqual({
        declared,
        selectable: true,
      });
    }
  });

  it('keeps the iOS picker filtered to text types', () => {
    // iOS resolves UTIs from the file extension, so naming the CSV types is
    // safe there and keeps the picker from listing photos and videos.
    const filter = importMimeTypes('ios');
    expect(filter).toContain('text/csv');
    expect(filter).not.toContain('*/*');
  });
});
