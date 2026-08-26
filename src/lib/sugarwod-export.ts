export const SUGARWOD_EXPORT_HELP_URL =
  'https://daxkoneworg.my.site.com/ZenPlanner/s/article/SUGARWOD-How-can-I-export-my-workout-data-from-SugarWOD';

/** Name of the CSV attachment SugarWOD emails — the file users must pick. */
export const SUGARWOD_EXPORT_FILENAME = 'workouts.csv';

/**
 * How-to-export steps, in the numbered order the import screens show them.
 *
 * Step 3 tells the user where to put the attachment so the system file picker
 * can see it, and that place is named differently on each platform — this
 * module stays free of react-native imports, so the caller supplies the name.
 */
export function sugarwodExportSteps(saveDestination: string): string[] {
  return [
    'In the SugarWOD app, open your account settings and choose to export your workout data.',
    `SugarWOD emails a file named ${SUGARWOD_EXPORT_FILENAME} to your account email.`,
    `Open that email on this phone and save ${SUGARWOD_EXPORT_FILENAME} to ${saveDestination}.`,
    `Tap “Import ${SUGARWOD_EXPORT_FILENAME}…” below and pick the file you just saved.`,
  ];
}
